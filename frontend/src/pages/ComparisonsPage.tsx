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
    <div className="grid two-columns">
      <section className="card">
        <h2>Create comparison entity</h2>
        <form onSubmit={onCreate}>
          <label>
            Entity name (e.g., Flats)
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <p>Select up to 4 additional participants (max total 5 including you):</p>
          <div className="checkbox-grid">
            {availableUsers.map((candidate) => (
              <label key={candidate.id}>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(candidate.id)}
                  onChange={() => toggleUser(candidate.id)}
                />
                {candidate.username}
              </label>
            ))}
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button disabled={loading} type="submit">
            {loading ? 'Creating...' : 'Create comparison'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Your comparisons</h2>
        <ul>
          {comparisons.map((cmp) => (
            <li key={cmp.id}>
              <Link to={`/comparisons/${cmp.id}`}>{cmp.name}</Link> | variants: {cmp.variantsCount}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
