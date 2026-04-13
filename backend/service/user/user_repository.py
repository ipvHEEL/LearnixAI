import sqlite3
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

                CREATE TABLE IF NOT EXISTS user_saved_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    post_id TEXT NOT NULL,
                    post_url TEXT,
                    post_title TEXT,
                    post_summary TEXT,
                    post_category TEXT,
                    post_source TEXT,
                    post_time TEXT,
                    post_color TEXT,
                    relevance_score REAL DEFAULT 0,
                    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, post_id),
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS user_liked_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    post_id TEXT NOT NULL,
                    post_url TEXT,
                    post_title TEXT,
                    post_summary TEXT,
                    post_category TEXT,
                    post_source TEXT,
                    post_time TEXT,
                    post_color TEXT,
                    relevance_score REAL DEFAULT 0,
                    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, post_id),
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

    def list_saved_posts(self, user_id: int) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    post_id,
                    post_url,
                    post_title,
                    post_summary,
                    post_category,
                    post_source,
                    post_time,
                    post_color,
                    relevance_score,
                    saved_at
                FROM user_saved_posts
                WHERE user_id = ?
                ORDER BY saved_at DESC
                """,
                (user_id,),
            ).fetchall()

        return [
            {
                "post_id": row["post_id"],
                "post_url": row["post_url"],
                "post_title": row["post_title"],
                "post_summary": row["post_summary"],
                "post_category": row["post_category"],
                "post_source": row["post_source"],
                "post_time": row["post_time"],
                "post_color": row["post_color"],
                "relevance_score": row["relevance_score"] or 0,
                "saved_at": row["saved_at"],
            }
            for row in rows
        ]

    def save_post(self, user_id: int, post: dict) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO user_saved_posts (
                    user_id,
                    post_id,
                    post_url,
                    post_title,
                    post_summary,
                    post_category,
                    post_source,
                    post_time,
                    post_color,
                    relevance_score
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, post_id) DO UPDATE SET
                    post_url = excluded.post_url,
                    post_title = excluded.post_title,
                    post_summary = excluded.post_summary,
                    post_category = excluded.post_category,
                    post_source = excluded.post_source,
                    post_time = excluded.post_time,
                    post_color = excluded.post_color,
                    relevance_score = excluded.relevance_score,
                    saved_at = CURRENT_TIMESTAMP
                """,
                (
                    user_id,
                    post["post_id"],
                    post.get("post_url"),
                    post.get("post_title"),
                    post.get("post_summary"),
                    post.get("post_category"),
                    post.get("post_source"),
                    post.get("post_time"),
                    post.get("post_color"),
                    post.get("relevance_score", 0),
                ),
            )

    def delete_saved_post(self, user_id: int, post_id: str) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM user_saved_posts WHERE user_id = ? AND post_id = ?",
                (user_id, post_id),
            )

        return cursor.rowcount > 0

    def list_liked_posts(self, user_id: int) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    post_id,
                    post_url,
                    post_title,
                    post_summary,
                    post_category,
                    post_source,
                    post_time,
                    post_color,
                    relevance_score,
                    liked_at
                FROM user_liked_posts
                WHERE user_id = ?
                ORDER BY liked_at DESC
                """,
                (user_id,),
            ).fetchall()

        return [
            {
                "post_id": row["post_id"],
                "post_url": row["post_url"],
                "post_title": row["post_title"],
                "post_summary": row["post_summary"],
                "post_category": row["post_category"],
                "post_source": row["post_source"],
                "post_time": row["post_time"],
                "post_color": row["post_color"],
                "relevance_score": row["relevance_score"] or 0,
                "liked_at": row["liked_at"],
            }
            for row in rows
        ]

    def like_post(self, user_id: int, post: dict) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO user_liked_posts (
                    user_id,
                    post_id,
                    post_url,
                    post_title,
                    post_summary,
                    post_category,
                    post_source,
                    post_time,
                    post_color,
                    relevance_score
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, post_id) DO UPDATE SET
                    post_url = excluded.post_url,
                    post_title = excluded.post_title,
                    post_summary = excluded.post_summary,
                    post_category = excluded.post_category,
                    post_source = excluded.post_source,
                    post_time = excluded.post_time,
                    post_color = excluded.post_color,
                    relevance_score = excluded.relevance_score,
                    liked_at = CURRENT_TIMESTAMP
                """,
                (
                    user_id,
                    post["post_id"],
                    post.get("post_url"),
                    post.get("post_title"),
                    post.get("post_summary"),
                    post.get("post_category"),
                    post.get("post_source"),
                    post.get("post_time"),
                    post.get("post_color"),
                    post.get("relevance_score", 0),
                ),
            )

    def delete_liked_post(self, user_id: int, post_id: str) -> bool:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM user_liked_posts WHERE user_id = ? AND post_id = ?",
                (user_id, post_id),
            )

        return cursor.rowcount > 0
