# Local Database Development

This document describes the local PostgreSQL/PostGIS foundation for the Siirt Kurtalan Ekspres project.

## Architecture

- **PostgreSQL/PostGIS**: Runs locally via Docker Compose.
- **ORM**: Drizzle ORM configured in `packages/database`.
- **Driver**: `pg`.
- **Package Role**: `@ekspres/database` is a server-only package exporting a database client factory.

## Compose Service

The database service uses the `postgis/postgis:16-3.4-alpine` image to ensure reproducible GIS queries.

- Port: `5432` bound to `127.0.0.1` locally.
- Data Volume: `ekspres_pg_data` (persists data).
- Timezone: `UTC`.
- Encoding: `UTF8`.

## Local Environment Variables

Ensure `.env` exists in the repository root (copied from `.env.example`).
Variables required:

- `DATABASE_URL` (format: `postgres://user:pass@host:port/dbname`)

## Startup & Health

```bash
pnpm infra:up
```

Use `pnpm infra:ps` or `docker compose ps` to check the `healthy` status.

## Migration Workflow

Migrations are managed with `drizzle-kit`.

1. To generate a migration:
   ```bash
   pnpm db:generate
   ```
2. To apply pending migrations:
   ```bash
   pnpm db:migrate
   ```

## Verification

To verify that the database is reachable and PostGIS is enabled:

```bash
pnpm db:verify
```

_(Never prints actual credentials)_

## Integration Tests

Integration tests connect to the database to ensure behavior is correct.

```bash
pnpm db:test:integration
```

Tests do NOT run automatically in standard unit tests. A `DATABASE_URL` is required.

## Destructive Reset

If you need to wipe the local database completely (e.g. broken state):

```bash
pnpm infra:reset
```

**WARNING: This removes the local volume `ekspres_pg_data`. All local data will be lost.**

## Security Boundaries

- Database configurations are loaded locally using `dotenv`, but no `.env` files are tracked in source control.
- `@ekspres/database` does not connect on import; it uses a factory function `createDatabaseClient`.
- No application schemas/business types should leak into `@ekspres/contracts`.
- Drizzle operations must be kept server-side only.

## Troubleshooting

- **Docker missing**: Install Docker Desktop. The commands require it.
- **Port conflicts**: Check if another Postgres instance is running on 5432.
- **Missing URL**: Create your `.env` file from `.env.example`.

## Intentionally Deferred Database Work

The following items are deferred to future phases:

- Redis for caching and seat holds
- Queue tools
- Product domain database tables (trips, users, buses, routes, etc.)
- Deployment automation for the production database
- Authentication & User schemas
- MapLibre integration
