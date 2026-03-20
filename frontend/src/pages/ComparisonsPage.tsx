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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.participantIds;
      return next;
    });
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      return;
    }
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      await api.createComparison(token, name, selectedUsers);
      setName('');
      setSelectedUsers([]);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('comparisons.createError'));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors : {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section>
        <div className="surface-card h-full p-5">
          <h2 className="page-title">{t('comparisons.createTitle')}</h2>
          <p className="text-subtle mb-4">{t('comparisons.createHint')}</p>
          <form onSubmit={onCreate}>
            <div className="mb-4">
              <label className="field-label">{t('comparisons.entityName')}</label>
              <input
                className={`text-input ${fieldErrors.name ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }}
                required
              />
              {fieldErrors.name ? <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p> : null}
            </div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t('comparisons.selectUsers')}</p>
            <div
              className={`mb-4 grid grid-cols-1 gap-2 rounded-xl p-2 sm:grid-cols-2 ${fieldErrors.participantIds ? 'border border-red-200 bg-red-50/50' : ''}`}
            >
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
            {fieldErrors.participantIds ? <p className="mb-3 text-sm text-red-600">{fieldErrors.participantIds}</p> : null}
            <div className="mb-4">
              <span className="chip">{t('comparisons.selectedUsers', { selected: selectedUsers.length })}</span>
            </div>
            {error ? <div className="error-banner mb-4">{error}</div> : null}
            <button disabled={loading} type="submit" className="primary-btn">
              {loading ? t('comparisons.creating') : t('comparisons.create')}
            </button>
          </form>
        </div>
      </section>

      <section>
        <div className="surface-card h-full p-5">
          <h2 className="page-title">{t('comparisons.listTitle')}</h2>
          {comparisons.length === 0 ? <p>{t('comparisons.empty')}</p> : null}
          <ul className="divide-y divide-slate-100">
            {comparisons.map((cmp) => (
              <li key={cmp.id} className="flex items-center justify-between gap-2 py-3">
                <Link className="link" to={`/comparisons/${cmp.id}`}>
                  {cmp.name}
                </Link>
                <span className="chip">{t('comparisons.variantsCount', { count: cmp.variantsCount })}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
