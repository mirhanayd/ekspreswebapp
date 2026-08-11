# Authenticated Admin Operations

## Scope

- Issue: #50.
- Branch: `feature/50-admin-operations`.
- Replace placeholder admin pages with authenticated, PostgreSQL/Redis-backed operations.
- Preserve the existing JWT principal and `RolesGuard` authorization boundary.

## Implementation

- Added admin-only overview, transport, ticket list/detail, fleet, and report endpoints.
- Metrics now derive from orders, payments, tickets, trips, users, and seat inventory.
- Transport output includes locations, named routes, buses, trips, occupancy, and status.
- Fleet output joins active trips to PostGIS route geometry and the latest Redis snapshot.
- Fleet freshness is explicit: live, delayed, stale, or offline.
- Added an admin-only cookie session flow that validates `/auth/me` role before storing a token.
- Added same-origin admin API proxying so browser code never reads the HTTP-only JWT.
- Moved the admin app to port 3002, avoiding the API's port 3001.
- Replaced the obsolete open socket/map-key implementation with five-second entitled admin polling and
  the public MapLibre demo style.
- Fixed API root `.env` loading for filtered package startup.
- Made release-mode localhost cookies follow the actual HTTP/HTTPS scheme in both web apps.

## Security Proof

- Unauthenticated requests are denied for every new admin surface.
- Passenger principals are denied for every new admin surface.
- Passenger login to the admin web app returns 403 and does not establish an admin session.
- Ticket administration returns operational fields without the stored QR token hash.

## Validation

| Check                                       | Result                        |
| ------------------------------------------- | ----------------------------- |
| Admin typecheck and lint                    | PASS                          |
| Admin production build                      | PASS, 12 routes               |
| Root format, lint, typecheck, test, build   | PASS                          |
| API PostgreSQL integration                  | 12/12 PASS                    |
| Database/PostGIS integration + verification | 2/2 PASS                      |
| Demo reset and verification before runtime  | PASS                          |
| Admin production login/page/API runtime     | PASS                          |
| Passenger-to-admin web login denial         | 403 PASS                      |
| Simulator-backed fleet row                  | 1 live row, sequence observed |
| Final demo reset and verification           | PASS                          |

Runtime data observed through the production admin server: four locations, one route, one bus, four
trips, one ticket, one active/live vehicle, one daily-sales row, and a real derived occupancy value.

## CI Result

- PR: #51.
- Required check: in progress.

## Status

LOCAL_RUNTIME_VALIDATION_COMPLETE
