import { describe, expect, it } from 'vitest';
import { headingBetween, pointAtProgress } from './route-progress';

describe('route progress', () => {
  const route: Array<[number, number]> = [
    [41.9419, 37.9274],
    [41.7058, 37.9261],
    [41.1322, 37.8812],
    [40.2189, 37.9144],
  ];

  it('keeps every interpolated point on the seeded LineString', () => {
    expect(pointAtProgress(route, 0)).toEqual(route[0]);
    expect(pointAtProgress(route, 1)).toEqual(route[route.length - 1]);
    const midpoint = pointAtProgress(route, 0.5);
    expect(midpoint[0]).toBeLessThan(route[0][0]);
    expect(midpoint[0]).toBeGreaterThan(route[route.length - 1][0]);
  });

  it('produces a normalized heading', () => {
    const heading = headingBetween(route[0], route[1]);
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
  });
});
