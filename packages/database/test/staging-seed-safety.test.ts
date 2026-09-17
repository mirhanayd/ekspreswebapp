import { describe, expect, it } from 'vitest';
import { assertSafeStagingDatabase } from '../src/scripts/staging-seed-safety';

const directStagingUrl =
  'postgresql://user:secret@ep-example.eu-central-1.aws.neon.tech/ekspres_staging?sslmode=require';

describe('staging seed safety guard', () => {
  it('accepts the confirmed direct Neon staging database', () => {
    expect(() => assertSafeStagingDatabase(directStagingUrl, 'ekspres-staging')).not.toThrow();
  });

  it.each([
    ['missing confirmation', directStagingUrl, undefined],
    [
      'pooled connection',
      'postgresql://user:secret@ep-example-pooler.eu-central-1.aws.neon.tech/ekspres_staging?sslmode=require',
      'ekspres-staging',
    ],
    [
      'production database',
      'postgresql://user:secret@ep-example.eu-central-1.aws.neon.tech/ekspres_production?sslmode=require',
      'ekspres-staging',
    ],
    [
      'local database',
      'postgresql://user:secret@127.0.0.1:5432/ekspres_staging?sslmode=require',
      'ekspres-staging',
    ],
    [
      'unencrypted connection',
      'postgresql://user:secret@ep-example.eu-central-1.aws.neon.tech/ekspres_staging',
      'ekspres-staging',
    ],
  ])('rejects %s', (_label, connectionString, confirmation) => {
    expect(() => assertSafeStagingDatabase(connectionString, confirmation)).toThrow('SAFETY GUARD');
  });
});
