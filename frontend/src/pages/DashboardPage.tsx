import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import type { DashboardData } from '../types/api';

export function DashboardPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }
    api
      .dashboard(token)
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : t('dashboard.loadError'));
      });
  }, [token, t]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }
  if (!data) {
    return <div className="loading-banner">{t('dashboard.loading')}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <section className="xl:col-span-7">
        <div className="surface-card h-full p-5">
          <h2 className="page-title">{t('dashboard.lastComparisons')}</h2>
          <p className="text-subtle mb-4">{t('dashboard.lastComparisonsHint')}</p>
          {data.lastComparisons.length === 0 ? <p>{t('dashboard.noComparisons')}</p> : null}
          <div className="grid gap-3">
              {data.lastComparisons.map((item) => (
                <article
                  key={item.comparison.id}
                  className="rounded-xl border border-blue-100 bg-white/70 p-4 shadow-sm"
                >
                  <h3 className="mb-2 text-base font-semibold text-slate-900">
                    <Link className="link" to={`/comparisons/${item.comparison.id}`}>
                      {item.comparison.name}
                    </Link>
                  </h3>
                  <p className="text-subtle mb-2">
                    {t('dashboard.createdBy', {
                      name: item.comparison.createdByName,
                      count: item.comparison.variantsCount
                    })}
                  </p>
                  <h4 className="mb-2 text-sm font-semibold text-slate-900">{t('dashboard.topRanked')}</h4>
                  <ol className="ml-4 list-decimal space-y-1 text-sm">
                    {item.topVariants.map((variant) => (
                      <li key={variant.variantId}>
                        {t('dashboard.variantItem', {
                          title: variant.variantTitle,
                          avg: variant.averageRank.toFixed(2),
                          count: variant.ratingCount
                        })}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
          </div>
        </div>
      </section>

      <section className="xl:col-span-5">
        <div className="surface-card h-full p-5">
          <h2 className="page-title">{t('dashboard.topRated')}</h2>
          <p className="text-subtle mb-4">{t('dashboard.topRatedHint')}</p>
          <ol className="ml-4 list-decimal space-y-2 text-sm">
              {data.topRatedVariants.map((variant) => (
                <li key={variant.variantId}>
                  {t('dashboard.topRatedItem', {
                    title: variant.variantTitle,
                    comparison: variant.comparisonName,
                    avg: variant.averageRank.toFixed(2)
                  })}
                </li>
              ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
