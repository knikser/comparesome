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
    return <div className="alert alert-danger">{error}</div>;
  }
  if (!data) {
    return <div className="alert alert-light border">Loading dashboard...</div>;
  }

  return (
    <div className="row g-4">
      <section className="col-12 col-xl-7">
        <div className="card section-card h-100">
          <div className="card-body">
            <h2 className="h5 page-title">Last comparisons</h2>
            <p className="subtle-text">Quick access to the latest comparison sessions.</p>
            {data.lastComparisons.length === 0 ? <p className="mb-0">No comparisons yet.</p> : null}
            <div className="d-grid gap-3">
              {data.lastComparisons.map((item) => (
                <article key={item.comparison.id} className="variant-card p-3">
                  <h3 className="h6 mb-2">
                    <Link to={`/comparisons/${item.comparison.id}`}>{item.comparison.name}</Link>
                  </h3>
                  <p className="mb-2 subtle-text">
                    Created by {item.comparison.createdByName} | Variants: {item.comparison.variantsCount}
                  </p>
                  <h4 className="h6 mb-2">Top ranked variants</h4>
                  <ol className="mb-0">
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
        </div>
      </section>

      <section className="col-12 col-xl-5">
        <div className="card section-card h-100">
          <div className="card-body">
            <h2 className="h5 page-title">Top rated variants</h2>
            <p className="subtle-text">Across all comparisons you are part of.</p>
            <ol className="mb-0 d-grid gap-2">
              {data.topRatedVariants.map((variant) => (
                <li key={variant.variantId}>
                  {variant.variantTitle} <strong>({variant.comparisonName})</strong> - avg {variant.averageRank.toFixed(2)}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
