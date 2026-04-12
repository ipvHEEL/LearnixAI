import { useEffect, useMemo, useRef, useState } from "react";
import "./NewsFeed.css";

const profileLinks = ["Моя страница", "Новости", "Граф интересов", "Сохраненное", "Сообщения", "Друзья", "Сообщества", "Фотографии", "Музыка"];

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
  const stablePostId =
    article.url?.trim() ||
    `article-${article.title ?? "untitled"}-${article.publishedAt ?? index}`;

  try {
    source = new URL(article.url).hostname.replace("www.", "");
  } catch (_error) {
    source = "Источник";
  }

  return {
    id: stablePostId,
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

const graphNodesTemplate = [
  { id: "ai", label: "AI", x: 50, y: 18 },
  { id: "ml", label: "ML", x: 34, y: 33 },
  { id: "data", label: "Data", x: 66, y: 33 },
  { id: "startup", label: "Стартапы", x: 22, y: 50 },
  { id: "design", label: "Дизайн", x: 42, y: 52 },
  { id: "product", label: "Product", x: 58, y: 52 },
  { id: "science", label: "Наука", x: 77, y: 50 },
  { id: "robotics", label: "Робототехника", x: 36, y: 70 },
  { id: "space", label: "Космос", x: 64, y: 70 },
  { id: "future", label: "Будущее", x: 50, y: 84 },
];

const initialNodes = graphNodesTemplate.map((node) => ({ ...node }));

function InterestsGraph({ onSelectionChange }) {
  const containerRef = useRef(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [draggedNodeId, setDraggedNodeId] = useState("");

  const graphEdges = useMemo(() => {
    const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
    const edgeSet = new Set();

    nodes.forEach((node) => {
      const nearest = nodes
        .filter((candidate) => candidate.id !== node.id)
        .map((candidate) => {
          const dx = node.x - candidate.x;
          const dy = node.y - candidate.y;
          return { id: candidate.id, distance: Math.sqrt(dx * dx + dy * dy) };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2);

      nearest.forEach((target) => {
        const edge = [node.id, target.id].sort().join("|");
        edgeSet.add(edge);
      });
    });

    return Array.from(edgeSet).map((edge) => {
      const [from, to] = edge.split("|");
      return [from, to, nodeById[from], nodeById[to]];
    });
  }, [nodes]);

  const neighborsByNode = useMemo(() => {
    const map = new Map();
    graphEdges.forEach(([from, to]) => {
      map.set(from, [...(map.get(from) ?? []), to]);
      map.set(to, [...(map.get(to) ?? []), from]);
    });
    return map;
  }, [graphEdges]);

  const highlightedIds = useMemo(() => {
    if (!selectedNodeId) {
      return new Set();
    }

    return new Set([selectedNodeId, ...(neighborsByNode.get(selectedNodeId) ?? [])]);
  }, [neighborsByNode, selectedNodeId]);

  const selectedInterests = useMemo(() => {
    if (!selectedNodeId) {
      return [];
    }

    return nodes.filter((node) => highlightedIds.has(node.id)).map((node) => node.label);
  }, [highlightedIds, nodes, selectedNodeId]);

  useEffect(() => {
    onSelectionChange(selectedInterests);
  }, [onSelectionChange, selectedInterests]);

  useEffect(() => {
    if (!draggedNodeId) {
      return undefined;
    }

    const handleMove = (event) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.min(95, Math.max(5, x));
      const clampedY = Math.min(92, Math.max(8, y));

      setNodes((prev) => prev.map((node) => (node.id === draggedNodeId ? { ...node, x: clampedX, y: clampedY } : node)));
    };

    const handleUp = () => setDraggedNodeId("");

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [draggedNodeId]);

  return (
    <div className="graph-window" ref={containerRef}>
      <div className="graph-background" />

      <div className="graph-hint">Связи строятся автоматически по близости узлов. Перетаскивайте узлы, чтобы менять сеть.</div>

      <svg className="graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {graphEdges.map(([from, to, fromNode, toNode]) => {
          const isActive = selectedNodeId && highlightedIds.has(from) && highlightedIds.has(to);

          return (
            <line
              key={`${from}-${to}`}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              className={`graph-edge ${isActive ? "active" : ""}`}
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const isSelected = selectedNodeId === node.id;
        const isHighlighted = highlightedIds.has(node.id);

        return (
          <button
            key={node.id}
            type="button"
            className={`graph-node ${isSelected ? "selected" : ""} ${selectedNodeId && !isHighlighted ? "dimmed" : ""}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => setSelectedNodeId((prev) => (prev === node.id ? "" : node.id))}
            onMouseDown={(event) => {
              if (event.button !== 0) {
                return;
              }
              event.preventDefault();
              setDraggedNodeId(node.id);
            }}
          >
            <span>{node.label}</span>
          </button>
        );
      })}

      <div className="graph-selected-list">
        <strong>Выбранные интересы:</strong>
        {selectedInterests.length > 0 ? selectedInterests.join(", ") : " —"}
      </div>
    </div>
  );
}

function NewsFeed({ initialView = "news" }) {
  const [likes, setLikes] = useState({});
  const [savedPosts, setSavedPosts] = useState({});
  const [interestingFirst, setInterestingFirst] = useState(true);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);
  const [activeView, setActiveView] = useState(initialView);
  const [selectedGraphInterests, setSelectedGraphInterests] = useState([]);
  const [lastViewedPost, setLastViewedPost] = useState(null);

  const getAuthHeaders = (withJson = false) => {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      throw new Error("NO_AUTH_TOKEN");
    }

    return withJson
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      : { Authorization: `Bearer ${token}` };
  };

  const handleNavigationClick = (link) => {
    if (link === "Новости") {
      setActiveView("news");
      window.history.replaceState({}, "", "/news");
    }

    if (link === "Граф интересов") {
      setActiveView("graph");
      window.history.replaceState({}, "", "/graph");
    }

    if (link === "Сохраненное") {
      setActiveView("saved");
      window.history.replaceState({}, "", "/saved");
    }
  };

  const loadNewsAndInterests = async () => {
    setLoading(true);
    setError("");

    try {
      const authHeaders = getAuthHeaders();
      const requestMap = {
        interests: fetch("http://127.0.0.1:8000/interests", {
          headers: authHeaders,
        }),
        lastViewed: fetch("http://127.0.0.1:8000/session/last-viewed-post", {
          headers: authHeaders,
        }),
        savedPosts: fetch("http://127.0.0.1:8000/saved-posts", {
          headers: authHeaders,
        }),
      };

      if (activeView === "news") {
        requestMap.news = fetch("http://127.0.0.1:8000/news", {
          headers: authHeaders,
        });
      }

      const settled = await Promise.allSettled(
        Object.entries(requestMap).map(async ([key, requestPromise]) => [key, await requestPromise]),
      );

      const responsesByKey = settled.reduce((acc, result) => {
        if (result.status === "fulfilled") {
          const [key, response] = result.value;
          acc[key] = response;
        }
        return acc;
      }, {});

      const hasUnauthorized = Object.values(responsesByKey).some((response) => response.status === 401);
      if (hasUnauthorized) {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
        return;
      }

      const interestsRes = responsesByKey.interests;
      if (interestsRes?.ok) {
        const interestsData = await interestsRes.json();
        setInterestsInput((interestsData.interests ?? []).join(", "));
      }

      const lastViewedRes = responsesByKey.lastViewed;
      if (lastViewedRes?.ok) {
        const lastViewedData = await lastViewedRes.json();
        setLastViewedPost(lastViewedData.last_viewed_post ?? null);
      }

      const savedPostsRes = responsesByKey.savedPosts;
      if (savedPostsRes?.ok) {
        const savedPostsData = await savedPostsRes.json();
        const mapped = (savedPostsData.saved_posts ?? []).reduce((acc, item) => {
          acc[item.post_id] = {
            id: item.post_id,
            category: item.post_category ?? "Сохранено",
            title: item.post_title ?? "Без названия",
            summary: item.post_summary ?? "",
            source: item.post_source ?? "Источник",
            time: item.post_time ?? "Без даты",
            color: item.post_color ?? cardGradients[0],
            relevanceScore: item.relevance_score ?? 0,
            url: item.post_url ?? "#",
            savedAt: item.saved_at ?? "",
          };
          return acc;
        }, {});
        setSavedPosts(mapped);
      } else if (activeView === "saved") {
        setError("Не удалось загрузить сохраненные посты");
      }

      const newsRes = responsesByKey.news;
      if (newsRes?.ok) {
        const data = await newsRes.json();
        const normalizedNews = (data.articles ?? []).map(toNewsItem);
        setNews(normalizedNews);
      } else if (activeView === "news") {
        setError("Не удалось получить новости с сервера");
      }
    } catch (fetchError) {
      console.error(fetchError);
      if (fetchError.message === "NO_AUTH_TOKEN") {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
        return;
      }
      setError("Не удалось загрузить данные с сервера");
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

  const savedNews = useMemo(
    () =>
      Object.values(savedPosts).sort((a, b) => {
        const aTs = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const bTs = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return bTs - aTs;
      }),
    [savedPosts],
  );

  const updateLike = (id, value) => {
    setLikes((prev) => ({ ...prev, [id]: value }));
  };

  const toggleSave = async (newsItem) => {
    const isSaved = Boolean(savedPosts[newsItem.id]);

    try {
      const authHeaders = getAuthHeaders();
      if (isSaved) {
        const deleteRes = await fetch(`http://127.0.0.1:8000/saved-posts?post_id=${encodeURIComponent(newsItem.id)}`, {
          method: "DELETE",
          headers: authHeaders,
        });

        if (!deleteRes.ok && deleteRes.status !== 404) {
          throw new Error("Не удалось удалить пост из сохраненного");
        }

        setSavedPosts((prev) => {
          const next = { ...prev };
          delete next[newsItem.id];
          return next;
        });
        return;
      }

      const saveRes = await fetch("http://127.0.0.1:8000/saved-posts", {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          post_id: newsItem.id,
          post_url: newsItem.url,
          post_title: newsItem.title,
          post_summary: newsItem.summary,
          post_category: newsItem.category,
          post_source: newsItem.source,
          post_time: newsItem.time,
          post_color: newsItem.color,
          relevance_score: newsItem.relevanceScore,
        }),
      });

      if (!saveRes.ok) {
        throw new Error("Не удалось сохранить пост");
      }

      setSavedPosts((prev) => ({
        ...prev,
        [newsItem.id]: {
          ...newsItem,
          savedAt: new Date().toISOString(),
        },
      }));
    } catch (saveError) {
      console.error(saveError);
      if (saveError.message === "NO_AUTH_TOKEN") {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
        return;
      }
      setError("Не удалось обновить сохраненные посты");
    }
  };

  const handleSaveInterests = async () => {
    setSavingInterests(true);
    setError("");
    try {
      const parsedInterests =
        activeView === "graph" && selectedGraphInterests.length > 0
          ? selectedGraphInterests
          : interestsInput
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);

      const res = await fetch("http://127.0.0.1:8000/interests", {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ interests: parsedInterests }),
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
      if (saveError.message === "NO_AUTH_TOKEN") {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
        return;
      }
      setError("Не удалось обновить интересы пользователя");
    } finally {
      setSavingInterests(false);
    }
  };

  const handleTrackLastViewedPost = async (newsItem) => {
    try {
      await fetch("http://127.0.0.1:8000/session/last-viewed-post", {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          post_id: newsItem.id,
          post_url: newsItem.url,
          post_title: newsItem.title,
        }),
      });

      setLastViewedPost({
        post_id: newsItem.id,
        post_url: newsItem.url,
        post_title: newsItem.title,
      });
    } catch (trackingError) {
      console.error("Не удалось сохранить последний просмотренный пост", trackingError);
    }
  };

  return (
    <main className="news-feed-page">
      <div className="news-layout">
        <aside className="nav-panel left-panel" aria-label="Навигация профиля">
          {profileLinks.map((link) => (
            <button
              key={link}
              className={`panel-link ${(activeView === "news" && link === "Новости") || (activeView === "graph" && link === "Граф интересов") || (activeView === "saved" && link === "Сохраненное") ? "active" : ""}`}
              type="button"
              onClick={() => handleNavigationClick(link)}
            >
              {link}
            </button>
          ))}
        </aside>

        <section className="news-main" aria-label="Лента новостей в стиле TikTok">
          <header className="news-feed-header">
            <h1>{activeView === "news" ? "Лента новостей" : activeView === "graph" ? "Граф интересов" : "Сохраненное"}</h1>
            <p>
              {activeView === "news"
                ? "Свайпай вверх/вниз или прокручивай колесом мыши"
                : activeView === "graph"
                  ? "Полноразмерное окно графа, сопоставимое по размеру с лентой"
                  : "Посты, которые вы добавили в сохраненное"}
            </p>
            {activeView === "news" && <span className="news-feed-counter">Реакций: {totalLikes}</span>}
            {activeView === "saved" && <span className="news-feed-counter">Сохранено: {savedNews.length}</span>}
            {activeView === "news" && lastViewedPost?.post_url && (
              <a className="last-viewed-link" href={lastViewedPost.post_url} target="_blank" rel="noreferrer">
                Продолжить: {lastViewedPost.post_title ?? "Последний просмотренный пост"}
              </a>
            )}
          </header>

          {activeView === "news" && loading && <p className="news-state">Загрузка новостей...</p>}
          {activeView === "news" && error && <p className="news-state news-state-error">{error}</p>}

          {activeView === "news" && !loading && !error && (
            <div className="news-feed">
              {visibleNews.map((newsItem) => {
                const currentLike = likes[newsItem.id] ?? 0;
                const isSaved = Boolean(savedPosts[newsItem.id]);

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

                      <a
                        href={newsItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="news-link"
                        onClick={() => handleTrackLastViewedPost(newsItem)}
                      >
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
                        onClick={() => toggleSave(newsItem)}
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

          {activeView === "graph" && (
            <InterestsGraph onSelectionChange={setSelectedGraphInterests} />
          )}

          {activeView === "saved" && (
            <>
              {loading && <p className="news-state">Загрузка сохраненных постов...</p>}
              {error && <p className="news-state news-state-error">{error}</p>}
              {!loading && savedNews.length === 0 && <p className="news-state">Вы пока не сохранили ни одного поста.</p>}
              {!loading && savedNews.length > 0 && (
                <div className="news-feed">
                  {savedNews.map((newsItem) => {
                    const currentLike = likes[newsItem.id] ?? 0;

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

                          <a
                            href={newsItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="news-link"
                            onClick={() => handleTrackLastViewedPost(newsItem)}
                          >
                            Читать оригинал
                          </a>
                        </div>

                        <aside className="news-actions" aria-label="Действия с сохраненной новостью">
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
                            className="active"
                            onClick={() => toggleSave(newsItem)}
                            aria-label="Убрать из сохраненного"
                          >
                            📌
                          </button>
                        </aside>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
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
            <textarea
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
                placeholder="Введите интересы через запятую"
                rows={5}
            />
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
