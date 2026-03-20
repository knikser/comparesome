import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
    }`;

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <header className="surface-card mb-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">сравнилка</p>
            <h1 className="text-2xl font-bold text-slate-900">Decision workspace</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/comparisons" className={navLinkClass}>
              Comparisons
            </NavLink>
            {user?.isAdmin ? (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            ) : null}
          </nav>
          <div className="flex items-center gap-2">
            <span className="chip">{user?.username}</span>
            <button onClick={onLogout} type="button" className="secondary-btn px-3 py-1.5">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
