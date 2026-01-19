from fastapi import FastAPI
from service.api_load import load_all_rss, parse_articles
from service.neural_ranker import rank_articles_nn

app = FastAPI()


@app.get("/news")
def news():
    xml_list = load_all_rss()
    articles = parse_articles(xml_list)

    interests = [
        "Python",
        "геймдев",
        "паттерн"
        # "игры"
        # "алготрейдинг",
        # "бэктестинг",
        # "pandas"
    ]

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
