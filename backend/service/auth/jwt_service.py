import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional


class JwtService:
    def __init__(self) -> None:
        self.secret = os.getenv("JWT_SECRET", "learnix-super-secret")
        self.ttl_seconds = int(os.getenv("JWT_TTL_SECONDS", "86400"))

    @staticmethod
    def _b64encode(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

    @staticmethod
    def _b64decode(data: str) -> bytes:
        padding = "=" * (-len(data) % 4)
        return base64.urlsafe_b64decode(data + padding)

    def _sign(self, msg: str) -> str:
        digest = hmac.new(self.secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).digest()
        return self._b64encode(digest)

    def create_token(self, user_id: int, user_name: str) -> str:
        header = {"alg": "HS256", "typ": "JWT"}
        payload = {
            "sub": str(user_id),
            "name": user_name,
            "iat": int(time.time()),
            "exp": int(time.time()) + self.ttl_seconds,
        }
        header_b64 = self._b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        payload_b64 = self._b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        signing_input = f"{header_b64}.{payload_b64}"
        signature = self._sign(signing_input)
        return f"{signing_input}.{signature}"

    def validate_token(self, token: str) -> Optional[dict]:
        try:
            header_b64, payload_b64, signature = token.split(".")
            signing_input = f"{header_b64}.{payload_b64}"
            if not hmac.compare_digest(signature, self._sign(signing_input)):
                return None

            payload = json.loads(self._b64decode(payload_b64).decode("utf-8"))
            if payload.get("exp", 0) < int(time.time()):
                return None
            return payload
        except Exception:
            return None
