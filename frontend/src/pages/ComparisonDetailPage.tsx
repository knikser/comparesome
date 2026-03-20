import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ComparisonDetail, Variant } from '../types/api';

function ExistingRating({ variant, username }: { variant: Variant; username?: string }) {
  const mine = variant.ratings.find((r) => r.username === username);
  if (!mine) {
    return <p className="subtle-text mb-2">No personal rating yet.</p>;
  }
  return (
    <p className="subtle-text mb-2">
      Your rank: {mine.rank} | Pros: {mine.pros || '-'} | Cons: {mine.cons || '-'}
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
    return <div className="alert alert-danger">{error}</div>;
  }
  if (!detail) {
    return <div className="alert alert-light border">Loading comparison...</div>;
  }

  return (
    <div className="d-grid gap-4">
      <section className="card section-card">
        <div className="card-body">
          <h2 className="h4 page-title">{detail.comparison.name}</h2>
          <p className="subtle-text mb-0">
            Participants: {detail.participants.map((p) => p.username).join(', ')}
          </p>
        </div>
      </section>

      <section className="card section-card">
        <div className="card-body">
          <h3 className="h5 page-title">Add variant</h3>
          <form onSubmit={onCreateVariant}>
            <div className="mb-3">
              <label className="form-label">Variant title</label>
              <input
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creatingVariant}>
              {creatingVariant ? 'Adding...' : 'Add variant'}
            </button>
          </form>
        </div>
      </section>

      <section className="card section-card">
        <div className="card-body">
          <h3 className="h5 page-title">Variants</h3>
          {detail.variants.length === 0 ? <p className="mb-0">No variants yet.</p> : null}
          <div className="d-grid gap-3">
            {detail.variants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                username={user?.username}
                onRateVariant={onRateVariant}
              />
            ))}
          </div>
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
    <article className="variant-card p-3">
      <h4 className="h6 mb-1">{variant.title}</h4>
      <p className="mb-1 subtle-text">{variant.description || 'No description.'}</p>
      <p className="mb-2 subtle-text">
        Created by {variant.createdByName} | Avg rank {variant.averageRank.toFixed(2)} ({variant.ratingCount} ratings)
      </p>
      <ExistingRating variant={variant} username={username} />

      <form onSubmit={submit}>
        <div className="row g-3">
          <div className="col-12 col-md-3">
            <label className="form-label">Rank (1..10)</label>
            <input
              className="form-control"
              type="number"
              min={1}
              max={10}
              value={rank}
              onChange={(e) => setRank(Number(e.target.value))}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Pros</label>
            <input className="form-control" value={pros} onChange={(e) => setPros(e.target.value)} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Cons</label>
            <input className="form-control" value={cons} onChange={(e) => setCons(e.target.value)} />
          </div>
          <div className="col-12 col-md-1 d-flex align-items-end">
            <button type="submit" className="btn btn-outline-primary w-100" disabled={saving}>
              {saving ? '...' : 'Save'}
            </button>
          </div>
        </div>
      </form>

      {variant.ratings.length > 0 ? (
        <details className="mt-3">
          <summary>All personal ratings</summary>
          <ul className="mb-0 mt-2">
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
