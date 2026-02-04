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

class SignupRequest(BaseModel):
    login: str
    email: str
    password: str

@app.get("/news")
def news():
    user = User(1, ["математика", "алгебра", "геометрия"], "JJHELLOHEEL")
    xml_list = load_all_rss()
    articles = parse_articles(xml_list)

    interests = user.interests

    ranked = rank_articles_nn(
        articles=articles,
        interests=interests,
        top_k=5
    )

    return {
        "learner": "Андрей",
        "interests": interests,
        "total_articles": len(articles),
        "articles": ranked
    }

@app.post("/login")
def login(data: LoginRequest):
    user = auth_service.authenticate(data.login, data.password)
    if user:
        return user
    return None

@app.post("/signup")
def signup(data: SignupRequest):
    user = auth_service.register(data.login, data.email, data.password)
    if user:
        return user
    return None
