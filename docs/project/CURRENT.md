# Current Project Status

## Current Main

- SHA: `943263f1ec15ba54476df0d4ae25125dac3272b0`
- Baseline: PR #45 merged; seat concurrency, passenger ownership, admin authorization, and payment integrity are runtime-proven.

## Current Phase

Deterministic presentation demo and passenger journey

## Current Campaign

- Issue #46: deterministic demo and authenticated passenger journey.
- Branch: `feature/46-demo-passenger-journey`.
- PR: #47.
- Status: locally validated; required PR CI is running.

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

## Remaining Work

1. Real QR rendering, entitled route-based tracking, and functional admin operations.
2. Passenger/admin UI redesign, responsiveness, accessibility, and Playwright.
3. Full release verification and final readiness audit.

## Current Blocker

None.

## Next Campaign

QR rendering, tracking entitlement/route realism, and functional admin operations.
