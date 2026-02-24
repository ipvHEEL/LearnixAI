#service/auth/auth_service.py
from typing import Optional

from service.user.user import User
from service.user.user_repository import UserRepository


class AuthService:
    def __init__(self) -> None:
        self.user_repository = UserRepository()
        self.default_user = User(user_id=1, user_name="admin", interests=["математика", "алгебра", "геометрия"])
        self.user_repository.save_user(self.default_user)

    def authenticate(self, login: str, password: str) -> Optional[User]:
        if login == "admin" and password == "password":
            stored_user = self.user_repository.get_user(1)
            if stored_user:
                return stored_user
            self.user_repository.save_user(self.default_user)
            return self.default_user
        return None
