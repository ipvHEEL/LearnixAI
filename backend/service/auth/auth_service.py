#service/auth/auth_service.py
from typing import Optional
from service.user.user import User 

class AuthService:
    def authenticate(self, login: str, password: str) -> Optional[User]:
        if login == "admin" and password == "password":
            return User(user_id=1, user_name=login, interests=[], token="test-token-admin")
        return None

    def register(self, login: str, email: str, password: str) -> Optional[User]:
        if not login or not email or not password:
            return None
        return User(user_id=2, user_name=login, interests=[], token="test-token-signup")
