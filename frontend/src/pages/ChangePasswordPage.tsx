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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    setFieldErrors({});
    try {
      const response = await api.changePassword(token, oldPassword, newPassword);
      login(response.token, response.user);
      navigate('/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Password change failed';
      setError(message);
      setFieldErrors(err instanceof ApiError ? err.fieldErrors : {});
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
            className={`text-input ${fieldErrors.oldPassword ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
            type="password"
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.oldPassword;
                return next;
              });
            }}
            autoComplete="current-password"
          />
          {fieldErrors.oldPassword ? <p className="mt-1 text-sm text-red-600">{fieldErrors.oldPassword}</p> : null}
        </div>
        <div className="mb-4">
          <label className="field-label">New password (min 6 chars)</label>
          <input
            className={`text-input ${fieldErrors.newPassword ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
            type="password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.newPassword;
                return next;
              });
            }}
            autoComplete="new-password"
          />
          {fieldErrors.newPassword ? <p className="mt-1 text-sm text-red-600">{fieldErrors.newPassword}</p> : null}
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <button disabled={loading} type="submit" className="primary-btn mt-4 w-full">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
