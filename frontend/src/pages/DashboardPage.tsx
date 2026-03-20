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
    return <p className="error">{error}</p>;
  }
  if (!data) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div className="grid two-columns">
      <section className="card">
        <h2>Last comparisons</h2>
        {data.lastComparisons.length === 0 ? <p>No comparisons yet.</p> : null}
        {data.lastComparisons.map((item) => (
          <article key={item.comparison.id} className="nested-card">
            <h3>
              <Link to={`/comparisons/${item.comparison.id}`}>{item.comparison.name}</Link>
            </h3>
            <p>
              Created by {item.comparison.createdByName} | Variants: {item.comparison.variantsCount}
            </p>
            <h4>Top ranked variants</h4>
            <ol>
              {item.topVariants.map((variant) => (
                <li key={variant.variantId}>
                  {variant.variantTitle} - avg {variant.averageRank.toFixed(2)} ({variant.ratingCount} ratings)
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Top rated variants (all your comparisons)</h2>
        <ol>
          {data.topRatedVariants.map((variant) => (
            <li key={variant.variantId}>
              {variant.variantTitle} <strong>({variant.comparisonName})</strong> - avg {variant.averageRank.toFixed(2)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
