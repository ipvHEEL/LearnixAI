from hashlib import sha256
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

    def get_user_by_valid_token(self, token: str) -> Optional[User]:
        payload = self.jwt_service.validate_token(token)
        if payload is None:
            return None

        user_id = int(payload["sub"])
        saved_token = self.user_repository.get_current_jwt(user_id)
        if saved_token != token:
            return None

        return self.user_repository.get_user_by_id(user_id)
