const EXPECTED_CONFIRMATION = 'ekspres-staging';
const EXPECTED_DATABASE = 'ekspres_staging';

export function assertSafeStagingDatabase(
  connectionString: string,
  confirmation: string | undefined,
) {
  if (confirmation !== EXPECTED_CONFIRMATION) {
    throw new Error(
      `SAFETY GUARD: set STAGING_SEED_CONFIRM=${EXPECTED_CONFIRMATION} to seed staging.`,
    );
  }

  const url = new URL(connectionString);
  const databaseName = url.pathname.replace(/^\//, '').toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const sslMode = url.searchParams.get('sslmode');

  if (databaseName !== EXPECTED_DATABASE) {
    throw new Error(`SAFETY GUARD: staging seed requires database ${EXPECTED_DATABASE}.`);
  }
  if (!hostname.endsWith('.neon.tech') || hostname.includes('-pooler.')) {
    throw new Error('SAFETY GUARD: staging seed requires a direct Neon connection.');
  }
  if (!sslMode || !['require', 'verify-ca', 'verify-full'].includes(sslMode)) {
    throw new Error('SAFETY GUARD: staging seed requires SSL.');
  }
}
