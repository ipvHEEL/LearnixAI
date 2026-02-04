#service/user/user.py
class User:
    def __init__(self, user_id: int, interests: list[str], user_name: str, token: str | None = None):
        self.user_id = user_id
        self.interests = interests or []
        self.user_name = user_name
        self.token = token

    def has_interests(self) -> bool:
        return len(self.interests) > 0
