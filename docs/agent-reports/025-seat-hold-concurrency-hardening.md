# Seat Hold Concurrency Hardening Report

## 1. Scope

Fixed PostgreSQL-authoritative seat-hold acquisition, active-hold uniqueness, lazy expired-hold reconciliation, seat-map expired-hold presentation, and explicit-release synchronization. Added real PostgreSQL integration tests for concurrency, expiry, and release behavior.

Not addressed: checkout authorization or payment expiry, admin authorization, passenger UI/auth, QR, tracking, demo reset, ticket mapping, Playwright, or unrelated formatting warnings.

## 2. Original Race Condition

Two requests could begin transactions, each read the same `trip_seats` row as `available`, then each set it to `held` and insert an `active` `seat_holds` record. The transaction alone did not serialize those reads: there was no PostgreSQL row lock, guarded conditional update, or active-hold uniqueness constraint. A client timer was the only practical expiry behavior, so an expired `held` seat could remain unavailable indefinitely.

## 3. Final Concurrency Algorithm

`createHold` opens one database transaction and executes parameterized `SELECT ... FOR UPDATE` on the exact `(trip_id, seat_no)` row. After the lock is acquired, it marks any active hold with `expires_at <=` server time as `expired`, then queries for an active hold. It returns a conflict if an unexpired active hold exists or the seat is not `available`/recoverable `held`. Otherwise it updates the locked seat to `held`, increments its version, inserts the sole active hold with server-generated expiry, and commits. The competing request waits for the row lock, then sees the committed active hold and receives `ConflictException` (HTTP 409).

## 4. PostgreSQL Guarantee

PostgreSQL row locking serializes all hold attempts for the same `trip_seats` row across API processes. The second transaction cannot inspect/reconcile/claim that row until the first commits or rolls back. The partial unique index on `seat_holds(trip_seat_id) WHERE status = 'active'` independently rejects any attempt to create a second active hold for a seat. Neither guarantee relies on frontend, Redis, or process-local state.

## 5. Database Changes

- Schema change: `seatHolds` declares one partial unique index for `status = 'active'`.
- Index: `seat_holds_one_active_per_seat_idx` on `trip_seat_id` where status is active.
- Migration: `packages/database/migrations/0006_seat-hold-active-unique.sql`.
- Migration cleanup: deterministically retains the newest legacy active hold per seat and marks older duplicates released before creating the index; index creation is `IF NOT EXISTS`.

## 6. Hold Expiry

An active hold is `status = 'active'` and `expires_at >` current server time. During a new hold attempt, while holding the seat row lock, expired active records are marked `expired` and retained for audit history; the same transaction may then claim the seat. Seat-map reads do not write: a stored `held` seat without an unexpired active hold is returned as `available`. This prevents stale display state while transactional acquisition remains the authoritative reconciliation point.

## 7. Explicit Release

Release still requires the existing hold ID and owner ID. It now runs in a transaction, locks the related seat row, rechecks that the hold remains active, marks it `released`, and restores the seat to `available`. A repeated release receives the existing conflict response and leaves the seat unchanged. A different owner still receives not found under the existing ownership semantics.

## 8. API Behavior

- Successful hold: HTTP 201 default NestJS POST response, with `holdId`, `seatNo`, server `expiresAt`, and `ttlSeconds`.
- Conflicting unexpired/concurrent hold: `ConflictException`, HTTP 409, message `Seat <seatNo> is not available`.
- Expired hold reclaim: a later valid hold succeeds; stale record changes to `expired`.
- Release: successful release returns `{ released: true }`; repeated/non-active release returns `ConflictException` (HTTP 409).

## 9. Concurrency Integration Test

- Test file: `apps/api/src/seats/seats.integration.test.ts`.
- Database used: configured local PostgreSQL via `DATABASE_URL`.
- Synchronization method: two `SeatsService.createHold` promises are started together with `Promise.allSettled` against the same fixture seat; each service call opens an independent PostgreSQL transaction.
- Requests: two distinct UUID owners, same trip and seat.
- Actual result: not runtime-executed because PostgreSQL at `127.0.0.1:5432` refused the connection and Docker is unavailable in this environment.
- Expected final active hold count: 1. Expected final seat state: `held` and owned by the sole successful caller.

## 10. Other Integration Tests

| Test | Result | Evidence |
| --- | --- | --- |
| Expired hold reclaim | NOT_RUNTIME_EXECUTED | Test creates expired active hold, verifies map availability, then verifies new owner and old `expired` record. |
| Unexpired hold rejection | NOT_RUNTIME_EXECUTED | Test verifies second owner receives `ConflictException` and original active hold remains. |
| Release/reacquire | NOT_RUNTIME_EXECUTED | Test releases first owner then verifies second owner can acquire. |
| Repeated release | NOT_RUNTIME_EXECUTED | Test expects conflict and verifies zero active holds with available seat. |

## 11. Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm --filter @ekspres/database generate --name seat-hold-active-unique` | PASS | Generated migration, metadata journal, and snapshot. |
| `pnpm --filter api test` | PASS | Existing API Jest test passed. |
| `pnpm --filter api test:integration` | BLOCKED | Test loaded successfully but PostgreSQL connection to `127.0.0.1:5432` was refused. |
| `pnpm db:test:integration` | BLOCKED | Existing DB smoke tests also failed with the same refused PostgreSQL connection. |
| `pnpm format:check` | FAIL | Existing repository formatting issues plus new generated metadata/test formatting warnings. |
| `pnpm lint` | PASS_WITH_WARNINGS | Completed; repository has pre-existing warnings and Jest globals warnings in the new integration test. |
| `pnpm typecheck` | PASS | All seven Turbo typecheck tasks passed. |
| `pnpm test` | PASS | Default suite passed; integration test is intentionally separate. |
| `git diff --check` | PASS | No whitespace errors; line-ending warnings only. |

## 12. Files Changed

- `apps/api/src/seats/seats.service.ts`
- `apps/api/src/seats/seats.integration.test.ts`
- `apps/api/package.json`
- `packages/database/src/schema/transport.ts`
- `packages/database/migrations/0006_seat-hold-active-unique.sql`
- `packages/database/migrations/meta/_journal.json`
- `packages/database/migrations/meta/0006_snapshot.json`
- `docs/agent-reports/025-seat-hold-concurrency-hardening.md`

## 13. Dependencies Added

None.

## 14. Deviations

Runtime PostgreSQL validation could not run because Docker is unavailable and the configured local PostgreSQL port refused connections. No infrastructure was started or installed.

## 15. Remaining Related Risks

- The new integration suite must run against a migrated PostgreSQL database before P0-01 can be considered proven.
- Checkout still consumes holds by seat ID without participating in the new seat-row lock protocol; checkout hardening is explicitly out of scope and should be reviewed separately.
- Expired holds are reconciled lazily on hold attempts; no background sweeper changes stale database rows when no later attempt occurs.

## 16. Handoff

**FIXED_BUT_NOT_RUNTIME_PROVEN.** Source now serializes same-seat holds using PostgreSQL `FOR UPDATE` and adds a database partial unique index as a second guard. Expiry is server-authoritative during acquisition, and the seat map no longer displays expired holds as indefinitely held. The integration suite exercises the required concurrent, reclaim, rejection, release, and repeated-release paths using a real PostgreSQL client and isolated rows. It could not execute because Docker is not installed in this environment and the configured database endpoint at `127.0.0.1:5432` refused connections. The next coordinator should bring up PostgreSQL, apply migration `0006`, run `pnpm --filter api test:integration`, and only then mark P0-01 fixed and proven.
