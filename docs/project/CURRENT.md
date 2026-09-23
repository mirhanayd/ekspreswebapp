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
- #84 migrates passenger-owned ticket list/detail and short-lived QR payloads to shared Neon-backed services and same-origin handlers.
- Admin APIs and passenger realtime remain legacy until their individual cutovers pass tests.

## Previous Campaign

- Issue #72: move driver operations off Render to Vercel Route Handlers + Neon.
- Branch: `feature/72-serverless-backend-migration`.
- Driver login, trip reads, trip status, passenger boarding state and GPS ingestion are being moved into the driver Vercel project.
- JWT role and driver-to-trip assignment checks remain server-side.
- GPS history remains durable in PostGIS.
- When `ABLY_API_KEY` is configured, serverless GPS ingestion can publish to a trip-scoped managed realtime channel.
- Issue #73 tracks passenger/admin migration, realtime subscriber cutover and final Render/NestJS removal.

## Temporary Hybrid State

- Driver HTTP operations: Vercel Route Handlers -> Neon.
- Passenger authentication: Vercel Route Handlers -> Neon.
- Passenger transport discovery: Vercel Route Handlers/shared server queries -> Neon.
- Passenger seat inventory/holds: Vercel Route Handlers/shared PostgreSQL transactions -> Neon.
- Passenger checkout/payment/order detail: Vercel Route Handlers/shared PostgreSQL transactions -> Neon.
- Passenger ticket list/detail/QR: Vercel Route Handlers/shared server services -> Neon while #84 is in review.
- Admin HTTP operations: existing NestJS/Render API until #73 migrates them.
- Passenger live tracking: existing Socket.IO path until managed realtime subscription replaces it.
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

- Complete #84 CI and HTTPS Preview ticket smoke with the legacy API unavailable.
- Continue #73 with serverless admin APIs.
- Keep Render available as rollback until the passenger/admin/realtime replacement paths pass final E2E.
