import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      const response = await api.login(username, password);
      auth.login(response.token, response.user);
      navigate(response.user.mustChangePassword ? '/change-password' : '/');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unknown login error';
      setError(message);
      setFieldErrors(err instanceof ApiError ? err.fieldErrors : {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="card section-card auth-card p-4" onSubmit={onSubmit}>
        <h2 className="h4 mb-1">Welcome back</h2>
        <p className="subtle-text mb-4">Default admin credentials: admin / admin</p>
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input
            className={`form-control ${fieldErrors.username ? 'is-invalid' : ''}`}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.username;
                return next;
              });
            }}
            autoComplete="username"
          />
          {fieldErrors.username ? <div className="invalid-feedback">{fieldErrors.username}</div> : null}
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => {
                const next = { ...prev };
                delete next.password;
                return next;
              });
            }}
            autoComplete="current-password"
          />
          {fieldErrors.password ? <div className="invalid-feedback">{fieldErrors.password}</div> : null}
        </div>
        {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        <button disabled={loading} type="submit" className="btn btn-primary w-100 mt-2">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
