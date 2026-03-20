import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Comparison, User } from '../types/api';

export function ComparisonsPage() {
  const { token, user } = useAuth();
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) {
      return;
    }
    try {
      const [cmpRes, userRes] = await Promise.all([api.comparisons(token), api.users(token)]);
      setComparisons(cmpRes.comparisons);
      setUsers(userRes.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load comparisons');
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const availableUsers = useMemo(
    () => users.filter((candidate) => candidate.id !== user?.id),
    [users, user?.id]
  );

  const toggleUser = (id: number) => {
    setSelectedUsers((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.createComparison(token, name, selectedUsers);
      setName('');
      setSelectedUsers([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create comparison');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section>
        <div className="surface-card h-full p-5">
          <h2 className="page-title">Create comparison entity</h2>
          <p className="text-subtle mb-4">Example entity: flats, jobs, suppliers, etc.</p>
          <form onSubmit={onCreate}>
            <div className="mb-4">
              <label className="field-label">Entity name</label>
              <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <p className="mb-2 text-sm font-medium text-slate-700">Select up to 4 additional participants:</p>
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {availableUsers.map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/60"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                    checked={selectedUsers.includes(candidate.id)}
                    onChange={() => toggleUser(candidate.id)}
                  />
                  <span>{candidate.username}</span>
                </label>
              ))}
            </div>
            <div className="mb-4">
              <span className="chip">
                Selected users: {selectedUsers.length}/4 (you are included automatically)
              </span>
            </div>
            {error ? <div className="error-banner mb-4">{error}</div> : null}
            <button disabled={loading} type="submit" className="primary-btn">
              {loading ? 'Creating...' : 'Create comparison'}
            </button>
          </form>
        </div>
      </section>

      <section>
        <div className="surface-card h-full p-5">
          <h2 className="page-title">Your comparisons</h2>
          {comparisons.length === 0 ? <p>No comparisons created yet.</p> : null}
          <ul className="divide-y divide-slate-100">
            {comparisons.map((cmp) => (
              <li key={cmp.id} className="flex items-center justify-between gap-2 py-3">
                <Link className="link" to={`/comparisons/${cmp.id}`}>
                  {cmp.name}
                </Link>
                <span className="chip">{cmp.variantsCount} variants</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
