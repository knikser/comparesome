import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ComparisonDetail, Variant } from '../types/api';

function ExistingRating({ variant, username }: { variant: Variant; username?: string }) {
  const mine = variant.ratings.find((r) => r.username === username);
  if (!mine) {
    return <p>No personal rating yet.</p>;
  }
  return (
    <p>
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
    try {
      await api.createVariant(token, comparisonId, title, description);
      setTitle('');
      setDescription('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add variant');
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
    return <p className="error">{error}</p>;
  }
  if (!detail) {
    return <p>Loading comparison...</p>;
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>{detail.comparison.name}</h2>
        <p>Participants: {detail.participants.map((p) => p.username).join(', ')}</p>
      </section>

      <section className="card">
        <h3>Add variant</h3>
        <form onSubmit={onCreateVariant}>
          <label>
            Variant title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button type="submit">Add variant</button>
        </form>
      </section>

      <section className="card">
        <h3>Variants</h3>
        {detail.variants.length === 0 ? <p>No variants yet.</p> : null}
        {detail.variants.map((variant) => (
          <VariantCard key={variant.id} variant={variant} username={user?.username} onRateVariant={onRateVariant} />
        ))}
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onRateVariant(variant.id, rank, pros, cons);
  };

  return (
    <article className="nested-card">
      <h4>{variant.title}</h4>
      <p>{variant.description}</p>
      <p>
        Created by {variant.createdByName} | Avg rank {variant.averageRank.toFixed(2)} ({variant.ratingCount} ratings)
      </p>
      <ExistingRating variant={variant} username={username} />

      <form onSubmit={submit} className="grid two-columns">
        <label>
          Rank (1..10)
          <input
            type="number"
            min={1}
            max={10}
            value={rank}
            onChange={(e) => setRank(Number(e.target.value))}
          />
        </label>
        <label>
          Pros
          <input value={pros} onChange={(e) => setPros(e.target.value)} />
        </label>
        <label>
          Cons
          <input value={cons} onChange={(e) => setCons(e.target.value)} />
        </label>
        <div>
          <button type="submit">Save my rating</button>
        </div>
      </form>

      {variant.ratings.length > 0 ? (
        <details>
          <summary>All personal ratings</summary>
          <ul>
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
