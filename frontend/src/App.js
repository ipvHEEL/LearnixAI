import "./App.css";
import LoginForm from "./LoginForm";
import CanvasBackground from "./CanvasBackground";
import NewsFeed from "./NewsFeed";

function App() {
  const currentPath = window.location.pathname;
  const isNewsPage =
    currentPath === "/profile" ||
    currentPath === "/news" ||
    currentPath === "/search" ||
    currentPath === "/graph" ||
    currentPath === "/saved" ||
    currentPath === "/liked" ||
    currentPath === "/notes";
  const initialView =
    currentPath === "/profile"
      ? "profile"
      : currentPath === "/search"
        ? "search"
      : currentPath === "/graph"
      ? "graph"
      : currentPath === "/saved"
        ? "saved"
        : currentPath === "/liked"
          ? "liked"
          : currentPath === "/notes"
            ? "notes"
            : "news";

  return (
    <>
      <CanvasBackground />
      {isNewsPage ? <NewsFeed initialView={initialView} /> : <LoginForm />}
    </>
  );
}

export default App;
