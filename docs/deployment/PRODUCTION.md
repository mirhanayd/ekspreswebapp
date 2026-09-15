# Production Deployment Foundation

This document defines the first production-like topology for EkspresWeb. It intentionally keeps the application portable: PostgreSQL/PostGIS, Redis-compatible Key Value, S3-compatible object storage, and ordinary Node/Next.js deployments remain the contracts.

## Target topology

- Passenger web: Vercel project rooted at `apps/passenger-web`.
- Admin web: Vercel project rooted at `apps/admin-web`.
- Driver web: Vercel project rooted at `apps/driver-web`.
- API + Socket.IO: Render web service in Frankfurt, defined by `render.yaml`.
- Durable database: Render PostgreSQL 16 in Frankfurt with PostGIS enabled by migration `0000_enable_postgis.sql`.
- Realtime/cache: Render Key Value in Frankfurt, connected to the API by the internal `REDIS_URL`.
- Object storage: S3-compatible contract prepared for Cloudflare R2 or another compatible provider. No upload feature depends on it yet.

The API, PostgreSQL and Key Value resources must stay in the same Render region so they can use private/internal connections.

## Tracking data policy

Live location and durable history serve different purposes:

1. Every accepted driver GPS update refreshes `tracking:latest:<tripId>` in Redis and is published on `trip_locations` for Socket.IO consumers.
2. `TRACKING_LATEST_TTL_SECONDS` defaults to 120 seconds. A stale vehicle therefore disappears from the authoritative live snapshot instead of looking permanently online.
3. Durable GPS history is written to PostgreSQL/PostGIS at most once per trip per `TRACKING_HISTORY_INTERVAL_SECONDS`, default 30 seconds.
4. `tracking_positions.position` is a PostGIS `geometry(Point, 4326)` column with trip/time and GiST indexes for later route-deviation, terminal-proximity and operational analytics.

The durable history interval is deliberately slower than the live update cadence so a moving vehicle does not generate unnecessary database writes.

## Render deployment

`render.yaml` defines `ekspres-api`, `ekspres-postgres` and `ekspres-redis` in Frankfurt. Creating a Render Blueprint from the repository will request secret values that are intentionally not stored in Git.

Required secret/config values at Blueprint creation:

- `JWT_SECRET`: unique high-entropy production secret, minimum 32 characters.
- `WEB_ORIGINS`: comma-separated public web origins, for example `https://www.example.com,https://admin.example.com,https://driver.example.com`.

The API receives `DATABASE_URL` and `REDIS_URL` from the Render-managed datastores. Before each API release, the Blueprint runs `pnpm db:migrate` as the pre-deploy command. The health check is `/api/v1/status`.

Do not run `demo:reset` against production. Demo reset contains destructive, local/demo-only behavior.

## Vercel projects

Create three Vercel projects from the same GitHub repository. Use the matching application directory as each project's Root Directory:

| Project | Root Directory |
| --- | --- |
| passenger | `apps/passenger-web` |
| admin | `apps/admin-web` |
| driver | `apps/driver-web` |

Set the following environment variables on all three projects:

- `API_URL=https://<api-host>/api/v1`
- `NEXT_PUBLIC_API_URL=https://<api-host>/api/v1`

`API_URL` is the server-side contract. `NEXT_PUBLIC_API_URL` is also exposed to browser code where required by live tracking. `API_BASE_URL` remains a driver-web compatibility fallback but should not be used for new production configuration.

After assigning final Vercel domains, update Render `WEB_ORIGINS` to contain all three exact HTTPS origins and redeploy the API.

## S3-compatible object storage

Object storage is intentionally not used for ticketing or GPS state. When uploads are added, configure the API with:

- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_REGION`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY_ID`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY`
- optional `OBJECT_STORAGE_PUBLIC_BASE_URL`

For Cloudflare R2, use its S3-compatible endpoint and `auto` region. Keep credentials only in the hosting provider's secret store.

## Deployment order

1. Merge a green deployment-foundation PR.
2. Create/sync the Render Blueprint.
3. Confirm migrations, PostGIS and `/api/v1/status` are healthy.
4. Deploy passenger/admin/driver projects on Vercel with the Render API URL.
5. Set Render `WEB_ORIGINS` to the final Vercel/custom domains and redeploy the API.
6. Test passenger login/booking, admin login, driver login, driver GPS publish and passenger live tracking on HTTPS.
7. Add custom domains only after the generated deployment URLs pass the smoke tests.

## Scaling notes

Start with one API instance. PostgreSQL remains authoritative for ticket/order/boarding invariants; Redis carries latest-location and pub/sub traffic. If the API is scaled to multiple instances later, Socket.IO fan-out must use a Redis-compatible adapter so rooms/events are shared across instances.

Do not add Kafka, Kubernetes or microservices solely for the first operator deployment. Split services only when measured load or operational ownership requires it.
