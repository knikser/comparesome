import { describe, expect, it } from 'vitest';
import { sortBySummaryRank } from '../src/utils/ranking';

describe('sortBySummaryRank', () => {
  it('orders by average rank then rating count', () => {
    const sorted = sortBySummaryRank([
      {
        variantId: 1,
        variantTitle: 'Flat A',
        comparisonId: 1,
        comparisonName: 'Flats',
        averageRank: 8.5,
        ratingCount: 2
      },
      {
        variantId: 2,
        variantTitle: 'Flat B',
        comparisonId: 1,
        comparisonName: 'Flats',
        averageRank: 9,
        ratingCount: 1
      },
      {
        variantId: 3,
        variantTitle: 'Flat C',
        comparisonId: 1,
        comparisonName: 'Flats',
        averageRank: 8.5,
        ratingCount: 4
      }
    ]);

    expect(sorted.map((item) => item.variantId)).toEqual([2, 3, 1]);
  });
});
