# PR #41 CI Recovery Report

## 1. Metadata

- Repository: `mirhanayd/ekspreswebapp`
- PR: #41
- Issue: #40
- Branch: `fix/40-seat-hold-concurrency`
- Starting commit: `ae88ce5c8d1d9e59a94b24f7d488c1604dbe198e`
- Recovery commit: `303508ed9b09d509c8a9c764a07e13bf1952a704`
- Merge commit: `c6d0ff43b55d86aefa7b74109f5850d1f2e9e754`

## 2. Original CI Failure

- Workflow: CI
- Job: Validate and Test
- Failed step: Format Check
- Command: `pnpm format:check`
- Root cause: Prettier found formatting differences in the new seat integration test, report 025, Drizzle journal, and Drizzle snapshot. No application or database logic failure was present.

## 3. Fix Applied

- Formatted only the four files reported by CI.
- Updated report 025 to reflect the completed PostgreSQL runtime proof.

## 4. Scope Control

No seat algorithm, database invariant, test assertion, dependency, workflow rule, or unrelated application code was changed.

## 5. Local Validation

| Command                              | Result | Notes                                |
| ------------------------------------ | ------ | ------------------------------------ |
| `pnpm format:check`                  | PASS   | Repository formatting gate passed.   |
| `pnpm lint`                          | PASS   | Existing warnings did not fail lint. |
| `pnpm typecheck`                     | PASS   | All workspace typechecks passed.     |
| `pnpm test`                          | PASS   | All configured unit suites passed.   |
| `pnpm infra:up`                      | PASS   | PostgreSQL and Redis running.        |
| `pnpm db:migrate`                    | PASS   | Migrations applied successfully.     |
| `pnpm --filter api test:integration` | PASS   | Seat suite passed 5/5.               |
| `pnpm db:test:integration`           | PASS   | Database smoke passed 2/2.           |
| `git diff --check`                   | PASS   | No whitespace errors.                |

## 6. PostgreSQL Concurrency Proof

- Simultaneous same-seat acquisition: exactly one succeeded.
- Expired hold reclaim: passed.
- Active-hold rejection: passed.
- Release and reacquire: passed.
- Repeated release safety: passed.
- Total seat integration tests: 5/5 passed.

## 7. Database Verification

- Migration: passed.
- PostgreSQL connectivity: passed.
- PostGIS availability: passed.

## 8. GitHub Actions Result

- Recovery run: `31435647899`
- Required check: `CI / Validate and Test`
- Result: PASS (3m13s).

## 9. Git Operations

- Commit: `303508ed9b09d509c8a9c764a07e13bf1952a704`
- Push: succeeded without force.
- PR state: merged.

## 10. Merge Result

MERGED — `c6d0ff43b55d86aefa7b74109f5850d1f2e9e754`

## 11. Issue Result

Issue #40 closed automatically at merge.

## 12. Remaining Blockers

None

## 13. Handoff

PR #41 is complete. PostgreSQL row locking, one-active-hold uniqueness, server-authoritative expiry, and release behavior are retained and runtime-proven. The next campaign should address authenticated passenger ownership without changing the seat concurrency algorithm.

Final PR #41 status: COMPLETE
