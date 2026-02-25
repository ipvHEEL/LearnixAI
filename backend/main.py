from fastapi import FastAPI
from service.data.api_load import load_all_rss, parse_articles
from service.data.neural_ranker import rank_articles_nn
from service.user.user import User
from pydantic import BaseModel
from service.auth.auth_service import AuthService
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
auth_service = AuthService()


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
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


@app.get("/news")
def news(user_id: int = 1):
    user = auth_service.user_repository.get_user(user_id) or User(
        user_id,
        ["математика", "алгебра", "геометрия"],
        "Guest",
    )

    xml_list = load_all_rss()
    articles = parse_articles(xml_list)

    interests = user.interests

    ranked = rank_articles_nn(
        articles=articles,
        interests=interests,
        top_k=5
    )

    return {
        "learner": user.user_name,
        "interests": interests,
        "total_articles": len(articles),
        "articles": ranked
    }


@app.post("/login")
def login(data: LoginRequest):
    user = auth_service.authenticate(data.login, data.password)
    if user:
        return {
            "user_id": user.user_id,
            "user_name": user.user_name,
            "interests": user.interests,
        }
    return None
