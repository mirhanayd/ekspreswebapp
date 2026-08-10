# Deterministic Demo and Passenger Journey Campaign

## Scope

- Issue: #46, completing the passenger demo path across epics #5, #6, #7, and #10.
- Branch: `feature/46-demo-passenger-journey`.
- Added repeatable local demo data and connected the passenger UI to authenticated APIs.

## Deterministic Demo

- Added a guarded local-only reset that refuses remote and production-like database targets.
- Stable IDs and relative future times make reruns predictable without making demo trips stale.
- Seeds passenger/admin accounts, four locations, a PostGIS `LineString` route, ordered stops, a 39-seat bus, three future trips, one in-progress trip, 156 seats, and an active paid ticket.
- Migration `0008_route-geometry.sql` adds nullable route geometry idempotently.
- `pnpm demo:verify` validates account roles, trips, seats, geometry, active ticket, and live-trip prerequisites.
- Two consecutive `pnpm demo:reset` runs passed, proving repeatability.

## Passenger Journey

- Added login, registration, logout, HTTP-only session cookies, protected route middleware, and a same-origin authenticated API proxy.
- Replaced placeholder search identifiers with database-backed locations and real trip results.
- Corrected trip-detail response handling and connected trip → seat map → hold → checkout.
- Removed client-controlled user IDs and URL-controlled pricing from the browser flow.
- Checkout derives price from the public server seat map, creates an idempotent owned order, processes demo payment, and redirects to the owned ticket.
- Ticket list, detail, order success, and QR retrieval now use the authenticated session.
- `pnpm demo:journey` proves the normal real-HTTP path: login → hold → order → pay → ticket → QR.

## Runtime Corrections

- Added the missing `/api/v1` Nest global prefix expected by both web clients.
- Preserved `JWT_SECRET` through validated configuration, provided a local-development fallback, and require a 32-character secret in production.
- Made the status endpoint public.
- Added build outputs for workspace contracts/database packages so the real Nest process can start under Node.js 22; API start/dev builds those dependencies first.

## Validation

| Command                                 | Result | Notes                                               |
| --------------------------------------- | ------ | --------------------------------------------------- |
| `pnpm demo:reset` (twice)               | PASS   | Migrations and deterministic reseed repeat cleanly. |
| `pnpm demo:verify`                      | PASS   | Accounts, transport, seats, geometry, ticket/live.  |
| `pnpm demo:journey`                     | PASS   | Real HTTP journey through QR.                       |
| `pnpm --filter passenger-web typecheck` | PASS   | Passenger route/session code type-safe.             |
| `pnpm --filter passenger-web lint`      | PASS   | Only an existing live-map warning remains.          |
| `pnpm --filter passenger-web build`     | PASS   | Next production build and page generation passed.   |
| `pnpm --filter api build`               | PASS   | Nest production build passed.                       |
| Workspace packages build                | PASS   | Contracts and database runtime artifacts emitted.   |
| `pnpm format:check`                     | PASS   | All tracked source and documentation formatted.     |
| `pnpm lint` / `pnpm typecheck`          | PASS   | Every configured workspace package passed.          |
| `pnpm test`                             | PASS   | All configured unit suites passed.                  |
| `pnpm --filter api test:integration`    | PASS   | All 11 PostgreSQL HTTP/concurrency cases passed.    |
| `pnpm db:test:integration`              | PASS   | Both PostgreSQL/PostGIS smoke tests passed.         |
| `pnpm build`                            | PASS   | Full API, simulator, passenger, and admin build.    |
| Public `/api/v1/status` runtime check   | PASS   | Real Nest process returned service status `ok`.     |

## Scope Control

Real QR rendering, tracking entitlement and route projection, admin mutation workflows, full visual redesign, accessibility hardening, and Playwright remain separate campaigns.

## CI Result

- PR: #47.
- Required check: `CI / Validate and Test`.
- Run: `31440878292`, PASS (3m29s).

## Status

READY_TO_MERGE
