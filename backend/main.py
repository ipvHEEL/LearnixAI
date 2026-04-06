from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from service.auth.auth_service import AuthService
from service.data.api_load import load_all_rss, parse_articles
from service.data.neural_ranker import rank_articles_nn
from service.session.redis_session_store import RedisSessionStore

app = FastAPI()
auth_service = AuthService()
session_store = RedisSessionStore()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    login: str
    password: str


class RegisterRequest(BaseModel):
    login: str
    email: EmailStr
    password: str = Field(min_length=6)


class InterestsUpdateRequest(BaseModel):
    interests: list[str]


class LastViewedPostRequest(BaseModel):
    post_id: str
    post_url: str | None = None
    post_title: str | None = None


def _extract_token(authorization: str | None) -> str:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return authorization.replace("Bearer ", "", 1)


def _authorized_user(authorization: str | None):
    token = _extract_token(authorization)
    user = auth_service.get_user_by_valid_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid JWT token")
    return user


@app.post("/register")
def register(data: RegisterRequest):
    user = auth_service.register(data.login, str(data.email), data.password)
    if user is None:
        raise HTTPException(status_code=409, detail="User already exists")
    return {"user_id": user.user_id, "user_name": user.user_name, "email": user.email}


@app.post("/login")
def login(data: LoginRequest):
    login_data = auth_service.login_with_jwt(data.login, data.password)
    if login_data is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = login_data["user"]
    return {
        "user_id": user.user_id,
        "user_name": user.user_name,
        "interests": user.interests,
        "access_token": login_data["token"],
        "token_type": "Bearer",
    }


@app.get("/news")
def news(authorization: str | None = Header(default=None)):
    user = _authorized_user(authorization)

    interests = user.interests

    xml_list = load_all_rss(interests=interests)
    articles = parse_articles(xml_list)

    ranked = rank_articles_nn(
        articles=articles,
        interests=interests,
        top_k=5,
    )

    return {
        "learner": user.user_name,
        "interests": interests,
        "total_articles": len(articles),
        "articles": ranked,
    }


@app.get("/interests")
def get_interests(authorization: str | None = Header(default=None)):
    user = _authorized_user(authorization)
    return {"user_id": user.user_id, "interests": user.interests}


@app.put("/interests")
def update_interests(data: InterestsUpdateRequest, authorization: str | None = Header(default=None)):
    user = _authorized_user(authorization)
    updated = auth_service.user_repository.update_interests(user.user_id, data.interests)
    return {"user_id": user.user_id, "interests": updated}


@app.put("/session/last-viewed-post")
def save_last_viewed_post(data: LastViewedPostRequest, authorization: str | None = Header(default=None)):
    user = _authorized_user(authorization)
    stored = session_store.save_last_viewed_post(
        user.user_id,
        {
            "post_id": data.post_id,
            "post_url": data.post_url,
            "post_title": data.post_title,
        },
    )
    if not stored:
        raise HTTPException(status_code=503, detail="Session storage unavailable")
    return {"status": "ok"}


@app.get("/session/last-viewed-post")
def get_last_viewed_post(authorization: str | None = Header(default=None)):
    user = _authorized_user(authorization)
    payload = session_store.get_last_viewed_post(user.user_id)
    return {
        "user_id": user.user_id,
        "last_viewed_post": payload,
    }
