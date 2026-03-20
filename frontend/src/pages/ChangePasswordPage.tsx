import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function ChangePasswordPage() {
  const { token, user, login } = useAuth();
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
      const message = err instanceof ApiError ? err.message : 'Password change failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <form className="surface-card w-full max-w-md p-6 sm:p-7" onSubmit={onSubmit}>
        <h2 className="mb-1 text-2xl font-semibold text-slate-900">Change your password</h2>
        <p className="text-subtle mb-5">First login requires changing the default admin password.</p>
        <div className="mb-4">
          <label className="field-label">Current password</label>
          <input
            className="text-input"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="mb-4">
          <label className="field-label">New password (min 6 chars)</label>
          <input
            className="text-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <button disabled={loading} type="submit" className="primary-btn mt-4 w-full">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
