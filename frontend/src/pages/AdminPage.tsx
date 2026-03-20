import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { FeatureFlag, Settings, User } from '../types/api';

export function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [createUserFieldErrors, setCreateUserFieldErrors] = useState<Record<string, string>>({});
  const [settingsFieldErrors, setSettingsFieldErrors] = useState<Record<string, string>>({});

  const load = async () => {
    if (!token) {
      return;
    }
    try {
      const [usersRes, flagsRes, settingsRes] = await Promise.all([
        api.adminUsers(token),
        api.adminFlags(token),
        api.adminSettings(token)
      ]);
      setUsers(usersRes.users);
      setFlags(flagsRes.flags);
      setSettings(settingsRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load admin panel');
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const onCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      return;
    }
    setCreateUserFieldErrors({});
    try {
      await api.adminCreateUser(token, username, password, isAdmin);
      setUsername('');
      setPassword('');
      setIsAdmin(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
      setCreateUserFieldErrors(err instanceof ApiError ? err.fieldErrors : {});
    }
  };

  const onToggleFlag = async (flag: FeatureFlag) => {
    if (!token) {
      return;
    }
    try {
      await api.adminUpdateFlag(token, flag.key, !flag.enabled);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update feature flag');
    }
  };

  const onUpdateSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !settings) {
      return;
    }
    setSettingsFieldErrors({});
    try {
      const next = await api.adminUpdateSettings(token, settings.maxVariantsPerUser);
      setSettings(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update settings');
      setSettingsFieldErrors(err instanceof ApiError ? err.fieldErrors : {});
    }
  };

  return (
    <div className="d-grid gap-4">
      {error ? <div className="alert alert-danger mb-0">{error}</div> : null}
      <section className="card section-card">
        <div className="card-body">
          <h2 className="h5 page-title">Create user</h2>
          <form onSubmit={onCreateUser}>
            <div className="row g-3">
              <div className="col-12 col-md-5">
                <label className="form-label">Username</label>
                <input
                  className={`form-control ${createUserFieldErrors.username ? 'is-invalid' : ''}`}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setCreateUserFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.username;
                      return next;
                    });
                  }}
                  required
                />
                {createUserFieldErrors.username ? (
                  <div className="invalid-feedback">{createUserFieldErrors.username}</div>
                ) : null}
              </div>
              <div className="col-12 col-md-5">
                <label className="form-label">Password</label>
                <input
                  className={`form-control ${createUserFieldErrors.password ? 'is-invalid' : ''}`}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setCreateUserFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                  }}
                  required
                />
                {createUserFieldErrors.password ? (
                  <div className="invalid-feedback">{createUserFieldErrors.password}</div>
                ) : null}
              </div>
              <div className="col-12 col-md-2 d-flex align-items-end">
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    id="admin-user-switch"
                    type="checkbox"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="admin-user-switch">
                    Admin
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-primary">
                  Create user
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="card section-card">
        <div className="card-body">
          <h2 className="h5 page-title">Users</h2>
          <ul className="list-group list-group-flush">
            {users.map((item) => (
              <li key={item.id} className="list-group-item px-0 d-flex justify-content-between gap-2">
                <span>{item.username}</span>
                <div className="d-flex flex-wrap gap-1">
                  {item.isAdmin ? <span className="badge text-bg-primary">admin</span> : null}
                  {item.mustChangePassword ? <span className="badge text-bg-warning">must change password</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card section-card">
        <div className="card-body">
          <h2 className="h5 page-title">Feature flags</h2>
          <ul className="list-group list-group-flush">
            {flags.map((flag) => (
              <li key={flag.key} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                <span>{flag.key}</span>
                <div className="d-flex align-items-center gap-2">
                  <span className={`badge ${flag.enabled ? 'text-bg-success' : 'text-bg-secondary'}`}>
                    {flag.enabled ? 'enabled' : 'disabled'}
                  </span>
                  <button onClick={() => onToggleFlag(flag)} type="button" className="btn btn-sm btn-outline-secondary">
                    Toggle
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card section-card">
        <div className="card-body">
          <h2 className="h5 page-title">Settings</h2>
          {settings ? (
            <form onSubmit={onUpdateSettings}>
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-5">
                  <label className="form-label">Max variants per user per comparison</label>
                  <input
                    className={`form-control ${settingsFieldErrors.maxVariantsPerUser ? 'is-invalid' : ''}`}
                    type="number"
                    min={1}
                    max={50}
                    value={settings.maxVariantsPerUser}
                    onChange={(e) =>
                      {
                        setSettings({
                          ...settings,
                          maxVariantsPerUser: Number(e.target.value)
                        });
                        setSettingsFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.maxVariantsPerUser;
                          return next;
                        });
                      }
                    }
                  />
                  {settingsFieldErrors.maxVariantsPerUser ? (
                    <div className="invalid-feedback">{settingsFieldErrors.maxVariantsPerUser}</div>
                  ) : null}
                </div>
                <div className="col-12 col-md-auto">
                  <button type="submit" className="btn btn-primary">
                    Save settings
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <p className="mb-0">Loading settings...</p>
          )}
        </div>
      </section>
    </div>
  );
}
