import { useEffect, useMemo, useState } from "react";
import "./NewsFeed.css";
import InterestsGraph from "./InterestsGraph";

const profileLinks = [
  "Моя страница",
  "Новости",
  "Сообщения",
  "Друзья",
  "Сообщества",
  "Фотографии",
  "Музыка",
];

const sectionLinks = ["Новости", "Фотографии", "Подкасты", "Рекомендации", "Поиск"];

const cardGradients = [
  "linear-gradient(180deg, #7a2ef7 0%, #820f85 56%, #280020 100%)",
  "linear-gradient(180deg, #304ffe 0%, #4f6fe7 45%, #060f2e 100%)",
  "linear-gradient(180deg, #b3471c 0%, #ad5f15 50%, #3a1a00 100%)",
  "linear-gradient(180deg, #00a497 0%, #3d6fca 55%, #071028 100%)",
  "linear-gradient(180deg, #d2198f 0%, #6d2ff7 55%, #14042f 100%)",
];

const decodeHtml = (text = "") =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "");

const toNewsItem = (article, index) => {
  let source = "Источник";

  try {
    source = new URL(article.url).hostname.replace("www.", "");
  } catch (_error) {
    source = "Источник";
  }

  return {
    id: `${article.url ?? "article"}-${index}`,
    category: article.relevance_score >= 0.5 ? "Высокий интерес" : "Рекомендовано",
    title: article.title ?? "Без названия",
    summary: decodeHtml(article.description ?? article.full_text ?? ""),
    source,
    time: article.publishedAt
      ? new Date(article.publishedAt).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Без даты",
    color: cardGradients[index % cardGradients.length],
    relevanceScore: article.relevance_score ?? 0,
    url: article.url,
  };
};

function NewsFeed() {
  const [likes, setLikes] = useState({});
  const [saved, setSaved] = useState({});
  const [interestingFirst, setInterestingFirst] = useState(true);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [customInterest, setCustomInterest] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);

  const token = localStorage.getItem("jwtToken") ?? "";

  const loadNewsAndInterests = async () => {
    if (!token) {
      setError("Сессия не найдена. Выполните вход снова.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const interestsRes = await fetch("http://127.0.0.1:8000/interests", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (interestsRes.ok) {
        const interestsData = await interestsRes.json();
        setSelectedInterests(interestsData.interests ?? []);
      }

      const res = await fetch("http://127.0.0.1:8000/news", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("userId");
          window.location.href = "/";
          return;
        }
        throw new Error("Ошибка загрузки новостей");
      }

      const data = await res.json();
      const normalizedNews = (data.articles ?? []).map(toNewsItem);
      setNews(normalizedNews);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Не удалось получить новости с сервера");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNewsAndInterests();
  }, []);

  const totalLikes = useMemo(() => Object.values(likes).reduce((acc, current) => acc + current, 0), [likes]);

  const visibleNews = useMemo(() => {
    if (!interestingFirst) {
      return news;
    }

    return [...news].sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [news, interestingFirst]);

  const updateLike = (id, value) => {
    setLikes((prev) => ({ ...prev, [id]: value }));
  };

  const toggleSave = (id) => {
    setSaved((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveInterests = async () => {
    setSavingInterests(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/interests", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interests: selectedInterests }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("userId");
          window.location.href = "/";
          return;
        }
        throw new Error("Не удалось обновить интересы");
      }

      await loadNewsAndInterests();
    } catch (saveError) {
      console.error(saveError);
      setError("Не удалось обновить интересы пользователя");
    } finally {
      setSavingInterests(false);
    }
  };

  const addCustomInterest = () => {
    const prepared = customInterest.trim();
    if (!prepared || selectedInterests.includes(prepared)) {
      return;
    }
    setSelectedInterests((prev) => [...prev, prepared]);
    setCustomInterest("");
  };

  return (
    <main className="news-feed-page">
      <div className="news-layout">
        <aside className="nav-panel left-panel" aria-label="Навигация профиля">
          {profileLinks.map((link) => (
            <button key={link} className="panel-link" type="button">
              {link}
            </button>
          ))}
        </aside>

        <section className="news-main" aria-label="Лента новостей в стиле TikTok">
          <header className="news-feed-header">
            <h1>Лента новостей</h1>
            <p>Свайпай вверх/вниз или прокручивай колесом мыши</p>
            <span className="news-feed-counter">Реакций: {totalLikes}</span>
          </header>

          {loading && <p className="news-state">Загрузка новостей...</p>}
          {error && <p className="news-state news-state-error">{error}</p>}

          {!loading && !error && (
            <div className="news-feed">
              {visibleNews.map((newsItem) => {
                const currentLike = likes[newsItem.id] ?? 0;
                const isSaved = Boolean(saved[newsItem.id]);

                return (
                  <article key={newsItem.id} className="news-card" style={{ backgroundImage: newsItem.color }}>
                    <div className="news-card-overlay" />
                    <div className="news-card-content">
                      <span className="news-category">{newsItem.category}</span>
                      <h2>{newsItem.title}</h2>
                      <p>{newsItem.summary}</p>

                      <div className="news-meta">
                        <span>{newsItem.source}</span>
                        <span>{newsItem.time}</span>
                      </div>

                      <a href={newsItem.url} target="_blank" rel="noreferrer" className="news-link">
                        Читать оригинал
                      </a>
                    </div>

                    <aside className="news-actions" aria-label="Действия с новостью">
                      <button
                        type="button"
                        className={currentLike === 1 ? "active" : ""}
                        onClick={() => updateLike(newsItem.id, currentLike === 1 ? 0 : 1)}
                        aria-label="Нравится"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        className={currentLike === -1 ? "active" : ""}
                        onClick={() => updateLike(newsItem.id, currentLike === -1 ? 0 : -1)}
                        aria-label="Не нравится"
                      >
                        👎
                      </button>
                      <button
                        type="button"
                        className={isSaved ? "active" : ""}
                        onClick={() => toggleSave(newsItem.id)}
                        aria-label="Сохранить"
                      >
                        📌
                      </button>
                    </aside>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="right-column" aria-label="Правая колонка разделов">
          <section className="nav-panel right-panel">
            <h3>Разделы</h3>
            {sectionLinks.map((link) => (
              <button key={link} className="panel-link" type="button">
                {link}
              </button>
            ))}
          </section>

          <section className="nav-panel right-switcher">
            <div className="switch-row">
              <span>Сначала интересные</span>
              <button
                type="button"
                className={`switch ${interestingFirst ? "active" : ""}`}
                onClick={() => setInterestingFirst((prev) => !prev)}
                aria-pressed={interestingFirst}
              >
                <span className="switch-thumb" />
              </button>
            </div>
          </section>

          <section className="nav-panel interests-panel">
            <h3>Интересы</h3>
            <InterestsGraph selectedInterests={selectedInterests} onSelectionChange={setSelectedInterests} />
            <div className="selected-interests-list">
              {selectedInterests.length > 0 ? (
                selectedInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className="interest-chip"
                    onClick={() => setSelectedInterests((prev) => prev.filter((item) => item !== interest))}
                  >
                    {interest} ×
                  </button>
                ))
              ) : (
                <span className="interest-empty">Выберите интересы в графе</span>
              )}
            </div>
            <div className="interest-input-row">
              <input
                type="text"
                value={customInterest}
                onChange={(event) => setCustomInterest(event.target.value)}
                placeholder="Добавить свой интерес"
              />
              <button type="button" onClick={addCustomInterest}>
                +
              </button>
            </div>
            <button type="button" onClick={handleSaveInterests} disabled={savingInterests}>
              {savingInterests ? "Сохранение..." : "Обновить интересы"}
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default NewsFeed;
