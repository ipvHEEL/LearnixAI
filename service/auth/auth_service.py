from typing import Optional
from service.user.user import User 

class AuthService:
    def authenticate(self, login: str, password: str) -> Optional[User]:
        id = 1
        if login == "admin" and password == "password":
            return { login : id}
        return None

