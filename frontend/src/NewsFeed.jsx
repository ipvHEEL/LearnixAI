import { useEffect, useMemo, useRef, useState } from "react";
import "./NewsFeed.css";

const profileLinks = ["Моя страница", "Новости", "Граф интересов", "Сохраненное", "Заметки", "Понравившиеся"];

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
  { id: "python", label: "Python", x: 50, y: 18 },
  { id: "forntend", label: "Forntend", x: 34, y: 33 },
  { id: "data", label: "Data", x: 66, y: 33 },
  { id: "startup", label: "Стартапы", x: 22, y: 50 },
  { id: "devops", label: "Devops", x: 42, y: 52 },
  { id: "kubernetes", label: "Kuber", x: 58, y: 52 },
  { id: "science", label: "Наука", x: 77, y: 50 },
  { id: "robotics", label: "Робототехника", x: 36, y: 70 },
  { id: "dwh", label: "DWH", x: 64, y: 70 },
  { id: "backend", label: "Backend", x: 50, y: 84 },
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
  const [likedPosts, setLikedPosts] = useState({});
  const [interestingFirst, setInterestingFirst] = useState(true);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [savingInterests, setSavingInterests] = useState(false);
  const [activeView, setActiveView] = useState(initialView);
  const [selectedGraphInterests, setSelectedGraphInterests] = useState([]);
  const [lastViewedPost, setLastViewedPost] = useState(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    country: "",
    city: "",
    avatarImage: "",
  });
  const [profileInterestsInput, setProfileInterestsInput] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

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
    if (link === "Моя страница") {
      setActiveView("profile");
      window.history.replaceState({}, "", "/profile");
    }

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

    if (link === "Понравившиеся") {
      setActiveView("liked");
      window.history.replaceState({}, "", "/liked");
    }

    if (link === "Заметки") {
      setActiveView("notes");
      window.history.replaceState({}, "", "/notes");
    }
  };

  const loadNewsAndInterests = async () => {
    setLoading(true);
    setError("");

    try {
      const authHeaders = getAuthHeaders();
      const requestMap = {
        profile: fetch("http://127.0.0.1:8000/profile", {
          headers: authHeaders,
        }),
        interests: fetch("http://127.0.0.1:8000/interests", {
          headers: authHeaders,
        }),
        lastViewed: fetch("http://127.0.0.1:8000/session/last-viewed-post", {
          headers: authHeaders,
        }),
        savedPosts: fetch("http://127.0.0.1:8000/saved-posts", {
          headers: authHeaders,
        }),
        likedPosts: fetch("http://127.0.0.1:8000/liked-posts", {
          headers: authHeaders,
        }),
        notes: fetch("http://127.0.0.1:8000/notes", {
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

      const profileRes = responsesByKey.profile;
      if (profileRes?.ok) {
        const profileData = await profileRes.json();
        setProfileForm({
          firstName: profileData.first_name ?? "",
          lastName: profileData.last_name ?? "",
          country: profileData.country ?? "",
          city: profileData.city ?? "",
          avatarImage: profileData.avatar_image ?? "",
        });
        setProfileInterestsInput((profileData.interests ?? []).join(", "));
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

      const likedPostsRes = responsesByKey.likedPosts;
      if (likedPostsRes?.ok) {
        const likedPostsData = await likedPostsRes.json();
        const mapped = (likedPostsData.liked_posts ?? []).reduce((acc, item) => {
          acc[item.post_id] = {
            id: item.post_id,
            category: item.post_category ?? "Лайкнуто",
            title: item.post_title ?? "Без названия",
            summary: item.post_summary ?? "",
            source: item.post_source ?? "Источник",
            time: item.post_time ?? "Без даты",
            color: item.post_color ?? cardGradients[0],
            relevanceScore: item.relevance_score ?? 0,
            url: item.post_url ?? "#",
            likedAt: item.liked_at ?? "",
          };
          return acc;
        }, {});
        setLikedPosts(mapped);
        setLikes((prev) => {
          const negativeOnly = Object.entries(prev).reduce((acc, [id, value]) => {
            if (value === -1) {
              acc[id] = -1;
            }
            return acc;
          }, {});

          Object.keys(mapped).forEach((id) => {
            negativeOnly[id] = 1;
          });

          return negativeOnly;
        });
      } else if (activeView === "liked") {
        setError("Не удалось загрузить лайкнутые посты");
      }

      const notesRes = responsesByKey.notes;
      if (notesRes?.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes ?? "");
      } else if (activeView === "notes") {
        setError("Не удалось загрузить заметки");
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

  const likedNews = useMemo(
    () =>
      Object.values(likedPosts).sort((a, b) => {
        const aTs = a.likedAt ? new Date(a.likedAt).getTime() : 0;
        const bTs = b.likedAt ? new Date(b.likedAt).getTime() : 0;
        return bTs - aTs;
      }),
    [likedPosts],
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

  const toggleLike = async (newsItem) => {
    const isLiked = Boolean(likedPosts[newsItem.id]);

    try {
      const authHeaders = getAuthHeaders();
      if (isLiked) {
        const deleteRes = await fetch(`http://127.0.0.1:8000/liked-posts?post_id=${encodeURIComponent(newsItem.id)}`, {
          method: "DELETE",
          headers: authHeaders,
        });

        if (!deleteRes.ok && deleteRes.status !== 404) {
          throw new Error("Не удалось удалить пост из лайкнутых");
        }

        setLikedPosts((prev) => {
          const next = { ...prev };
          delete next[newsItem.id];
          return next;
        });
        setLikes((prev) => ({ ...prev, [newsItem.id]: 0 }));
        return;
      }

      const likeRes = await fetch("http://127.0.0.1:8000/liked-posts", {
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

      if (!likeRes.ok) {
        throw new Error("Не удалось лайкнуть пост");
      }

      setLikedPosts((prev) => ({
        ...prev,
        [newsItem.id]: {
          ...newsItem,
          likedAt: new Date().toISOString(),
        },
      }));
      setLikes((prev) => ({ ...prev, [newsItem.id]: 1 }));
    } catch (likeError) {
      console.error(likeError);
      if (likeError.message === "NO_AUTH_TOKEN") {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
        return;
      }
      setError("Не удалось обновить лайкнутые посты");
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

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/notes", {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("userId");
          window.location.href = "/";
          return;
        }
        throw new Error("Не удалось сохранить заметки");
      }
    } catch (saveError) {
      console.error(saveError);
      if (saveError.message === "NO_AUTH_TOKEN") {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
        return;
      }
      setError("Не удалось сохранить заметки");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError("");
    try {
      const parsedInterests = profileInterestsInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const res = await fetch("http://127.0.0.1:8000/profile", {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          first_name: profileForm.firstName,
          last_name: profileForm.lastName,
          country: profileForm.country,
          city: profileForm.city,
          interests: parsedInterests,
          avatar_image: profileForm.avatarImage,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("jwtToken");
          localStorage.removeItem("userId");
          window.location.href = "/";
          return;
        }
        throw new Error("Не удалось сохранить профиль");
      }

      setInterestsInput(parsedInterests.join(", "));
      await loadNewsAndInterests();
    } catch (saveError) {
      console.error(saveError);
      if (saveError.message === "NO_AUTH_TOKEN") {
        localStorage.removeItem("jwtToken");
        localStorage.removeItem("userId");
        window.location.href = "/";
        return;
      }
      setError("Не удалось сохранить профиль пользователя");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Можно загрузить только изображение");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({ ...prev, avatarImage: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="news-feed-page">
      <div className="news-layout">
        <aside className="nav-panel left-panel" aria-label="Навигация профиля">
          {profileLinks.map((link) => (
            <button
              key={link}
              className={`panel-link ${
                (activeView === "news" && link === "Новости") ||
                (activeView === "profile" && link === "Моя страница") ||
                (activeView === "graph" && link === "Граф интересов") ||
                (activeView === "saved" && link === "Сохраненное") ||
                (activeView === "notes" && link === "Заметки") ||
                (activeView === "liked" && link === "Понравившиеся")
                  ? "active"
                  : ""
              }`}
              type="button"
              onClick={() => handleNavigationClick(link)}
            >
              {link}
            </button>
          ))}
        </aside>

        <section className="news-main" aria-label="Лента новостей в стиле TikTok">
          <header className="news-feed-header">
            <h1>
              {activeView === "news"
                ? "Лента новостей"
                : activeView === "profile"
                  ? "Профиль пользователя"
                : activeView === "graph"
                  ? "Граф интересов"
                  : activeView === "saved"
                    ? "Сохраненное"
                    : activeView === "notes"
                      ? "Заметки"
                      : "Понравившиеся"}
            </h1>
            <p>
              {activeView === "news"
                ? "Свайпай вверх/вниз или прокручивай колесом мыши"
                : activeView === "profile"
                  ? "Укажите фамилию и имя, страну/город и сферу научных или профессиональных интересов"
                : activeView === "graph"
                  ? "Полноразмерное окно графа, сопоставимое по размеру с лентой"
                  : activeView === "saved"
                    ? "Посты, которые вы добавили в сохраненное"
                    : activeView === "notes"
                      ? "Личные заметки пользователя с сохранением в базе"
                      : "Посты, которым вы поставили лайк"}
            </p>
            {activeView === "news" && <span className="news-feed-counter">Реакций: {totalLikes}</span>}
            {activeView === "saved" && <span className="news-feed-counter">Сохранено: {savedNews.length}</span>}
            {activeView === "liked" && <span className="news-feed-counter">Лайкнуто: {likedNews.length}</span>}
            {activeView === "notes" && <span className="news-feed-counter">Символов: {notes.length}</span>}
            {activeView === "news" && lastViewedPost?.post_url && (
              <a className="last-viewed-link" href={lastViewedPost.post_url} target="_blank" rel="noreferrer">
                Продолжить: {lastViewedPost.post_title ?? "Последний просмотренный пост"}
              </a>
            )}
          </header>

          {activeView === "profile" && (
            <section className="profile-shell" aria-label="Профиль пользователя">
              {error && <p className="news-state news-state-error">{error}</p>}
              <div className="profile-cover" />
              <div className="profile-main">
                <div className="profile-avatar-wrap">
                  {profileForm.avatarImage ? (
                    <img src={profileForm.avatarImage} alt="Личное фото" className="profile-avatar-image" />
                  ) : (
                    <div className="profile-avatar-placeholder">Фото</div>
                  )}
                  <label className="profile-avatar-upload">
                    + Фото
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                  </label>
                </div>

                <div className="profile-fields">
                  <div className="profile-grid">
                    <label>
                      Имя
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, firstName: event.target.value }))}
                        placeholder="Введите имя"
                      />
                    </label>
                    <label>
                      Фамилия
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, lastName: event.target.value }))}
                        placeholder="Введите фамилию"
                      />
                    </label>
                    <label>
                      Страна
                      <input
                        type="text"
                        value={profileForm.country}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, country: event.target.value }))}
                        placeholder="Например, Россия"
                      />
                    </label>
                    <label>
                      Город
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))}
                        placeholder="Например, Казань"
                      />
                    </label>
                  </div>
                  <label style={{ display: "block", marginTop: "12px" }}>
                    Сфера научных/профессиональных интересов
                    <textarea
                      value={profileInterestsInput}
                      onChange={(event) => setProfileInterestsInput(event.target.value)}
                      placeholder="Например: ML, биоинформатика, DevOps"
                      rows={4}
                    />
                  </label>
                </div>
              </div>
              <button type="button" className="notes-save-button profile-save-button" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? "Сохранение..." : "Сохранить профиль"}
              </button>
            </section>
          )}

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
                        onClick={() => toggleLike(newsItem)}
                        aria-label="Нравится"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        className={currentLike === -1 ? "active" : ""}
                        onClick={async () => {
                          if (likedPosts[newsItem.id]) {
                            await toggleLike(newsItem);
                          }
                          updateLike(newsItem.id, currentLike === -1 ? 0 : -1);
                        }}
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
                            onClick={() => toggleLike(newsItem)}
                            aria-label="Нравится"
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            className={currentLike === -1 ? "active" : ""}
                            onClick={async () => {
                              if (likedPosts[newsItem.id]) {
                                await toggleLike(newsItem);
                              }
                              updateLike(newsItem.id, currentLike === -1 ? 0 : -1);
                            }}
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

          {activeView === "liked" && (
            <>
              {loading && <p className="news-state">Загрузка лайкнутых постов...</p>}
              {error && <p className="news-state news-state-error">{error}</p>}
              {!loading && likedNews.length === 0 && <p className="news-state">Вы пока не лайкнули ни одного поста.</p>}
              {!loading && likedNews.length > 0 && (
                <div className="news-feed">
                  {likedNews.map((newsItem) => {
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

                        <aside className="news-actions" aria-label="Действия с лайкнутой новостью">
                          <button type="button" className="active" onClick={() => toggleLike(newsItem)} aria-label="Убрать лайк">
                            👍
                          </button>
                          <button
                            type="button"
                            className={isSaved ? "active" : ""}
                            onClick={() => toggleSave(newsItem)}
                            aria-label={isSaved ? "Убрать из сохраненного" : "Сохранить"}
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

          {activeView === "notes" && (
            <section className="notes-panel" aria-label="Личные заметки">
              {loading && <p className="news-state">Загрузка заметок...</p>}
              {!loading && (
                <>
                  {error && <p className="news-state news-state-error">{error}</p>}
                  <textarea
                    className="notes-textarea"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Оставьте здесь свои мысли..."
                    rows={18}
                  />
                  <button type="button" className="notes-save-button" onClick={handleSaveNotes} disabled={savingNotes}>
                    {savingNotes ? "Сохранение..." : "Сохранить заметки"}
                  </button>
                </>
              )}
            </section>
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
