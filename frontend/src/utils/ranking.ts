import type { DashboardVariant } from '../types/api';

export function sortBySummaryRank(items: DashboardVariant[]): DashboardVariant[] {
  return [...items].sort((a, b) => {
    if (a.averageRank === b.averageRank) {
      return b.ratingCount - a.ratingCount;
    }
    return b.averageRank - a.averageRank;
  });
}
