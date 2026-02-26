import "./App.css";
import LoginForm from "./LoginForm";
import CanvasBackground from "./CanvasBackground";
import NewsFeed from "./NewsFeed";

function App() {
  const currentPath = window.location.pathname;
  const isNewsPage = currentPath === "/news" || currentPath === "/graph";
  const initialView = currentPath === "/graph" ? "graph" : "news";

  return (
    <>
      <CanvasBackground />
      {isNewsPage ? <NewsFeed initialView={initialView} /> : <LoginForm />}
    </>
  );
}

export default App;
