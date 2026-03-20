import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page">
      <header className="header">
        <h1>CompaResome</h1>
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/comparisons">Comparisons</Link>
          {user?.isAdmin ? <Link to="/admin">Admin</Link> : null}
        </nav>
        <div className="user-box">
          <span>{user?.username}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
