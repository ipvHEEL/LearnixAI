import json
import os
from typing import Optional

from service.user.user import User

try:
    import redis
except Exception:  # pragma: no cover
    redis = None

try:
    import psycopg
except Exception:  # pragma: no cover
    psycopg = None


class UserRepository:
    """User storage: Redis as primary cache and optional Postgres persistence."""

    def __init__(self) -> None:
        self.redis_client = self._build_redis_client()
        self.postgres_dsn = os.getenv("POSTGRES_DSN")
        self._ensure_postgres_schema()

    def _build_redis_client(self):
        redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        if redis is None:
            return None

        try:
            client = redis.Redis.from_url(redis_url, decode_responses=True)
            client.ping()
            return client
        except Exception:
            return None

    def _ensure_postgres_schema(self) -> None:
        if not self.postgres_dsn or psycopg is None:
            return

        try:
            with psycopg.connect(self.postgres_dsn) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS users (
                            user_id INTEGER PRIMARY KEY,
                            user_name TEXT NOT NULL,
                            interests JSONB NOT NULL DEFAULT '[]'::jsonb
                        )
                        """
                    )
                conn.commit()
        except Exception:
            # Postgres is optional, startup must not fail if DB is unavailable.
            return

    def save_user(self, user: User) -> None:
        data = {
            "user_id": user.user_id,
            "user_name": user.user_name,
            "interests": user.interests,
        }

        if self.redis_client:
            try:
                self.redis_client.set(f"user:{user.user_id}", json.dumps(data, ensure_ascii=False))
            except Exception:
                pass

        if self.postgres_dsn and psycopg is not None:
            try:
                with psycopg.connect(self.postgres_dsn) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO users (user_id, user_name, interests)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (user_id) DO UPDATE
                            SET user_name = EXCLUDED.user_name,
                                interests = EXCLUDED.interests
                            """,
                            (user.user_id, user.user_name, json.dumps(user.interests, ensure_ascii=False)),
                        )
                    conn.commit()
            except Exception:
                pass

    def get_user(self, user_id: int) -> Optional[User]:
        if self.redis_client:
            try:
                cached = self.redis_client.get(f"user:{user_id}")
                if cached:
                    data = json.loads(cached)
                    return User(data["user_id"], data.get("interests", []), data["user_name"])
            except Exception:
                pass

        if self.postgres_dsn and psycopg is not None:
            try:
                with psycopg.connect(self.postgres_dsn) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT user_id, user_name, interests FROM users WHERE user_id = %s",
                            (user_id,),
                        )
                        row = cur.fetchone()

                if row:
                    interests = row[2] if isinstance(row[2], list) else json.loads(row[2])
                    user = User(user_id=row[0], user_name=row[1], interests=interests)
                    if self.redis_client:
                        try:
                            self.redis_client.set(
                                f"user:{user.user_id}",
                                json.dumps(
                                    {
                                        "user_id": user.user_id,
                                        "user_name": user.user_name,
                                        "interests": user.interests,
                                    },
                                    ensure_ascii=False,
                                ),
                            )
                        except Exception:
                            pass
                    return user
            except Exception:
                pass

        return None
