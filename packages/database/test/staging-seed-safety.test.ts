import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function runSeed(databaseUrl: string, confirmation?: string) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/scripts/staging-seed.ts'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      STAGING_SEED_CONFIRM: confirmation ?? '',
    },
  });
}

describe('remote staging seed guard', () => {
  it('refuses a write without explicit confirmation before opening a connection', () => {
    const result = runSeed('postgres://fixture:fixture@localhost:1/ekspres_staging');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SAFETY GUARD');
  });

  it('refuses another database even with explicit confirmation', () => {
    const result = runSeed(
      'postgres://fixture:fixture@localhost:1/other_database',
      'ekspres-staging',
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SAFETY GUARD');
  });
});
