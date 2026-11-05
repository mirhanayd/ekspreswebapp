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
- #106 rebuilds `apps/passenger-web` to the "Yolcu Uygulaması" design (light theme, Archivo, 41-seat SVG coach map, bottom-sheet payment, ticket with real QR, camera-following live tracking, View Transition screen changes) and adds alighting notifications: the driver GPS ingest evaluates every active ticket on the trip, sends one Web Push each at 5 km and 1 km of remaining road distance to the ticket's alighting stop (`0013_alighting-notifications` migration), and the passenger app shows an in-app banner when the device has no push delivery. Settings (5 km / 1 km / sound) are per passenger.

## Previous Campaign

- Issue #72: move driver operations off Render to Vercel Route Handlers + Neon.
- Branch: `feature/72-serverless-backend-migration`.
- Driver login, trip reads, trip status, passenger boarding state and GPS ingestion are being moved into the driver Vercel project.
- JWT role and driver-to-trip assignment checks remain server-side.
- GPS history remains durable in PostGIS.
- `ABLY_API_KEY` is configured server-side for passenger and driver staging; the next Preview deployment verifies GPS publish and ticket-scoped receive before #88 merges.
- Issue #73 tracks passenger/admin migration, realtime subscriber cutover and final Render/NestJS removal.
- Issue #96 admin driver controls are implemented on the Vercel + Neon path: driver lifecycle,
  server-generated temporary passwords, same-origin assignment handlers, overlap conflict/override
  auditing, and live driver assignment/session revalidation.

## Driver redesign (#108)

- `apps/driver-web` is one screen: Today, then a trip layer alternating between a stop (top-down 41-seat plan, list) and the road (MapLibre with per-stop alighting/boarding bubbles).
- Passenger state gains `alighted` (migration `0014_passenger-alighted`), so "İndi" is stored on the server. Depends on #107 for the 41-seat layout and the alighting stop default.
- The current stop is device-local (`localStorage`); after a reinstall or on another device it is re-derived from the trip status and last GPS fix. There is no server-side stop log yet.

## Driver stop data (#110)

- `GET /api/driver/trips/:id/stops/:locationId` returns one stop's alighting and boarding passengers plus per-stop counts, behind the assigned-driver check.
- Buses are converted to the 41-seat coach by migration `0015`; `0016` replaces the one-ticket-per-seat index with a per-leg exclusion constraint so a seat can change hands at a stop.
- Checkout still sells whole trips only: its tickets keep the full-route leg. Segment sales need their own seat availability work.

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
- The #96 integration suite requires an isolated PostgreSQL/PostGIS service; it is not run when
  local Postgres is unavailable.

## Driver Capability Set

- Driver authentication is role-gated.
- Drivers can access only assigned trips.
- Assigned route stops and passenger manifests remain available.
- Passenger status persists as `pending`, `boarded` or `no_show`.
- Driver can update trip status.
- Browser geolocation can submit positions for the assigned bus/trip.
- PostGIS stores sampled durable tracking history.

## Next Gate

- #108: run migration `0014` on Neon after `0013`, then field-test the stop flow on a phone with real GPS.
- #106: generate a VAPID pair (`npx web-push generate-vapid-keys`), set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` on the passenger and driver Vercel projects, run migration `0013` on Neon, then verify a real Web Push on a phone (installed PWA, app closed) at 5 km and 1 km on staging.

- Complete #88 CI and HTTPS Preview managed-realtime smoke with the legacy API unavailable.
- Configure the same server-only `ABLY_API_KEY` in passenger and driver Vercel Preview/Production scopes if it is not already present.
- Keep Render available as rollback until the passenger/admin/realtime replacement paths pass final E2E.
