import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ComparisonDetail, Variant } from '../types/api';

function ExistingRating({ variant, username }: { variant: Variant; username?: string }) {
  const mine = variant.ratings.find((r) => r.username === username);
  if (!mine) {
    return <p className="text-subtle mb-2">No personal rating yet.</p>;
  }
  return (
    <p className="text-subtle mb-2">
      Your rank: {mine.rank} · Pros: {mine.pros || '-'} · Cons: {mine.cons || '-'}
    </p>
  );
}

export function ComparisonDetailPage() {
  const { token, user } = useAuth();
  const params = useParams();
  const comparisonId = Number(params.id);
  const [detail, setDetail] = useState<ComparisonDetail | null>(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creatingVariant, setCreatingVariant] = useState(false);

  const load = async () => {
    if (!token || Number.isNaN(comparisonId)) {
      return;
    }
    try {
      const data = await api.comparisonDetail(token, comparisonId);
      setDetail(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load comparison');
    }
  };

  useEffect(() => {
    load();
  }, [token, comparisonId]);

  const onCreateVariant = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      return;
    }
    setCreatingVariant(true);
    try {
      await api.createVariant(token, comparisonId, title, description);
      setTitle('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add variant');
    } finally {
      setCreatingVariant(false);
    }
  };

  const onRateVariant = async (variantId: number, rank: number, pros: string, cons: string) => {
    if (!token) {
      return;
    }
    try {
      await api.rateVariant(token, variantId, rank, pros, cons);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to rate variant');
    }
  };

  if (error) {
    return <div className="error-banner">{error}</div>;
  }
  if (!detail) {
    return <div className="loading-banner">Loading comparison...</div>;
  }

  return (
    <div className="grid gap-4">
      <section className="surface-card p-5">
        <h2 className="mb-1 text-2xl font-semibold text-slate-900">{detail.comparison.name}</h2>
        <p className="text-subtle">Participants: {detail.participants.map((p) => p.username).join(', ')}</p>
      </section>

      <section className="surface-card p-5">
        <h3 className="page-title">Add variant</h3>
        <form onSubmit={onCreateVariant}>
          <div className="mb-4">
            <label className="field-label">Variant title</label>
            <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="mb-4">
            <label className="field-label">Description</label>
            <textarea
              className="text-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="primary-btn" disabled={creatingVariant}>
            {creatingVariant ? 'Adding...' : 'Add variant'}
          </button>
        </form>
      </section>

      <section className="surface-card p-5">
        <h3 className="page-title">Variants</h3>
        {detail.variants.length === 0 ? <p>No variants yet.</p> : null}
        <div className="grid gap-3">
          {detail.variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              username={user?.username}
              onRateVariant={onRateVariant}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function VariantCard({
  variant,
  username,
  onRateVariant
}: {
  variant: Variant;
  username?: string;
  onRateVariant: (variantId: number, rank: number, pros: string, cons: string) => Promise<void>;
}) {
  const [rank, setRank] = useState(variant.ratings.find((r) => r.username === username)?.rank ?? 5);
  const [pros, setPros] = useState(variant.ratings.find((r) => r.username === username)?.pros ?? '');
  const [cons, setCons] = useState(variant.ratings.find((r) => r.username === username)?.cons ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onRateVariant(variant.id, rank, pros, cons);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-xl border border-blue-100 bg-white/70 p-4 shadow-sm">
      <h4 className="mb-1 text-base font-semibold text-slate-900">{variant.title}</h4>
      <p className="text-subtle mb-1">{variant.description || 'No description.'}</p>
      <p className="text-subtle mb-2">
        Created by {variant.createdByName} · Avg rank {variant.averageRank.toFixed(2)} ({variant.ratingCount} ratings)
      </p>
      <ExistingRating variant={variant} username={username} />

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="field-label">Rank (1..10)</label>
            <input
              className="text-input"
              type="number"
              min={1}
              max={10}
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
            />
          </div>
          <div className="md:col-span-4">
            <label className="field-label">Pros</label>
            <input className="text-input" value={pros} onChange={(e) => setPros(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <label className="field-label">Cons</label>
            <input className="text-input" value={cons} onChange={(e) => setCons(e.target.value)} />
          </div>
          <div className="md:col-span-1 md:self-end">
            <button type="submit" className="ghost-btn w-full" disabled={saving}>
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      </form>

      {variant.ratings.length > 0 ? (
        <details className="mt-3 rounded-lg border border-slate-200 bg-white/80 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">All personal ratings</summary>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
            {variant.ratings.map((rating) => (
              <li key={`${rating.variantId}-${rating.userId}`}>
                {rating.username}: {rating.rank} (pros: {rating.pros || '-'}, cons: {rating.cons || '-'})
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
