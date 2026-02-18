import './App.css';
import LoginForm from './LoginForm';
import CanvasBackground from './CanvasBackground';
import NewsFeed from './NewsFeed';

function App() {
  const isDashboardPage = window.location.pathname === '/dashboard';

  return (
    <>
      <CanvasBackground />
      {isDashboardPage ? <NewsFeed /> : <LoginForm />}
    </>
  );
}

export default App;
