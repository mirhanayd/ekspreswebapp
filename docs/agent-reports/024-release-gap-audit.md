# Demo MVP Release Gap Audit

## 1. Audit Metadata

- Repository: `mirhanayd/ekspreswebapp`
- Local branch: `main`
- Commit SHA: `d593619e9df5711babe9e9aa01787e05100ceffa`
- Audit date: 2026-08-10

## 2. Executive Result

**CRITICAL_GAPS_FOUND.** The repository contains substantial UI and API scaffolding, including a real PostgreSQL schema, JWT API authentication, MapLibre views, Redis pub/sub, and a demo-payment transaction. However, the presentation-critical passenger flow is not executable as a normal user journey: the home form targets a missing `/search` route, the selected-seat Continue button does not navigate to checkout, and the frontend uses an invalid hard-coded demo user/token while the seed creates no such user. Seat holding is not concurrency-safe: its transaction contains no row lock or conditional update, and expiry is not enforced server-side. Admin endpoints authenticate but do not authorize the admin role. Checkout endpoints are public and accept client-supplied user IDs; order detail is public. QR is an icon placeholder, and tracking subscriptions are unauthenticated. The claims of completed demo readiness are not supported by source or meaningful end-to-end coverage.

## 3. Passenger Route Inventory

| Route                          | Implementation    | Data Source                                   | Finding                                                                                                          |
| ------------------------------ | ----------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/`                            | PLACEHOLDER       | Static select options                         | Form posts to missing `/search`; location values are not seeded UUIDs.                                           |
| `/login`                       | MISSING           | N/A                                           | API auth exists, but no passenger login route.                                                                   |
| `/register`                    | MISSING           | N/A                                           | API auth exists, but no passenger registration route.                                                            |
| `/search`                      | MISSING           | N/A                                           | Home form action references it; no App Router page exists.                                                       |
| `/trips/[id]`                  | WORKING_BY_SOURCE | `GET /transport/trips/:id`                    | Real trip, route, stops, and MapLibre view.                                                                      |
| `/trips/[id]/seats`            | PARTIAL           | `GET /seats/trip/:id`, public hold API        | Real API calls, but hard-coded invalid `demo-user-id`; hold safety is broken.                                    |
| `/trips/[id]/checkout`         | PARTIAL           | Trip API plus query parameters                | Exists, but no normal navigation from seat selection and uses client-supplied parameters.                        |
| `/trips/[id]/checkout/success` | PARTIAL           | Public `GET /checkout/order/:orderId`         | Displays order data but the endpoint has no ownership check and QR is placeholder.                               |
| `/tickets`                     | PARTIAL           | `GET /tickets`                                | Uses `Bearer demo-token`; API expects `req.user.id` although JWT supplies `userId`.                              |
| `/tickets/[ticketId]`          | PARTIAL           | Ticket and QR API                             | Server-side ownership service exists, but controller passes the wrong user field and UI renders an icon, not QR. |
| `/trips/[id]/live`             | PARTIAL           | Public trip API and unauthenticated Socket.IO | Live map component exists; subscription is not entitlement-checked.                                              |

## 4. Authentication

- Mechanism: NestJS global `JwtAuthGuard`, Passport JWT bearer strategy, signed access token with `sub`, email, and role.
- Password hashing: `bcryptjs`, generated salt with 10 rounds.
- Guard strategy: endpoints are protected globally unless marked `@Public()`.
- Admin authorization: **missing role authorization**. `AdminController` applies only `JwtAuthGuard`; any authenticated passenger JWT can call `/admin/metrics`.
- Frontend credential storage: admin server components read an `accessToken` cookie, but no login/session writer is present. Passenger pages hard-code `demo-token` and `demo-user-id`; no localStorage use was found.
- Major findings: ticket controller reads `req.user?.id`, while `JwtStrategy` returns `userId`; valid JWT requests therefore fall back to `demo-user-id`. Checkout and hold routes are public and trust body `userId`.

## 5. Seat Hold and Concurrency

- DB tables: `trip_seats` (unique `(trip_id, seat_no)`, status/version) and `seat_holds` (user, status, expiry); no uniqueness constraint limits active holds.
- Transaction mechanism: `SeatsService.createHold` wraps a read, seat-status update, and hold insert in a Drizzle transaction.
- Locking evidence: no `SELECT ... FOR UPDATE`, advisory lock, Redis atomic primitive, or `UPDATE ... WHERE status = 'available'` conditional claim exists. Two transactions can each read `available`, then both update and create active holds.
- Redis role: none for seat holds.
- Expiry: timestamp is recorded and checked when an order is created, but no expiry worker/query releases a held seat; `getSeatMap` returns stored status unchanged.
- Ownership: release and order lookup compare supplied `userId` with the hold owner, but the hold endpoint is public and accepts that ID from the client.
- Concurrency test evidence: none. Tests include only API dummy, database config, and trivial simulator coverage.

BROKEN

## 6. Checkout and Demo Payment

- Price authority: backend takes `tripSeat.priceMinor`; client price affects display/query string only, not `orders.totalMinor`.
- Order idempotency: schema has unique `idempotency_key`; service returns an existing row by key, but public callers can submit arbitrary keys/user IDs and creation is not transactionally coupled to the hold.
- Payment idempotency: service checks for an existing successful payment before a transaction, but no unique `payments.order_id` or payment idempotency key exists. Ticket `order_id` uniqueness prevents a second ticket at the database layer, but concurrent duplicate payment behavior is not proven.
- Failed-payment behavior: demo path always inserts a successful payment; no failure path issues a ticket.
- Expired-hold behavior: order creation rejects an expired hold. Payment does **not** check `orders.expiresAt`, so an expired pending order can still be paid.
- Ticket fulfillment relationship: payment, order status, seat purchase, hold consumption, and ticket insert share one transaction; ticket has unique order and active-seat uniqueness constraints.

## 7. Tickets and QR

- Ticket schema: ticket number, user/trip/seat/order foreign keys, status, QR token field, issued/cancelled timestamps.
- Uniqueness: unique ticket number, unique order ticket, and partial unique active ticket per trip seat.
- Ownership: `TicketsService` correctly compares ticket user ID, but the controller supplies `req.user.id` instead of JWT strategy's `req.user.userId`, defeating real authenticated retrieval.
- My Tickets: queries authenticated-backend data in intent, but passenger UI sends `demo-token`, so it is not working authenticated data by source.
- Ticket detail: service has server-side ownership check; broken controller user mapping means normal valid JWT use does not reach it correctly.
- QR implementation: ticket API returns a UUID stored in the misnamed `qrTokenHash` column; frontend shows a Lucide `QrCode` icon and token text, not a machine-readable QR matrix. The payload itself is opaque, but no real QR is rendered.

PLACEHOLDER

## 8. Live Tracking

- Simulator: reads scheduled/boarding/in-transit trips from PostgreSQL and publishes every two seconds to Redis `trip_locations`.
- Redis: pub/sub only; API subscriber forwards messages to Socket.IO rooms.
- WebSocket: Socket.IO gateway accepts connections and `subscribe_trip` events with CORS `*`.
- Route geometry behavior: simulator explicitly creates 100 linear interpolation points between origin and destination; no LineString geometry is stored or followed.
- Position persistence: none to PostgreSQL/PostGIS; locations are ephemeral Redis messages.
- Authorization: none; every socket can subscribe to any trip room. This is a high-risk entitlement gap.
- Stale policy: frontend changes a connection state on disconnect only; no timestamp freshness/offline threshold exists.
- Next stop: missing. ETA: missing. Frontend live view: MapLibre marker updates exist.

SIMPLIFIED_TRACKING

## 9. Admin Demo

- Authorization: JWT authentication only; no server-side admin-role check.
- Dashboard: `/admin/metrics` uses database aggregates for paid revenue, in-transit trips, and paid order count; “new users” is static `+12`.
- DB-backed metrics: partial, as daily bookings is all paid orders rather than daily.
- Trips: page exists but calls nonexistent `/trips` API; API exposes `/transport/trips` publicly instead.
- Tickets: no admin tickets page/API found.
- Live fleet: page exists but also calls nonexistent `/trips?status=in_transit`; client socket subscription is unauthenticated.
- Placeholders: reports table is entirely static; dashboard has static user metric.

## 10. Demo and QA Infrastructure

- `demo:reset`: missing.
- `demo:verify`: missing.
- Deterministic seed: missing; seed uses current date and random database UUIDs, and is not idempotent.
- Deterministic demo accounts: missing; seed creates no users, while UI uses `demo-user-id`.
- Deterministic presentation trip: missing; six trips are generated relative to execution date.
- Playwright: missing.
- Passenger E2E: missing.
- Admin E2E: missing.
- Concurrency integration test: missing.

## 11. Validation Results

| Command             | Result             | Notes                                                                                                                   |
| ------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check` | FAIL               | Prettier reported 15 files with style issues.                                                                           |
| `pnpm lint`         | PASS_WITH_WARNINGS | Completed with warnings across packages; API lint script uses `--fix`.                                                  |
| `pnpm typecheck`    | PASS               | Turbo reported seven successful tasks.                                                                                  |
| `pnpm test`         | PASS_INSUFFICIENT  | API has one dummy test, simulator one trivial test, DB config three tests; both web apps explicitly have no unit tests. |
| `pnpm build`        | TIMEOUT            | Exceeded 64 seconds in this environment; no conclusion on build success.                                                |

## 12. Findings

| ID    | Severity | Area                   | Finding                                                                                     | Evidence                                                                                                                                             | Recommended Action                                                                                                             |
| ----- | -------- | ---------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| P0-01 | P0       | Seats                  | Concurrent same-seat holds are not prevented.                                               | `SeatsService.createHold` has transaction but no row lock/conditional status update; `seat_holds` has no active-hold uniqueness; no concurrent test. | Make claim atomic with row lock or guarded update, enforce active hold rule, and add a same-seat concurrency integration test. |
| P0-02 | P0       | Authorization          | Passenger JWTs can access admin metrics.                                                    | `AdminController` uses only `JwtAuthGuard`; role exists in JWT/schema but no role guard/check.                                                       | Add server-side admin role authorization and regression tests.                                                                 |
| P0-03 | P0       | Checkout authorization | Hold/order/payment routes are public and trust body user IDs; order detail is public.       | `CheckoutController` marks all three methods `@Public()`; `SeatsController` public hold/release accepts `userId`; `getOrder` has no owner check.     | Derive identity from JWT and authorize order/hold reads and writes.                                                            |
| P1-01 | P1       | Passenger journey      | Core journey cannot be completed from UI.                                                   | Home form references missing `/search`; seat selector Continue button has no click handler/navigation; no login/register pages.                      | Build the minimal authenticated search-to-checkout navigation and test it end-to-end.                                          |
| P1-02 | P1       | Hold/payment expiry    | Expired holds remain held and expired pending orders may be paid.                           | No hold expiry release logic; payment checks `status` but not `order.expiresAt`.                                                                     | Add server-authoritative expiry cleanup/validation and regression tests.                                                       |
| P1-03 | P1       | QR                     | Ticket UI does not render a scannable QR code.                                              | `QrCode` icon and displayed token substring only.                                                                                                    | Render a real QR using an opaque token and test its payload.                                                                   |
| P1-04 | P1       | Demo reproducibility   | Demo data/accounts/reset are absent or non-deterministic.                                   | No `demo:reset`/`demo:verify`; seed creates date-relative trips and no users; UI hard-codes an invalid UUID.                                         | Add deterministic idempotent presentation seed, accounts, reset, and verification.                                             |
| P2-01 | P2       | Tickets                | Authenticated ticket flow is wired to the wrong request field.                              | JWT strategy returns `userId`; tickets controller reads `req.user.id`; passenger pages use `demo-token`.                                             | Use one identity source consistently and add ownership tests.                                                                  |
| P2-02 | P2       | Tracking               | Tracking is linear, ephemeral, and lacks stale/ETA/next-stop behavior.                      | Simulator interpolates origin/destination; Redis pub/sub only; no persistence or freshness policy.                                                   | State the limitation for demo or implement the smallest required tracking hardening.                                           |
| P2-03 | P2       | Admin                  | Operations pages call nonexistent endpoints; tickets page is absent and reports are static. | Admin requests `/trips`; API defines `/transport/trips`; reports contain literal rows.                                                               | Align APIs/pages and label or replace placeholders.                                                                            |
| P2-04 | P2       | QA                     | No presentation-critical E2E or concurrency test coverage; formatting gate fails.           | No Playwright/e2e files; test scripts are dummy/config only; `format:check` failed.                                                                  | Add focused E2E/integration coverage and repair format gate.                                                                   |

## 13. Required Fixes Before Company Demo

1. Objective: make seat claims atomic and expiry-safe. Impacted modules: `apps/api/src/seats/*`, `packages/database/src/schema/transport.ts`, migrations, integration tests. Suggested tests: two concurrent same-seat hold requests; expired hold becomes available. Recommended Codex model: GPT-5.6 Sol High.
2. Objective: enforce authenticated ownership for holds, checkout, orders, and tickets. Impacted modules: `apps/api/src/seats/*`, `checkout/*`, `tickets/*`, auth guards/controllers, passenger auth integration. Suggested tests: cross-user hold/order/ticket access returns forbidden. Recommended Codex model: GPT-5.6 Sol High.
3. Objective: add server-side admin role authorization. Impacted modules: `apps/api/src/auth/*`, `apps/api/src/admin/*`. Suggested tests: passenger JWT denied; admin JWT allowed. Recommended Codex model: GPT-5.6 Sol High.
4. Objective: restore the minimum passenger search-to-checkout journey. Impacted modules: passenger home/search route, `SeatSelector`, checkout pages/forms. Suggested tests: focused Playwright journey through trip detail and checkout entry. Recommended Codex model: GPT-5.6 Terra Medium.
5. Objective: add deterministic demo seed/accounts/reset/verification. Impacted modules: database seed/scripts and root `package.json`. Suggested tests: repeat reset/seed and verify expected account, trip, seat inventory. Recommended Codex model: GPT-5.6 Terra High.
6. Objective: render a real QR from an opaque ticket token. Impacted modules: ticket detail/success UI and QR dependency/component. Suggested tests: QR payload decode assertion. Recommended Codex model: GPT-5.6 Luna Medium.
7. Objective: prevent payment of expired orders and define duplicate-payment behavior. Impacted modules: `apps/api/src/checkout/*`, checkout schema/migration, integration tests. Suggested tests: expired order rejected; concurrent pay produces one payment/ticket. Recommended Codex model: GPT-5.6 Sol High.

## 14. Nice-to-Have Work

- Correct ticket-controller JWT user mapping and replace hard-coded passenger token.
- Align admin trips/fleet pages with actual transport API and label/remove static reports.
- Add Socket.IO entitlement validation, tracking freshness state, and clearer simplified-tracking labels.
- Add focused Playwright passenger/admin smoke tests and repair formatting warnings.

## 15. Recommended Execution Order

1. Seat atomicity and server expiry.
2. Authenticated ownership for hold/checkout/order/ticket flows.
3. Admin role guard.
4. Expired/duplicate payment hardening.
5. Deterministic demo reset, account, and trip seed.
6. Passenger search-to-checkout navigation.
7. Real QR.
8. Admin endpoint alignment, tracking hardening, and focused E2E/format cleanup.

## 16. Credit-Efficiency Notes

- Luna: QR rendering and static-report labeling are narrow UI tasks.
- Terra Medium: passenger route wiring and admin endpoint alignment are bounded integration tasks.
- Terra High: deterministic reset/seed needs database and demo-flow judgment.
- Sol: seat concurrency, checkout/payment idempotency, authorization, and WebSocket entitlement work require security/concurrency reasoning; use Sol High only for the first three critical tasks above.

## 17. Final Audit Handoff

Start the implementation campaign with P0-01, not visual polish. The current seat transaction is demonstrably not a lock: concurrent readers can both observe an available seat and insert holds. Pair that task with a real PostgreSQL concurrency test before trusting any completion claim. Next, remove client-supplied identity from public hold/checkout/order flows and add the missing admin role guard; these are independent security boundaries. The coordinator should treat the present passenger UI as an incomplete shell: it has no search route, no login/register interface, a dead checkout continuation, and a hard-coded demo identity absent from seed data. Do not schedule tracking sophistication ahead of these blockers. Require each task to preserve the one-file audit scope’s evidence with focused integration/E2E tests, then run all validation gates; build remains UNKNOWN because it timed out in this audit environment.
