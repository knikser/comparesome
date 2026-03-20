import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { type TranslationKey, useLanguage } from '../i18n';
import type { ComparisonDetail, Variant } from '../types/api';

function ExistingRating({
  variant,
  username,
  noRatingText,
  yourRatingText
}: {
  variant: Variant;
  username?: string;
  noRatingText: string;
  yourRatingText: (params: Record<string, string | number>) => string;
}) {
  const mine = variant.ratings.find((r) => r.username === username);
  if (!mine) {
    return <p className="text-subtle mb-2">{noRatingText}</p>;
  }
  return (
    <p className="text-subtle mb-2">
      {yourRatingText({
        rank: mine.rank,
        pros: mine.pros || '-',
        cons: mine.cons || '-'
      })}
    </p>
  );
}

export function ComparisonDetailPage() {
  const { token, user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();
  const comparisonId = Number(params.id);
  const [detail, setDetail] = useState<ComparisonDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [createVariantError, setCreateVariantError] = useState('');
  const [createVariantFieldErrors, setCreateVariantFieldErrors] = useState<Record<string, string>>({});
  const [creatingVariant, setCreatingVariant] = useState(false);

  const load = async () => {
    if (!token || Number.isNaN(comparisonId)) {
      return;
    }
    try {
      const data = await api.comparisonDetail(token, comparisonId);
      setDetail(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : t('comparison.loadError'));
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
    setCreateVariantError('');
    setCreateVariantFieldErrors({});
    try {
      await api.createVariant(token, comparisonId, title, description);
      setTitle('');
      setDescription('');
      await load();
    } catch (err) {
      setCreateVariantError(err instanceof ApiError ? err.message : t('comparison.createVariantError'));
      setCreateVariantFieldErrors(err instanceof ApiError ? err.fieldErrors : {});
    } finally {
      setCreatingVariant(false);
    }
  };

  const onRateVariant = async (variantId: number, rank: number, pros: string, cons: string) => {
    if (!token) {
      return;
    }
    await api.rateVariant(token, variantId, rank, pros, cons);
    await load();
  };

  if (loadError) {
    return <div className="error-banner">{loadError}</div>;
  }
  if (!detail) {
    return <div className="loading-banner">{t('comparison.loading')}</div>;
  }

  return (
    <div className="grid gap-4">
      <section className="surface-card p-5">
        <h2 className="mb-1 text-2xl font-semibold text-slate-900">{detail.comparison.name}</h2>
        <p className="text-subtle">
          {t('comparison.participants', { names: detail.participants.map((p) => p.username).join(', ') })}
        </p>
      </section>

      <section className="surface-card p-5">
        <h3 className="page-title">{t('comparison.addVariant')}</h3>
        <form onSubmit={onCreateVariant}>
          <div className="mb-4">
            <label className="field-label">{t('comparison.variantTitle')}</label>
            <input
              className={`text-input ${createVariantFieldErrors.title ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setCreateVariantFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.title;
                  return next;
                });
              }}
              required
            />
            {createVariantFieldErrors.title ? (
              <p className="mt-1 text-sm text-red-600">{createVariantFieldErrors.title}</p>
            ) : null}
          </div>
          <div className="mb-4">
            <label className="field-label">{t('comparison.description')}</label>
            <textarea
              className="text-input"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setCreateVariantFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.description;
                  return next;
                });
              }}
            />
          </div>
          {createVariantError ? <div className="error-banner mb-4">{createVariantError}</div> : null}
          <button type="submit" className="primary-btn" disabled={creatingVariant}>
            {creatingVariant ? t('comparison.adding') : t('comparison.add')}
          </button>
        </form>
      </section>

      <section className="surface-card p-5">
        <h3 className="page-title">{t('comparison.variants')}</h3>
        {detail.variants.length === 0 ? <p>{t('comparison.noVariants')}</p> : null}
        <div className="grid gap-3">
          {detail.variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              username={user?.username}
              t={t}
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
  t,
  onRateVariant
}: {
  variant: Variant;
  username?: string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  onRateVariant: (variantId: number, rank: number, pros: string, cons: string) => Promise<void>;
}) {
  const [rank, setRank] = useState(variant.ratings.find((r) => r.username === username)?.rank ?? 5);
  const [pros, setPros] = useState(variant.ratings.find((r) => r.username === username)?.pros ?? '');
  const [cons, setCons] = useState(variant.ratings.find((r) => r.username === username)?.cons ?? '');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      await onRateVariant(variant.id, rank, pros, cons);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('comparison.rateVariantError'));
      setFieldErrors(err instanceof ApiError ? err.fieldErrors : {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-xl border border-blue-100 bg-white/70 p-4 shadow-sm">
      <h4 className="mb-1 text-base font-semibold text-slate-900">{variant.title}</h4>
      <p className="text-subtle mb-1">{variant.description || t('comparison.noDescription')}</p>
      <p className="text-subtle mb-2">
        {t('comparison.meta', {
          name: variant.createdByName,
          avg: variant.averageRank.toFixed(2),
          count: variant.ratingCount
        })}
      </p>
      <ExistingRating
        variant={variant}
        username={username}
        noRatingText={t('comparison.noRating')}
        yourRatingText={(params) => t('comparison.yourRating', params)}
      />

      <form onSubmit={submit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="field-label">{t('comparison.rank')}</label>
            <input
              className={`text-input ${fieldErrors.rank ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
              type="number"
              min={1}
              max={10}
              value={rank}
              onChange={(e) => {
                setRank(Number(e.target.value));
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.rank;
                  return next;
                });
              }}
            />
            {fieldErrors.rank ? <p className="mt-1 text-sm text-red-600">{fieldErrors.rank}</p> : null}
          </div>
          <div className="md:col-span-4">
            <label className="field-label">{t('comparison.pros')}</label>
            <input
              className={`text-input ${fieldErrors.pros ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
              value={pros}
              onChange={(e) => {
                setPros(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.pros;
                  return next;
                });
              }}
            />
            {fieldErrors.pros ? <p className="mt-1 text-sm text-red-600">{fieldErrors.pros}</p> : null}
          </div>
          <div className="md:col-span-4">
            <label className="field-label">{t('comparison.cons')}</label>
            <input
              className={`text-input ${fieldErrors.cons ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''}`}
              value={cons}
              onChange={(e) => {
                setCons(e.target.value);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.cons;
                  return next;
                });
              }}
            />
            {fieldErrors.cons ? <p className="mt-1 text-sm text-red-600">{fieldErrors.cons}</p> : null}
          </div>
          <div className="md:col-span-1 md:self-end">
            <button type="submit" className="ghost-btn w-full" disabled={saving}>
              {saving ? '...' : t('comparison.save')}
            </button>
          </div>
        </div>
      </form>
      {error ? <div className="error-banner mt-3">{error}</div> : null}

      {variant.ratings.length > 0 ? (
        <details className="mt-3 rounded-lg border border-slate-200 bg-white/80 p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">{t('comparison.allRatings')}</summary>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
            {variant.ratings.map((rating) => (
              <li key={`${rating.variantId}-${rating.userId}`}>
                {t('comparison.ratingItem', {
                  name: rating.username,
                  rank: rating.rank,
                  pros: rating.pros || '-',
                  cons: rating.cons || '-'
                })}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
