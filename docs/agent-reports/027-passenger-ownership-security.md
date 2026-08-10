# Passenger Ownership Security Campaign

## Scope

- Issue: #42, part of epic #5.
- Branch: `bugfix/42-passenger-ownership`.
- Removed client-controlled identity from passenger transactional APIs.
- Protected hold, checkout, payment, order, ticket, and QR routes with JWT authentication.
- Added horizontal ownership integration coverage against PostgreSQL.

## Implementation

- Added one typed `AuthenticatedPrincipal` with `userId`, `email`, and `role`.
- Added `@CurrentUser()` to expose only the JWT-authenticated principal to controllers.
- Seat hold creation and release now use `principal.userId`; body `userId` is ignored.
- Order creation, lookup, and payment now use `principal.userId`; body `userId` is ignored.
- Order detail filters by both order ID and owner ID.
- Existing idempotent orders are returned only to their owner; cross-user key reuse is rejected.
- Ticket list, detail, and QR use `principal.userId`; the demo identity fallback was removed.
- Expanded the API integration command to run all `*.integration.test.ts` suites.

## Security Proof

Real Nest HTTP requests and PostgreSQL fixtures prove:

- unauthenticated transactional requests return 401;
- User B cannot release User A's hold;
- User B cannot create an order from User A's hold;
- User B cannot read or pay User A's order;
- User B cannot retrieve User A's order by reusing its idempotency key;
- User B cannot read User A's ticket or QR;
- spoofed body `userId` values do not change the authenticated owner;
- User A retains normal access to owned order, ticket, and QR resources.

## Validation

| Command                              | Result | Notes                                   |
| ------------------------------------ | ------ | --------------------------------------- |
| `pnpm format:check`                  | PASS   | All matched files formatted.            |
| `pnpm lint`                          | PASS   | Existing non-failing warnings remain.   |
| `pnpm typecheck`                     | PASS   | All workspace typechecks passed.        |
| `pnpm test`                          | PASS   | Configured unit suites passed.          |
| `pnpm infra:up`                      | PASS   | PostgreSQL and Redis running.           |
| `pnpm db:migrate`                    | PASS   | Migrations applied successfully.        |
| `pnpm --filter api test:integration` | PASS   | Ownership 2/2 and seat concurrency 5/5. |
| `pnpm db:test:integration`           | PASS   | PostgreSQL/PostGIS smoke 2/2.           |

## Scope Control

Admin role authorization, expired/concurrent payment safety, passenger login UI, QR rendering, tracking authorization, and visual redesign remain separate campaigns. No seat concurrency logic or database invariant was changed.

## CI Result

Pending initial PR run.

## Status

READY_FOR_CI
