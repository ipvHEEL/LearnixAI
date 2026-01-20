#service/user/user.py
class User:
    def __init__(self, user_id: int, interests: list[str]):
        self.user_id = user_id
        self.interests = interests
    
    def has_interests(self) -> bool:
        return len(self.interests > 0 )
