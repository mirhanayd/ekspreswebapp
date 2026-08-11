# Deterministic Playwright Release Gate

## Scope

- Issue: #53.
- Branch: `chore/53-playwright-release-gate`.
- Run presentation-critical passenger and admin journeys against production builds and real local
  infrastructure.
- Make the same gate required in GitHub Actions.

## Implementation

- Added Playwright and a mobile Chromium configuration pinned to one worker and no retries.
- Added a cross-platform stack runner that resets demo data, starts four direct Node processes,
  waits for API, passenger, admin, and simulator health, and cleans exact process trees in `finally`.
- Added an optional simulator health endpoint that is enabled only for the E2E stack.
- Covered passenger search, protected login return, seat hold, server-priced checkout/payment,
  ticket issuance, signed QR, entitled tracking, MapLibre rendering, and responsive overflow.
- Covered passenger-to-admin denial, admin login, real dashboard data, ticket operations, live fleet,
  and responsive overflow.
- Fixed an authentication navigation race where `router.refresh()` cancelled the protected return
  navigation after the cookie had already been established.
- Added Redis and browser installation to CI before the required critical-journey step.
- Documented local install, build, headless, headed, reset, and lifecycle behavior.

## Runner Reliability

Playwright's Windows test-runner worker reproduced a documented upstream browser-shutdown hang after
otherwise-passing browser tests. A no-browser control exited normally, while minimal headed and
headless browser controls both reproduced the worker stall. The release gate therefore uses the
Playwright browser API directly inside the bounded stack runner, preserving the same locator-driven
browser proof while guaranteeing explicit cleanup and truthful exit codes.

## Local Validation

| Check                                     | Result                                     |
| ----------------------------------------- | ------------------------------------------ |
| Demo reset before suite                   | PASS                                       |
| Passenger purchase/QR/live journey        | PASS                                       |
| Passenger-to-admin denial                 | 403                                        |
| Admin dashboard/tickets/live fleet        | PASS                                       |
| MapLibre canvas and simulator live values | PASS                                       |
| Mobile page-level overflow assertions     | PASS                                       |
| Exact service process cleanup             | PASS                                       |
| End-to-end runner terminal result         | PASS                                       |
| Formatting                                | PASS                                       |
| Lint                                      | PASS (0 errors; 117 existing API warnings) |
| Typecheck                                 | PASS                                       |
| Unit tests                                | PASS                                       |
| Production build                          | PASS                                       |
| API integration                           | PASS (12/12)                               |
| Database integration                      | PASS (2/2)                                 |
| PostgreSQL/PostGIS verification           | PASS                                       |
| Deterministic demo verification           | PASS                                       |

## CI Result

- PR: #54.
- Required check: pending.

## Status

CI_PENDING
