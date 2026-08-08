# @ekspres/database

This package provides the database connection factory, configuration, and migrations for the Siirt Kurtalan Ekspres platform.
It uses Drizzle ORM and PostgreSQL (pg) and is configured to run PostGIS.

## Local Development

Ensure the local PostgreSQL container is running:
```bash
# from repository root
pnpm infra:up
```

### Migrations
```bash
# from repository root
pnpm db:generate
pnpm db:migrate
```

### Verification
```bash
# verify connection and PostGIS
pnpm db:verify
```

### Testing
```bash
# Unit tests
pnpm test

# Integration tests (requires DATABASE_URL)
pnpm db:test:integration
```

## Security
- This package is for **server-side use only**.
- Do not import into client/browser components.
- Do not add product-domain queries to `packages/contracts`.
