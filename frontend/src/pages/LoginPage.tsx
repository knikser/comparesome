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
    <div className="flex min-h-screen items-center justify-center p-5">
      <form className="surface-card w-full max-w-md p-6 sm:p-7" onSubmit={onSubmit}>
        <h2 className="mb-1 text-2xl font-semibold text-slate-900">Welcome back</h2>
        <p className="text-subtle mb-5">Default admin credentials: admin / admin</p>
        <div className="mb-4">
          <label className="field-label">Username</label>
          <input
            className={`text-input ${fieldErrors.username ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
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
          {fieldErrors.username ? <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p> : null}
        </div>
        <div className="mb-4">
          <label className="field-label">Password</label>
          <input
            className={`text-input ${fieldErrors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
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
          {fieldErrors.password ? <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p> : null}
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <button disabled={loading} type="submit" className="primary-btn mt-4 w-full">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
