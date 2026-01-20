#service/neural_ranker.py
from typing import List, Dict
import torch
from sentence_transformers import SentenceTransformer, util

_model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

def rank_articles_nn(
    articles: List[Dict],
    interests: List[str],
    top_k: int = 5
) -> List[Dict]:

    if not articles:
        return []

    texts = [a["full_text"] for a in articles]

    article_embeddings = _model.encode(texts, convert_to_tensor=True)
    interest_embedding = _model.encode(" ".join(interests), convert_to_tensor=True)

    scores = util.cos_sim(interest_embedding, article_embeddings)[0]

    ranked = []
    for article, score in zip(articles, scores):
        article_copy = article.copy()
        article_copy["relevance_score"] = float(score)
        ranked.append(article_copy)

    ranked.sort(key=lambda x: x["relevance_score"], reverse=True)

    return ranked   
