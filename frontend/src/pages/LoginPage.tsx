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
      const message = err instanceof ApiError ? err.message : 'Unknown login error';
      setError(message);
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
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="mb-4">
          <label className="field-label">Password</label>
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <button disabled={loading} type="submit" className="primary-btn mt-4 w-full">
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
