import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { DashboardData } from '../types/api';

export function DashboardPage() {
  const { token } = useAuth();
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
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
      });
  }, [token]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }
  if (!data) {
    return <div className="loading-banner">Loading dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <section className="xl:col-span-7">
        <div className="surface-card h-full p-5">
          <h2 className="page-title">Last comparisons</h2>
          <p className="text-subtle mb-4">Quick access to the latest comparison sessions.</p>
          {data.lastComparisons.length === 0 ? <p>No comparisons yet.</p> : null}
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
                    Created by {item.comparison.createdByName} · Variants: {item.comparison.variantsCount}
                  </p>
                  <h4 className="mb-2 text-sm font-semibold text-slate-900">Top ranked variants</h4>
                  <ol className="ml-4 list-decimal space-y-1 text-sm">
                    {item.topVariants.map((variant) => (
                      <li key={variant.variantId}>
                        {variant.variantTitle} - avg {variant.averageRank.toFixed(2)} ({variant.ratingCount} ratings)
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
          <h2 className="page-title">Top rated variants</h2>
          <p className="text-subtle mb-4">Across all comparisons you are part of.</p>
          <ol className="ml-4 list-decimal space-y-2 text-sm">
              {data.topRatedVariants.map((variant) => (
                <li key={variant.variantId}>
                  {variant.variantTitle} <strong>({variant.comparisonName})</strong> - avg {variant.averageRank.toFixed(2)}
                </li>
              ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
