from hashlib import sha256
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

from service.auth.jwt_service import JwtService
from service.user.user import User
from service.user.user_repository import UserRepository


class AuthService:
    def __init__(self) -> None:
        self.user_repository = UserRepository()
        self.jwt_service = JwtService()
        self.password_reset_ttl_minutes = 30
        self.smtp_host = os.getenv("SMTP_HOST")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_sender = os.getenv("SMTP_SENDER", self.smtp_user or "no-reply@learnix.local")
        self.frontend_reset_url = os.getenv("FRONTEND_RESET_URL", "http://localhost:3000/reset-password")
        self._ensure_default_user()

    @staticmethod
    def _hash_password(password: str) -> str:
        return sha256(password.encode("utf-8")).hexdigest()

    def _ensure_default_user(self) -> None:
        default_user = self.user_repository.get_user_by_login("admin")
        if default_user is None:
            created = self.user_repository.create_user("admin", "admin@learnix.local", self._hash_password("password"))
            self.user_repository.update_interests(created.user_id, ["математика", "алгебра", "геометрия"])

    def register(self, login: str, email: str, password: str) -> Optional[User]:
        if self.user_repository.get_user_by_login(login) or self.user_repository.get_user_by_email(email):
            return None

        return self.user_repository.create_user(
            user_name=login,
            email=email,
            password_hash=self._hash_password(password),
        )

    def authenticate(self, login: str, password: str) -> Optional[User]:
        user = self.user_repository.get_user_by_login(login)
        if user is None:
            return None

        if user.password_hash != self._hash_password(password):
            return None

        return user

    def login_with_jwt(self, login: str, password: str) -> Optional[dict]:
        user = self.authenticate(login, password)
        if user is None:
            return None

        token = self.jwt_service.create_token(user.user_id, user.user_name)
        self.user_repository.save_current_jwt(user.user_id, token)
        return {"user": user, "token": token}

    def get_user_by_valid_token(self, token: str) -> Optional[User]:
        payload = self.jwt_service.validate_token(token)
        if payload is None:
            return None

        user_id = int(payload["sub"])
        return self.user_repository.get_user_by_id(user_id)

    def _send_password_reset_email(self, target_email: str, reset_token: str) -> bool:
        if not self.smtp_host:
            return False

        reset_link = f"{self.frontend_reset_url}?token={reset_token}"
        message = EmailMessage()
        message["Subject"] = "Learnix password reset"
        message["From"] = self.smtp_sender
        message["To"] = target_email
        message.set_content(
            (
                "We received a request to reset your Learnix password.\n\n"
                f"Use this link to continue: {reset_link}\n"
                f"Token is valid for {self.password_reset_ttl_minutes} minutes.\n\n"
                "If you did not request this, just ignore this message."
            )
        )

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)
            return True
        except Exception:
            return False

    def request_password_reset(self, email: str) -> bool:
        user = self.user_repository.get_user_by_email(email)
        if user is None:
            return True

        reset_token = token_urlsafe(32)
        token_hash = self._hash_password(reset_token)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=self.password_reset_ttl_minutes)).isoformat()
        self.user_repository.create_password_reset_token(user.user_id, token_hash, expires_at)
        is_sent = self._send_password_reset_email(user.email, reset_token)
        if not is_sent:
            self.user_repository.revoke_password_reset_token(token_hash)
        return is_sent

    def reset_password(self, reset_token: str, new_password: str) -> bool:
        token_hash = self._hash_password(reset_token)
        user_id = self.user_repository.consume_password_reset_token(token_hash)
        if user_id is None:
            return False

        self.user_repository.update_password_hash(user_id, self._hash_password(new_password))
        return True
