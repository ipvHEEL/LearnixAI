from datetime import datetime, timedelta
from hashlib import sha256
from pathlib import Path
import secrets
from typing import Optional

from service.auth.jwt_service import JwtService
from service.user.user import User
from service.user.user_repository import UserRepository


class AuthService:
    def __init__(self) -> None:
        self.user_repository = UserRepository()
        self.jwt_service = JwtService()
        self._ensure_default_user()

    @staticmethod
    def _hash_password(password: str) -> str:
        return sha256(password.encode("utf-8")).hexdigest()

    @staticmethod
    def _mail_outbox_path() -> Path:
        base_dir = Path(__file__).resolve().parents[2]
        return base_dir / "data" / "mail_outbox.log"

    def _write_password_reset_mail(self, email: str, token: str) -> None:
        outbox = self._mail_outbox_path()
        outbox.parent.mkdir(parents=True, exist_ok=True)
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        with outbox.open("a", encoding="utf-8") as file:
            file.write(
                f"[{datetime.utcnow().isoformat()}] To: {email}\n"
                "Subject: Сброс пароля Learnix\n"
                "Мы получили запрос на сброс пароля в Learnix.\n"
                f"Перейдите по ссылке для продолжения: {reset_link}\n\n"
            )

    def _ensure_default_user(self) -> None:
        default_user = self.user_repository.get_user_by_login("admin")
        if default_user is None:
            created = self.user_repository.create_user("admin", "admin@learnix.local", self._hash_password("password"))
            self.user_repository.update_interests(created.user_id, ["математика", "алгебра", "геометрия"])

    def register(self, login: str, email: str, password: str) -> Optional[User]:
        if self.user_repository.get_user_by_login(login):
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

    def request_password_reset(self, email: str) -> None:
        user = self.user_repository.get_user_by_email(email)
        if user is None:
            return

        token = secrets.token_urlsafe(24)
        expires_at = datetime.utcnow() + timedelta(minutes=30)
        self.user_repository.create_password_reset_token(user.user_id, token, expires_at)
        self._write_password_reset_mail(email, token)

    def reset_password(self, token: str, new_password: str) -> bool:
        user_id = self.user_repository.consume_password_reset_token(token)
        if user_id is None:
            return False

        self.user_repository.update_password_hash(user_id, self._hash_password(new_password))
        return True

    def get_user_by_valid_token(self, token: str) -> Optional[User]:
        payload = self.jwt_service.validate_token(token)
        if payload is None:
            return None

        user_id = int(payload["sub"])
        return self.user_repository.get_user_by_id(user_id)
