# Current Project Status

## Current Main

- SHA: `f185ad02c50942b95de49f8d648427fc6d129413`
- Baseline: PR #47 merged; the deterministic authenticated passenger journey is presentation-ready.

## Current Phase

Secure QR and ticket-entitled route tracking

## Current Campaign

- Issue #48: secure QR and ticket-entitled route tracking.
- Branch: `feature/48-secure-qr-tracking`.
- PR: pending publication.
- Status: implementation and runtime verification in progress.

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

## Remaining Work

1. Functional authenticated admin operations.
2. Passenger/admin UI redesign, responsiveness, accessibility, and Playwright.
3. Full release verification and final readiness audit.

## Current Blocker

None.

## Next Campaign

Functional authenticated admin operations and demo controls.
