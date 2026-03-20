import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="container py-4 app-shell">
      <header className="top-nav px-3 py-3 mb-4">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <div>
            <p className="mb-0 fw-semibold text-primary-emphasis">{t('app.title')}</p>
            <h1 className="h4 mb-0">{t('app.subtitle')}</h1>
          </div>
          <nav className="nav nav-pills gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.dashboard')}
            </NavLink>
            <NavLink
              to="/comparisons"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.comparisons')}
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {t('nav.settings')}
            </NavLink>
            {user?.isAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {t('nav.admin')}
              </NavLink>
            ) : null}
          </nav>
          <div className="d-flex align-items-center gap-2">
            <span className="badge text-bg-light border">{user?.username}</span>
            <button onClick={onLogout} type="button" className="btn btn-outline-secondary btn-sm">
              {t('nav.logout')}
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
