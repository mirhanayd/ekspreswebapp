# Current Project Status

## Verified Release Baseline

- SHA: `63339e21ae419583051219bd9eec68f9ba041d97`
- Baseline: PR #54 merged; the deterministic Playwright release gate is required and green.
- Closure artifact: PR #56 final release-readiness audit and roadmap reconciliation.

## Current Phase

Demo MVP presentation release complete

## Current Campaign

- Issue #55: final release readiness audit and roadmap reconciliation.
- Branch: `docs/55-final-release-readiness-audit`.
- PR: #56.
- Status: final audit complete; all historical roadmap issues reconciled; audit evidence head passed
  full CI run `31488289474`.

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

No remaining Demo MVP engineering work. Before an external presentation, run the deterministic
preflight on the presentation machine and prepare an offline recording fallback.

## Current Blocker

No Demo MVP code blocker. Public staging and production remain explicitly outside this release.

## Next Campaign

Pilot planning only: hosting/TLS, managed secrets, production observability, security scanning, PWA,
physical-device QA, backup/restore, and real payment/GPS integrations.
