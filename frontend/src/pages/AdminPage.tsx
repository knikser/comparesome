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
    try {
      await api.adminCreateUser(token, username, password, isAdmin);
      setUsername('');
      setPassword('');
      setIsAdmin(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create user');
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
    try {
      const next = await api.adminUpdateSettings(token, settings.maxVariantsPerUser);
      setSettings(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update settings');
    }
  };

  return (
    <div className="stack">
      {error ? <p className="error">{error}</p> : null}
      <section className="card">
        <h2>Create user</h2>
        <form onSubmit={onCreateUser} className="grid two-columns">
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            Admin user
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          </label>
          <div>
            <button type="submit">Create user</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Users</h2>
        <ul>
          {users.map((item) => (
            <li key={item.id}>
              {item.username} {item.isAdmin ? '(admin)' : ''} {item.mustChangePassword ? ' [must change password]' : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Feature flags</h2>
        <ul>
          {flags.map((flag) => (
            <li key={flag.key}>
              {flag.key} - {flag.enabled ? 'enabled' : 'disabled'}{' '}
              <button onClick={() => onToggleFlag(flag)}>Toggle</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Settings</h2>
        {settings ? (
          <form onSubmit={onUpdateSettings} className="grid two-columns">
            <label>
              Max variants per user per comparison
              <input
                type="number"
                min={1}
                max={50}
                value={settings.maxVariantsPerUser}
                onChange={(e) => setSettings({ ...settings, maxVariantsPerUser: Number(e.target.value) })}
              />
            </label>
            <div>
              <button type="submit">Save settings</button>
            </div>
          </form>
        ) : (
          <p>Loading settings...</p>
        )}
      </section>
    </div>
  );
}
