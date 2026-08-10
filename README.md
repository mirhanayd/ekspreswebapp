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
2. Copy `.env.example` to `.env` (local only).
3. Start local infrastructure: `pnpm infra:up`
4. Create the deterministic demo: `pnpm demo:reset`
5. Verify the demo data: `pnpm demo:verify`
6. Run development servers: `pnpm dev`

### Presentation Demo

`pnpm demo:reset` is a guarded, local-only reset. It applies idempotent migrations and recreates stable accounts, locations, a PostGIS route, a 39-seat bus, future trips, an in-progress trip, and an active ticket. It is safe to rerun against the documented local database and refuses remote or production-like database targets.

Demo accounts:

| Role      | Email                      | Password    |
| --------- | -------------------------- | ----------- |
| Passenger | `yolcu@siirtkurtalan.demo` | `Demo123!`  |
| Admin     | `admin@siirtkurtalan.demo` | `Admin123!` |

For the passenger journey, run the API and passenger app in separate terminals:

```bash
pnpm --filter api dev
pnpm --filter passenger-web dev
```

Open `http://localhost:3000`, sign in as the demo passenger, search tomorrow's Siirt → Diyarbakır service, select a seat, complete the simulated payment, and open the issued ticket. With the API running, `pnpm demo:journey` independently verifies login → hold → order → payment → ticket → QR through real HTTP requests.

For the live-tracking segment, start the deterministic simulator in a third terminal:

```bash
pnpm tracking:simulate
```

Open the seeded active ticket from **Biletlerim** and choose **Canlı İzle**. The simulator publishes only the in-transit demo trip, follows its PostGIS LineString, and refreshes the entitled map every two seconds. `pnpm demo:reset` also clears the last Redis tracking snapshot; `pnpm tracking:reset` can clear only that snapshot.

The API is served at `http://localhost:3001/api/v1`; Swagger is available at `http://localhost:3001/api/docs`.

### Local Database

The local Postgres database runs on port `5432` mapped to `127.0.0.1`.

- **Start**: `pnpm infra:up`
- **Stop**: `pnpm infra:down`
- **Logs**: `pnpm infra:logs`
- **Reset**: `pnpm infra:reset` _(WARNING: Destructive. Removes local volume)_

#### Database Migrations

- `pnpm db:generate`: Generate migrations based on schema changes.
- `pnpm db:migrate`: Apply migrations to the database.
- `pnpm db:check`: Check migration consistency.
- `pnpm db:verify`: Validate Postgres and PostGIS connection.
- `pnpm db:test:integration`: Run database smoke tests.

### Troubleshooting

- **Docker not running**: Verify Docker Desktop is started.
- **Port already in use**: Ensure port 5432 is free.
- **Unhealthy container**: Check logs via `pnpm infra:logs`.
- **Missing DATABASE_URL**: Make sure `.env` is created from `.env.example`.
- **Authentication configuration**: Set a unique `JWT_SECRET` of at least 32 characters outside local development. Production startup rejects a missing secret.
- **Migration/PostGIS failure**: Reset via `pnpm infra:reset` and `infra:up` then retry `db:migrate`.
