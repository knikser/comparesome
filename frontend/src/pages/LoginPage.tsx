import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.login(username, password);
      auth.login(response.token, response.user);
      navigate(response.user.mustChangePassword ? '/change-password' : '/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('login.error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="card section-card auth-card p-4" onSubmit={onSubmit}>
        <h2 className="h4 mb-1">{t('login.title')}</h2>
        <p className="subtle-text mb-4">{t('login.hint')}</p>
        <div className="mb-3">
          <label className="form-label">{t('login.username')}</label>
          <input
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">{t('login.password')}</label>
          <input
            className="form-control"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        <button disabled={loading} type="submit" className="btn btn-primary w-100 mt-2">
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}
