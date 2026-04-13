from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from service.auth.auth_service import AuthService
from service.data.api_load import load_all_rss, parse_articles
from service.data.neural_ranker import rank_articles_nn
from service.session.redis_session_store import RedisSessionStore

app = FastAPI()
auth_service = AuthService()
session_store = RedisSessionStore()
bearer_scheme = HTTPBearer(auto_error=True)

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


class SavedPostRequest(BaseModel):
    post_id: str
    post_url: str | None = None
    post_title: str | None = None
    post_summary: str | None = None
    post_category: str | None = None
    post_source: str | None = None
    post_time: str | None = None
    post_color: str | None = None
    relevance_score: float = 0


class LikedPostRequest(BaseModel):
    post_id: str
    post_url: str | None = None
    post_title: str | None = None
    post_summary: str | None = None
    post_category: str | None = None
    post_source: str | None = None
    post_time: str | None = None
    post_color: str | None = None
    relevance_score: float = 0


def _authorized_user(credentials: HTTPAuthorizationCredentials) -> object:
    token = credentials.credentials
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
def news(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)

    xml_list = load_all_rss()
    articles = parse_articles(xml_list)

    interests = user.interests

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
def get_interests(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    return {"user_id": user.user_id, "interests": user.interests}


@app.put("/interests")
def update_interests(
    data: InterestsUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    updated = auth_service.user_repository.update_interests(user.user_id, data.interests)
    return {"user_id": user.user_id, "interests": updated}


@app.put("/session/last-viewed-post")
def save_last_viewed_post(
    data: LastViewedPostRequest,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
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
def get_last_viewed_post(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    payload = session_store.get_last_viewed_post(user.user_id)
    return {
        "user_id": user.user_id,
        "last_viewed_post": payload,
    }


@app.get("/saved-posts")
def get_saved_posts(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    posts = auth_service.user_repository.list_saved_posts(user.user_id)
    return {"user_id": user.user_id, "saved_posts": posts}


@app.put("/saved-posts")
def save_post(
    data: SavedPostRequest,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    auth_service.user_repository.save_post(
        user.user_id,
        {
            "post_id": data.post_id,
            "post_url": data.post_url,
            "post_title": data.post_title,
            "post_summary": data.post_summary,
            "post_category": data.post_category,
            "post_source": data.post_source,
            "post_time": data.post_time,
            "post_color": data.post_color,
            "relevance_score": data.relevance_score,
        },
    )
    return {"status": "ok"}


@app.post("/saved-posts")
def save_post_via_post(
    data: SavedPostRequest,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    return save_post(data, credentials)


@app.delete("/saved-posts")
def delete_saved_post(
    post_id: str,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    deleted = auth_service.user_repository.delete_saved_post(user.user_id, post_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Saved post not found")
    return {"status": "ok"}


@app.get("/liked-posts")
def get_liked_posts(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    posts = auth_service.user_repository.list_liked_posts(user.user_id)
    return {"user_id": user.user_id, "liked_posts": posts}


@app.put("/liked-posts")
def like_post(
    data: LikedPostRequest,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    auth_service.user_repository.like_post(
        user.user_id,
        {
            "post_id": data.post_id,
            "post_url": data.post_url,
            "post_title": data.post_title,
            "post_summary": data.post_summary,
            "post_category": data.post_category,
            "post_source": data.post_source,
            "post_time": data.post_time,
            "post_color": data.post_color,
            "relevance_score": data.relevance_score,
        },
    )
    return {"status": "ok"}


@app.post("/liked-posts")
def like_post_via_post(
    data: LikedPostRequest,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    return like_post(data, credentials)


@app.delete("/liked-posts")
def delete_liked_post(
    post_id: str,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
):
    user = _authorized_user(credentials)
    deleted = auth_service.user_repository.delete_liked_post(user.user_id, post_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Liked post not found")
    return {"status": "ok"}
