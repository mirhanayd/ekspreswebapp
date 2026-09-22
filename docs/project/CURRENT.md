# Current Project Status

## Verified Release Baseline

- Driver presentation/staging restoration was merged by PR #71.
- Current `main` baseline begins at commit `0f6f7812af1b936a4add67c9da55c87df06fd244`.
- Staging uses Vercel for the three web apps and Neon PostgreSQL/PostGIS for durable data.
- Render remains a temporary compatibility backend and currently causes visible free-tier cold starts.

## Current Phase

Incremental serverless backend migration.

## Authentication checkpoint (#76)

- Baseline: PR #74 merged at `2e44d26ff2a848a4e55728a06dd31a8d68bb7344`.
- #73 is the migration epic; #76 extracts shared server authentication and migrates passenger auth.
- Driver signed JWT and credential logic now use the shared framework-neutral server layer.
- Passenger register/login/me now query Neon from Node Route Handlers; logout remains local.
- Passenger staging requires DATABASE_URL and the existing JWT_SECRET before HTTPS auth smoke.
- Full CI and HTTPS staging verification remain release gates, not assumed successes.
- Passenger/admin business endpoints remain legacy until their individual cutovers pass tests.

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
- Passenger/admin HTTP operations: existing NestJS/Render API until #73 migrates them.
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

- Open PR for #72 and run the complete CI gate.
- Configure `DATABASE_URL` and `JWT_SECRET` on the driver Vercel project.
- Optionally configure `ABLY_API_KEY` for managed realtime publishing.
- Smoke-test driver login/dashboard with Render asleep.
- After #72 is stable, continue issue #73 endpoint group by endpoint group.
