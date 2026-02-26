import "./App.css";
import LoginForm from "./LoginForm";
import CanvasBackground from "./CanvasBackground";
import NewsFeed from "./NewsFeed";

function App() {
  const isNewsPage = window.location.pathname === "/news";

  return (
    <>
      <CanvasBackground />
      {isNewsPage ? <NewsFeed /> : <LoginForm />}
    </>
  );
}

export default App;
