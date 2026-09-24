# Current Project Status

## Verified Release Baseline

- Driver presentation/staging restoration was merged by PR #71.
- Passenger serverless authentication was merged by PR #77 at `e301a0f64f222d1757c858e17bfda84500530233`.
- Staging uses Vercel for the three web apps and Neon PostgreSQL/PostGIS for durable data.
- Render remains a temporary compatibility backend and currently causes visible free-tier cold starts.

## Current Phase

Incremental serverless backend migration.

## Passenger serverless checkpoints

- #73 is the migration epic; #76 extracted shared server authentication and migrated passenger auth.
- Driver signed JWT and credential logic now use the shared framework-neutral server layer.
- Passenger register/login/me now query Neon from Node Route Handlers; logout remains local.
- PR #77 passed full CI and HTTPS Preview auth smoke with the legacy API unavailable.
- #78 / PR #79 migrated locations, routes, trip search and trip detail to shared Neon-backed queries and same-origin Node Route Handlers.
- Passenger home/search/trip server renders reuse the same framework-neutral transport service and do not proxy those reads through Render.
- #80 / PR #81 migrated seat inventory, hold/release, expiration and concurrency to PostgreSQL-backed serverless handlers without Redis/KV.
- #82 / PR #83 migrated authenticated order creation, demo payment and owner-only order reads to shared PostgreSQL transactions and same-origin handlers.
- #84 / PR #85 migrated passenger-owned ticket list/detail and short-lived QR payloads to shared Neon-backed services and same-origin handlers.
- #86 / PR #87 migrated admin login, overview, transport, tickets, fleet and reports to shared Neon/PostGIS services and same-origin handlers.
- #88 migrates passenger tracking bootstrap and fan-out from Render/Redis/Socket.IO to ticket-scoped managed realtime with Neon/PostGIS snapshots.

## Previous Campaign

- Issue #72: move driver operations off Render to Vercel Route Handlers + Neon.
- Branch: `feature/72-serverless-backend-migration`.
- Driver login, trip reads, trip status, passenger boarding state and GPS ingestion are being moved into the driver Vercel project.
- JWT role and driver-to-trip assignment checks remain server-side.
- GPS history remains durable in PostGIS.
- `ABLY_API_KEY` is configured server-side for passenger and driver staging; the next Preview deployment verifies GPS publish and ticket-scoped receive before #88 merges.
- Issue #73 tracks passenger/admin migration, realtime subscriber cutover and final Render/NestJS removal.

## Temporary Hybrid State

- Driver HTTP operations: Vercel Route Handlers -> Neon.
- Passenger authentication: Vercel Route Handlers -> Neon.
- Passenger transport discovery: Vercel Route Handlers/shared server queries -> Neon.
- Passenger seat inventory/holds: Vercel Route Handlers/shared PostgreSQL transactions -> Neon.
- Passenger checkout/payment/order detail: Vercel Route Handlers/shared PostgreSQL transactions -> Neon.
- Passenger ticket list/detail/QR: Vercel Route Handlers/shared server services -> Neon.
- Admin HTTP operations: Vercel Route Handlers/shared Neon/PostGIS services.
- Passenger live tracking: Vercel bootstrap/token handlers -> Neon/PostGIS + ticket-scoped Ably subscription while #88 is in review.
- Render resources must not be deleted until passenger booking, tickets, admin and live tracking pass E2E on the replacement path.

## Driver Capability Set

- Driver authentication is role-gated.
- Drivers can access only assigned trips.
- Assigned route stops and passenger manifests remain available.
- Passenger status persists as `pending`, `boarded` or `no_show`.
- Driver can update trip status.
- Browser geolocation can submit positions for the assigned bus/trip.
- PostGIS stores sampled durable tracking history.

## Next Gate

- Complete #88 CI and HTTPS Preview managed-realtime smoke with the legacy API unavailable.
- Configure the same server-only `ABLY_API_KEY` in passenger and driver Vercel Preview/Production scopes if it is not already present.
- Keep Render available as rollback until the passenger/admin/realtime replacement paths pass final E2E.
