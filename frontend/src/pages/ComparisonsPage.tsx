import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import type { Comparison, User } from '../types/api';

export function ComparisonsPage() {
  const { token, user } = useAuth();
  const { t } = useLanguage();
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
      setError(err instanceof ApiError ? err.message : t('comparisons.loadError'));
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
      setError(err instanceof ApiError ? err.message : t('comparisons.createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row g-4">
      <section className="col-12 col-xl-6">
        <div className="card section-card h-100">
          <div className="card-body">
            <h2 className="h5 page-title">{t('comparisons.createTitle')}</h2>
            <p className="subtle-text">{t('comparisons.createHint')}</p>
            <form onSubmit={onCreate}>
              <div className="mb-3">
                <label className="form-label">{t('comparisons.entityName')}</label>
                <input
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <p className="mb-2">{t('comparisons.selectUsers')}</p>
              <div className="row row-cols-1 row-cols-md-2 g-2 mb-3">
                {availableUsers.map((candidate) => (
                  <div className="col" key={candidate.id}>
                    <label className="form-check border rounded px-3 py-2 w-100">
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={selectedUsers.includes(candidate.id)}
                        onChange={() => toggleUser(candidate.id)}
                      />
                      <span className="form-check-label">{candidate.username}</span>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <span className="badge text-bg-light border">
                  {t('comparisons.selectedUsers', { selected: selectedUsers.length })}
                </span>
              </div>
              {error ? <div className="alert alert-danger py-2">{error}</div> : null}
              <button disabled={loading} type="submit" className="btn btn-primary">
                {loading ? t('comparisons.creating') : t('comparisons.create')}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="col-12 col-xl-6">
        <div className="card section-card h-100">
          <div className="card-body">
            <h2 className="h5 page-title">{t('comparisons.listTitle')}</h2>
            {comparisons.length === 0 ? <p className="mb-0">{t('comparisons.empty')}</p> : null}
            <ul className="list-group list-group-flush">
              {comparisons.map((cmp) => (
                <li key={cmp.id} className="list-group-item px-0 d-flex justify-content-between gap-2">
                  <Link to={`/comparisons/${cmp.id}`}>{cmp.name}</Link>
                  <span className="badge rounded-pill text-bg-light border">
                    {t('comparisons.variantsCount', { count: cmp.variantsCount })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
