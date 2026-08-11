# Current Project Status

## Current Main

- SHA: `d3d035b0be08ea153dc8deb4f1444f04b41253b9`
- Baseline: PR #52 merged; the branded responsive passenger/admin UI is presentation-ready.

## Current Phase

Deterministic Playwright and release gate

## Current Campaign

- Issue #53: deterministic Playwright critical journeys and release gate.
- Branch: `chore/53-playwright-release-gate`.
- PR: #54.
- Status: complete local release gate pass; exact-head CI pending.

## Completed Major Capabilities

- Monorepo, Docker PostgreSQL/PostGIS/Redis, migrations, and CI.
- JWT authentication API foundation.
- Transport, trip search/detail, seat inventory, checkout, ticket, tracking, and admin foundations.
- PostgreSQL-authoritative seat holds with row locking, active-hold uniqueness, expiry reconciliation, and 5/5 integration proof.
- Authenticated passenger ownership for holds, orders, payments, tickets, and QR, with cross-user negative tests.
- Admin-only API enforcement with passenger/unauthenticated denial tests.
- Expired-order/hold payment rejection and serialized one-payment/one-ticket behavior.
- Deterministic, guarded demo reset with stable accounts, PostGIS route geometry, future trips, seats, active ticket, and live scenario.
- Cookie-backed passenger login/register/logout, trip search, authenticated seat hold, server-priced checkout, payment, ticket list/detail, and QR retrieval.
- Real HTTP demo journey verification from login through QR.
- Real scannable QR rendering with short-lived signed payloads and hashed-at-rest ticket secrets.
- Ticket-entitled tracking bootstrap/socket access with Redis snapshot and PostGIS-route simulator movement.
- Authenticated admin overview, transport, ticket, fleet, and report operations backed by PostgreSQL,
  PostGIS, and Redis.
- Cohesive red, charcoal, stone, and white passenger/admin visual system with responsive critical flows.
- Accessible passenger search, trip, coach-seat, checkout, ticket/QR, and live-map presentation surfaces.
- Deterministic Playwright passenger/admin critical journeys against production builds and real
  PostgreSQL/PostGIS/Redis infrastructure.
- Reliable authenticated return-to navigation after passenger login.

## Remaining Work

1. Full release verification and final readiness audit.

## Current Blocker

None.

## Next Campaign

Final readiness audit and roadmap reconciliation.
