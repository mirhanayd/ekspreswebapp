# Current Project Status

## Verified Release Baseline

- SHA: `51dd1f9b3ef03c35dfcdb4538ded88d86cbef1ad`
- Baseline: PR #59 merged; the deterministic Playwright release gate is required and green.
- Closure artifact: PR #56 final release-readiness audit and roadmap reconciliation.

## Current Phase

Demo MVP presentation release complete

## Current Campaign

- Issue #62: frontend-only driver presentation demo in `/driver`, on
  `feature/62-driver-demo`. Six screen types reuse the passenger visual system;
  boarding, filters, stop progression and location sharing use local mock state.
- Local verification: passenger TypeScript and lint pass; three driver Playwright
  scenarios pass, including mobile/desktop overflow and offline map fallback.
  Production build and full infrastructure release gate await CI.
- Presentation entry and walkthrough: `docs/project/DRIVER_DEMO.md`.

- Issue #58: rebuild the passenger frontend from the canonical `/ui` reference screens.
- Branch: `feat/ui-reference-rebuild`.
- PR: #59 (supersedes #57, now closed).
- Status: complete; the passenger visual layer is reproduced from `ui/mobile-home-reference.png`,
  `ui/trip-search-reference.png` and `ui/live-map-reference.png`, with no backend change. Merged
  head passed full CI run `31604110828`.

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
- Passenger visual system reproduced from the canonical `/ui` reference screens: sage and cream
  canvases, near-black forest chrome, lime selection, amber live highlights, floating tab pill.
- Accessible passenger search, trip, coach-seat, checkout, ticket/QR, and live-map presentation
  surfaces, verified for horizontal overflow at 375 / 390 / 430 / 768 / 1024 / 1440.
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
