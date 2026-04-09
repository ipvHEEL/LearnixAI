from pathlib import Path
from typing import Dict, List

from huggingface_hub import snapshot_download
from sentence_transformers import SentenceTransformer, util

MODEL_REPO_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
MODEL_DIR = Path(__file__).resolve().parents[2] / "models" / "paraphrase-multilingual-MiniLM-L12-v2"


def _resolve_model_path() -> str:
    """Download model once on first run, then always use local files."""
    if MODEL_DIR.exists() and any(MODEL_DIR.iterdir()):
        return str(MODEL_DIR)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id=MODEL_REPO_ID,
        local_dir=str(MODEL_DIR),
        local_dir_use_symlinks=False,
        resume_download=True,
    )
    return str(MODEL_DIR)


_model = SentenceTransformer(_resolve_model_path())


def rank_articles_nn(
    articles: List[Dict],
    interests: List[str],
    top_k: int = 5,
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

    return ranked[:top_k]
