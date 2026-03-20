import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';

export function ChangePasswordPage() {
  const { token, user, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('admin');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.changePassword(token, oldPassword, newPassword);
      login(response.token, response.user);
      navigate('/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('changePassword.error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="card section-card auth-card p-4" onSubmit={onSubmit}>
        <h2 className="h4 mb-1">{t('changePassword.title')}</h2>
        <p className="subtle-text mb-4">{t('changePassword.hint')}</p>
        <div className="mb-3">
          <label className="form-label">{t('changePassword.current')}</label>
          <input
            className="form-control"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">{t('changePassword.new')}</label>
          <input
            className="form-control"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        <button disabled={loading} type="submit" className="btn btn-primary w-100 mt-2">
          {loading ? t('changePassword.submitting') : t('changePassword.submit')}
        </button>
      </form>
    </div>
  );
}
