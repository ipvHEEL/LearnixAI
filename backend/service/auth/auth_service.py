#service/auth/auth_service.py
from typing import Optional
from service.user.user import User 

class AuthService:
    def authenticate(self, login: str, password: str) -> Optional[User]:
        id = 1
        if login == "admin" and password == "password":
            return User(user_id=1, user_name=login, interests=[])
        return None

