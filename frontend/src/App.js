import "./App.css";
import LoginForm from "./LoginForm";
import CanvasBackground from "./CanvasBackground";
import NewsFeed from "./NewsFeed";

function App() {
  const currentPath = window.location.pathname;
  const isNewsPage = currentPath === "/news" || currentPath === "/graph" || currentPath === "/saved";
  const initialView = currentPath === "/graph" ? "graph" : currentPath === "/saved" ? "saved" : "news";

  return (
    <>
      <CanvasBackground />
      {isNewsPage ? <NewsFeed initialView={initialView} /> : <LoginForm />}
    </>
  );
}

export default App;
