# Admin Authorization and Payment Integrity Campaign

## Scope

- Issue: #44, part of epics #10 and #14.
- Branch: `bugfix/44-admin-payment-integrity`.
- Added admin role enforcement and hardened order/payment state transitions.
- Preserved passenger ownership and seat concurrency behavior.

## Admin Authorization

- Added reusable `@Roles()` metadata and a global `RolesGuard` after the global JWT guard.
- Marked the entire `/admin` controller admin-only.
- Marked seat generation, an admin/seed mutation, admin-only.
- Corrected `AdminService` to inject the canonical Drizzle database provider.
- HTTP integration tests prove unauthenticated 401, passenger 403, and admin access.

## Order and Payment Safety

- Order creation locks the seat row, rechecks the owned hold after locking, and uses server time.
- Expired holds are persisted as expired and stale held seats are released.
- Concurrent duplicate order attempts return one live order.
- Payment locks the owned order row and seat row inside one PostgreSQL transaction.
- Expired orders and expired/inactive holds cannot be paid and create no payment or ticket.
- Duplicate/concurrent payment attempts return one successful payment and one ticket deterministically.
- Price remains server-authoritative from `trip_seats.price_minor`.

## Database Invariant

- Added `payments_order_unique_idx` so one order can have only one payment row.
- Migration `0007_payment-order-unique.sql` deterministically removes legacy duplicates before creating the index with `IF NOT EXISTS`.

## Runtime Proof

| Scenario                                          | Result |
| ------------------------------------------------- | ------ |
| Unauthenticated/passenger denied admin APIs       | PASS   |
| Admin allowed admin APIs                          | PASS   |
| Expired order payment rejected                    | PASS   |
| Expired hold payment rejected and seat reconciled | PASS   |
| Concurrent duplicate orders resolve to one order  | PASS   |
| Concurrent duplicate payments create one result   | PASS   |
| Passenger ownership HTTP tests                    | 2/2    |
| Seat concurrency tests                            | 5/5    |
| Total API PostgreSQL integration tests            | 11/11  |
| PostgreSQL/PostGIS database smoke                 | 2/2    |

## Validation

| Command                              | Result | Notes                                 |
| ------------------------------------ | ------ | ------------------------------------- |
| `pnpm format:check`                  | PASS   | All matched files formatted.          |
| `pnpm lint`                          | PASS   | Existing non-failing warnings remain. |
| `pnpm typecheck`                     | PASS   | All workspace typechecks passed.      |
| `pnpm test`                          | PASS   | Configured unit suites passed.        |
| `pnpm infra:up`                      | PASS   | PostgreSQL and Redis running.         |
| `pnpm db:migrate`                    | PASS   | Migration 0007 applied.               |
| `pnpm --filter api test:integration` | PASS   | 11/11 tests passed.                   |
| `pnpm db:test:integration`           | PASS   | 2/2 tests passed.                     |
| `pnpm --filter api build`            | PASS   | Nest API production build passed.     |

## Scope Control

No real payment gateway, passenger UI, QR rendering, tracking, admin UI expansion, or visual work was included. No existing security/concurrency assertion was weakened.

## CI Result

- PR: #45
- Run: `31438109980`
- Required check: `CI / Validate and Test`
- Result: PASS (3m04s).

## Status

READY_TO_MERGE
