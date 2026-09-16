import { validateEnv } from './env.config';

const baseConfig = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/ekspres_test',
  REDIS_URL: 'redis://127.0.0.1:6379',
  JWT_SECRET: 'test-secret-with-at-least-thirty-two-characters',
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('validateEnv', () => {
  it('applies production-safe tracking defaults', () => {
    const config = validateEnv(baseConfig);

    expect(config.TRACKING_LATEST_TTL_SECONDS).toBe(120);
    expect(config.TRACKING_HISTORY_INTERVAL_SECONDS).toBe(30);
  });

  it('coerces explicit tracking values', () => {
    const config = validateEnv({
      ...baseConfig,
      TRACKING_LATEST_TTL_SECONDS: '180',
      TRACKING_HISTORY_INTERVAL_SECONDS: '45',
    });

    expect(config.TRACKING_LATEST_TTL_SECONDS).toBe(180);
    expect(config.TRACKING_HISTORY_INTERVAL_SECONDS).toBe(45);
  });

  it('rejects unsafe tracking values', () => {
    expect(() =>
      validateEnv({
        ...baseConfig,
        TRACKING_LATEST_TTL_SECONDS: '5',
      }),
    ).toThrow('Invalid environment variables');
  });
});
