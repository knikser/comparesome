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
    <div className="auth-screen">
      <form className="card section-card auth-card p-4" onSubmit={onSubmit}>
        <h2 className="h4 mb-1">Change your password</h2>
        <p className="subtle-text mb-4">First login requires changing the default admin password.</p>
        <div className="mb-3">
          <label className="form-label">Current password</label>
          <input
            className={`form-control ${fieldErrors.oldPassword ? 'is-invalid' : ''}`}
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
          {fieldErrors.oldPassword ? <div className="invalid-feedback">{fieldErrors.oldPassword}</div> : null}
        </div>
        <div className="mb-3">
          <label className="form-label">New password (min 6 chars)</label>
          <input
            className={`form-control ${fieldErrors.newPassword ? 'is-invalid' : ''}`}
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
          {fieldErrors.newPassword ? <div className="invalid-feedback">{fieldErrors.newPassword}</div> : null}
        </div>
        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        <button disabled={loading} type="submit" className="btn btn-primary w-100 mt-2">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
