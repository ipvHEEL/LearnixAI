import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from service.user.user import User


class UserRepository:
    def __init__(self, db_path: str | None = None) -> None:
        base_dir = Path(__file__).resolve().parents[2]
        self.db_path = Path(db_path) if db_path else base_dir / "data" / "learnix.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_name TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    current_jwt TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS user_profile (
                    user_id INTEGER PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    age INTEGER,
                    city TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS user_interests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    interest TEXT NOT NULL,
                    UNIQUE (user_id, interest),
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token_hash TEXT NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    used_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                );
                """
            )

    def create_user(self, user_name: str, email: str, password_hash: str) -> User:
        with self._connect() as conn:
            cursor = conn.execute(
                "INSERT INTO users (user_name, email, password_hash) VALUES (?, ?, ?)",
                (user_name, email, password_hash),
            )
            user_id = int(cursor.lastrowid)
            conn.execute("INSERT INTO user_profile (user_id) VALUES (?)", (user_id,))

        return User(
            user_id=user_id,
            user_name=user_name,
            email=email,
            password_hash=password_hash,
            interests=[],
        )

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT user_id, user_name, email, password_hash FROM users WHERE user_id = ?",
                (user_id,),
            ).fetchone()

            if row is None:
                return None

            interests = [
                item["interest"]
                for item in conn.execute(
                    "SELECT interest FROM user_interests WHERE user_id = ? ORDER BY interest",
                    (user_id,),
                ).fetchall()
            ]

        return User(
            user_id=row["user_id"],
            user_name=row["user_name"],
            email=row["email"],
            password_hash=row["password_hash"],
            interests=interests,
        )

    def get_user_by_login(self, login: str) -> Optional[User]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT user_id FROM users WHERE user_name = ?",
                (login,),
            ).fetchone()

        if row is None:
            return None

        return self.get_user_by_id(row["user_id"])

    def get_user_by_email(self, email: str) -> Optional[User]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT user_id FROM users WHERE email = ?",
                (email,),
            ).fetchone()

        if row is None:
            return None

        return self.get_user_by_id(row["user_id"])

    def update_interests(self, user_id: int, interests: list[str]) -> list[str]:
        normalized = sorted({interest.strip() for interest in interests if interest and interest.strip()})
        with self._connect() as conn:
            conn.execute("DELETE FROM user_interests WHERE user_id = ?", (user_id,))
            conn.executemany(
                "INSERT INTO user_interests (user_id, interest) VALUES (?, ?)",
                [(user_id, interest) for interest in normalized],
            )

        return normalized

    def save_current_jwt(self, user_id: int, token: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE users SET current_jwt = ? WHERE user_id = ?",
                (token, user_id),
            )

    def get_current_jwt(self, user_id: int) -> Optional[str]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT current_jwt FROM users WHERE user_id = ?",
                (user_id,),
            ).fetchone()

        return row["current_jwt"] if row else None

    def update_password_hash(self, user_id: int, password_hash: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "UPDATE users SET password_hash = ?, current_jwt = NULL WHERE user_id = ?",
                (password_hash, user_id),
            )

    def create_password_reset_token(self, user_id: int, token_hash: str, expires_at: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                VALUES (?, ?, ?)
                """,
                (user_id, token_hash, expires_at),
            )

    def consume_password_reset_token(self, token_hash: str) -> Optional[int]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, user_id, expires_at, used_at
                FROM password_reset_tokens
                WHERE token_hash = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (token_hash,),
            ).fetchone()

            if row is None:
                return None

            expires_at = row["expires_at"]
            used_at = row["used_at"]
            expires_at_dt = datetime.fromisoformat(expires_at)
            now_dt = datetime.fromisoformat(now_iso)
            if used_at is not None or expires_at_dt <= now_dt:
                return None

            conn.execute(
                "UPDATE password_reset_tokens SET used_at = ? WHERE id = ?",
                (now_iso, row["id"]),
            )
            return int(row["user_id"])

    def revoke_password_reset_token(self, token_hash: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "DELETE FROM password_reset_tokens WHERE token_hash = ?",
                (token_hash,),
            )
