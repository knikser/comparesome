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
    <div className="grid gap-4">
      {error ? <div className="error-banner">{error}</div> : null}
      <section className="surface-card p-5">
        <h2 className="page-title">Create user</h2>
        <form onSubmit={onCreateUser}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label className="field-label">Username</label>
              <input
                className={`text-input ${createUserFieldErrors.username ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
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
                <p className="mt-1 text-sm text-red-600">{createUserFieldErrors.username}</p>
              ) : null}
            </div>
            <div className="md:col-span-5">
              <label className="field-label">Password</label>
              <input
                className={`text-input ${createUserFieldErrors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
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
                <p className="mt-1 text-sm text-red-600">{createUserFieldErrors.password}</p>
              ) : null}
            </div>
            <div className="md:col-span-2 md:self-end">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700">
                <input
                  id="admin-user-switch"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                />
                <span>Admin</span>
              </label>
            </div>
            <div className="md:col-span-12">
              <button type="submit" className="primary-btn">
                Create user
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="surface-card p-5">
        <h2 className="page-title">Users</h2>
        <ul className="divide-y divide-slate-100">
          {users.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-3">
              <span>{item.username}</span>
              <div className="flex flex-wrap gap-1">
                {item.isAdmin ? <span className="chip border-blue-200 bg-blue-50 text-blue-700">admin</span> : null}
                {item.mustChangePassword ? (
                  <span className="chip border-amber-200 bg-amber-50 text-amber-700">must change password</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card p-5">
        <h2 className="page-title">Feature flags</h2>
        <ul className="divide-y divide-slate-100">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between gap-3 py-3">
              <span>{flag.key}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`chip ${
                    flag.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'text-slate-500'
                  }`}
                >
                  {flag.enabled ? 'enabled' : 'disabled'}
                </span>
                <button onClick={() => onToggleFlag(flag)} type="button" className="secondary-btn px-3 py-1.5">
                  Toggle
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card p-5">
        <h2 className="page-title">Settings</h2>
        {settings ? (
          <form onSubmit={onUpdateSettings}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <label className="field-label">Max variants per user per comparison</label>
                <input
                  className={`text-input ${settingsFieldErrors.maxVariantsPerUser ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                  type="number"
                  min={1}
                  max={50}
                  value={settings.maxVariantsPerUser}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      maxVariantsPerUser: Number(e.target.value)
                    });
                    setSettingsFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.maxVariantsPerUser;
                      return next;
                    });
                  }}
                />
                {settingsFieldErrors.maxVariantsPerUser ? (
                  <p className="mt-1 text-sm text-red-600">{settingsFieldErrors.maxVariantsPerUser}</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="primary-btn">
                  Save settings
                </button>
              </div>
            </div>
          </form>
        ) : (
          <p>Loading settings...</p>
        )}
      </section>
    </div>
  );
}
