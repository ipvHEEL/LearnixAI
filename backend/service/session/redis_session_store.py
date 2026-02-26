import json
import os
from typing import Any

from redis import Redis
from redis.exceptions import RedisError


class RedisSessionStore:
    def __init__(self) -> None:
        redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        self.client = Redis.from_url(redis_url, decode_responses=True)
        self.ttl_seconds = int(os.getenv("SESSION_TTL_SECONDS", "604800"))

    @staticmethod
    def _key(user_id: int) -> str:
        return f"session:{user_id}:last_viewed_post"

    def save_last_viewed_post(self, user_id: int, payload: dict[str, Any]) -> bool:
        try:
            self.client.setex(self._key(user_id), self.ttl_seconds, json.dumps(payload, ensure_ascii=False))
            return True
        except RedisError:
            return False

    def get_last_viewed_post(self, user_id: int) -> dict[str, Any] | None:
        try:
            raw = self.client.get(self._key(user_id))
            if raw is None:
                return None
            return json.loads(raw)
        except (RedisError, json.JSONDecodeError):
            return None
