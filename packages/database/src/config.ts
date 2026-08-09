export interface DatabaseConfig {
  url: string;
}

export function validateConfig(config?: Partial<DatabaseConfig>): DatabaseConfig {
  const url = config?.url || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is missing in environment variables or configuration.');
  }

  // Basic check for obvious production-looking URL if running locally/tests
  if (
    process.env.NODE_ENV !== 'production' &&
    !url.includes('127.0.0.1') &&
    !url.includes('localhost') &&
    !url.includes('postgres') // allows CI docker hostname
  ) {
    console.warn(
      'WARNING: Connecting to a potentially non-local database URL in a non-production environment.',
    );
  }

  return { url };
}
