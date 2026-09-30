import { distanceKm, validateTrackingSample } from './tracking-validation';
import { TrackingPosition } from './tracking.types';

const baseSample = {
  latitude: 37.934,
  longitude: 41.95,
  speedKph: 70,
  headingDeg: 90,
  recordedAt: '2026-01-01T00:01:00.000Z',
};

const previous: TrackingPosition = {
  tripId: 'trip',
  busId: 'bus',
  ...baseSample,
  recordedAt: '2026-01-01T00:00:00.000Z',
  sequence: 1,
  source: 'MOBILE_APP',
};

describe('tracking sample validation', () => {
  it('rejects duplicates and out-of-order samples', () => {
    expect(
      validateTrackingSample(
        { ...baseSample, recordedAt: previous.recordedAt },
        previous,
        Date.parse(baseSample.recordedAt),
      ),
    ).toContain('not newer');
  });

  it('rejects a teleport that implies impossible movement', () => {
    const sample = { ...baseSample, latitude: 41.0082, longitude: 28.9784 };
    expect(validateTrackingSample(sample, previous, Date.parse(sample.recordedAt))).toContain(
      'implausible',
    );
  });

  it('accepts a normal update and calculates distance', () => {
    const sample = { ...baseSample, latitude: 37.944, recordedAt: '2026-01-01T00:02:00.000Z' };
    expect(validateTrackingSample(sample, previous, Date.parse(sample.recordedAt))).toBeNull();
    expect(distanceKm(previous, sample)).toBeGreaterThan(0);
  });

  it('rejects invalid coordinates and stale samples', () => {
    expect(
      validateTrackingSample(
        { ...baseSample, longitude: 181 },
        null,
        Date.parse(baseSample.recordedAt),
      ),
    ).toContain('coordinates');
    expect(
      validateTrackingSample(
        { ...baseSample, recordedAt: '2025-12-31T23:00:00.000Z' },
        null,
        Date.parse(baseSample.recordedAt),
      ),
    ).toContain('stale');
  });
});
