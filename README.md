# Siirt Kurtalan Ekspres Demo MVP

A modern, responsive web application for a local bus company to showcase ticketing, real-time vehicle tracking, and seat reservations. This repository contains the monorepo foundation.

## Architecture

This project is a Turborepo-managed monorepo containing:

### Apps

- **`apps/passenger-web`**: Next.js (App Router) passenger interface.
- **`apps/admin-web`**: Next.js (App Router) admin dashboard.
- **`apps/api`**: NestJS backend API.
- **`apps/tracking-simulator`**: Node.js CLI script for GPS simulation.

### Packages

- **`packages/ui`**: React component library.
- **`packages/contracts`**: Shared TypeScript definitions and enums.
- **`packages/database`**: Drizzle ORM schemas and connections.
- **`packages/eslint-config`**: Shared ESLint configuration.
- **`packages/typescript-config`**: Shared TypeScript configuration.

## Development

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 9.15.4 (`corepack enable pnpm`)
- Docker Desktop or Docker Engine
- Docker Compose

### Setup

1. Install dependencies: `pnpm install`
2. Create environment file: `cp .env.example .env` (Local only)
3. Start local infrastructure: `pnpm infra:up`
4. Apply database migrations: `pnpm db:migrate`
5. Verify database setup: `pnpm db:verify`
6. Run development servers: `pnpm dev`

### Local Database

The local Postgres database runs on port `5432` mapped to `127.0.0.1`.
- **Start**: `pnpm infra:up`
- **Stop**: `pnpm infra:down`
- **Logs**: `pnpm infra:logs`
- **Reset**: `pnpm infra:reset` *(WARNING: Destructive. Removes local volume)*

#### Database Migrations
- `pnpm db:generate`: Generate migrations based on schema changes.
- `pnpm db:migrate`: Apply migrations to the database.
- `pnpm db:check`: Check migration consistency.
- `pnpm db:verify`: Validate Postgres and PostGIS connection.
- `pnpm db:test:integration`: Run database smoke tests.

*Note: No product-domain tables exist yet in `@ekspres/database`.*

### Troubleshooting

- **Docker not running**: Verify Docker Desktop is started.
- **Port already in use**: Ensure port 5432 is free.
- **Unhealthy container**: Check logs via `pnpm infra:logs`.
- **Missing DATABASE_URL**: Make sure `.env` is created from `.env.example`.
- **Migration/PostGIS failure**: Reset via `pnpm infra:reset` and `infra:up` then retry `db:migrate`.
