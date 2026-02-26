from dataclasses import dataclass, field


@dataclass
class User:
    user_id: int
    user_name: str
    email: str
    password_hash: str
    interests: list[str] = field(default_factory=list)

    def has_interests(self) -> bool:
        return len(self.interests) > 0
