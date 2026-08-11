# Final Release Readiness Audit

## Audit Scope

- Audit date: 2026-08-11.
- Product: Siirt Kurtalan Ekspres Bus Platform Demo MVP.
- Verified baseline: `main` at `63339e21ae419583051219bd9eec68f9ba041d97` (PR #54).
- Target: a controlled, local 5–7 minute company presentation.
- Audit issue: #55.

## Decision

**GO for the controlled local company-presentation Demo MVP.**

**NO-GO for a public staging release, pilot, or production deployment.** No public hosting target,
domain/TLS, production secrets, monitoring/error tracking, dependency security scan, PWA package, or
physical iOS Safari device pass is present. Real payments and vehicle GPS are intentionally simulated.

This distinction is deliberate: the roadmap's core demo success criterion is proven end to end, while
its later staging and production-operability requirements remain future pilot work.

## Exact Release Evidence

| Delivery                                          | Proof                    | Exact green CI run |
| ------------------------------------------------- | ------------------------ | ------------------ |
| Seat hold concurrency and expiry integrity        | PR #41, merge `c6d0ff43` | `31435647899`      |
| Canonical JWT passenger ownership                 | PR #43, merge `a257e606` | `31437135377`      |
| Admin roles and payment state integrity           | PR #45, merge `943263f1` | `31438364660`      |
| Deterministic demo and complete passenger journey | PR #47, merge `f185ad02` | `31441167442`      |
| Signed QR and ticket-entitled live tracking       | PR #49, merge `490ad2d9` | `31443403790`      |
| Authenticated admin operations                    | PR #51, merge `77e65257` | `31445681911`      |
| Presentation-ready responsive UI                  | PR #52, merge `d3d035b0` | `31447708182`      |
| Deterministic Playwright release gate             | PR #54, merge `63339e21` | `31487612943`      |

Every listed PR was merged only after its exact final head passed `Validate and Test`.

## Readiness Matrix

| Area                           | Result       | Evidence                                                                                      |
| ------------------------------ | ------------ | --------------------------------------------------------------------------------------------- |
| Passenger journey              | PASS         | Search → protected login return → seat → checkout → simulated payment → ticket → QR           |
| Live tracking                  | PASS         | Ticket entitlement, signed access, Redis snapshot, simulator movement, and MapLibre canvas    |
| Admin journey                  | PASS         | Passenger denial, admin login, dashboard, tickets, reports, transport, and live fleet         |
| Authentication and ownership   | PASS         | Canonical JWT principal; cross-user hold/order/payment/ticket/QR denial tests                 |
| Admin authorization            | PASS         | Global JWT/roles guards and explicit admin-only API enforcement                               |
| Seat/order/payment concurrency | PASS         | PostgreSQL locks and constraints; expiry reconciliation; one payment and one ticket invariant |
| Deterministic data             | PASS         | Guarded local reset, stable accounts, future trips, PostGIS route, seats, active ticket       |
| Responsive presentation        | PASS         | Cohesive passenger/admin UI and mobile Chromium overflow assertions                           |
| Build and schema               | PASS         | Clean Linux build, idempotent migrations, database check, PostGIS verification                |
| Automated release gate         | PASS         | Format, lint, typecheck, unit, build, DB integration, browser E2E, exact process cleanup      |
| Public staging                 | NOT READY    | No deployment target, domain, TLS, remote secret store, or external-network proof             |
| Production operations          | NOT READY    | No production monitoring/error tracking, backup/restore proof, or incident runbook            |
| PWA and physical iOS           | NOT VERIFIED | No manifest/icon install flow and no physical Safari/device acceptance pass                   |

## Security and Data Invariants

- Passenger transaction identity comes only from the validated JWT principal (`userId`, `email`,
  `role`), never from client-provided ownership identifiers.
- Admin endpoints require the `admin` role in addition to authentication.
- PostgreSQL transactions, row locks, and uniqueness constraints remain authoritative for seats,
  orders, payments, and ticket issuance; Redis is not the system of record.
- Ticket QR payloads are signed and short-lived, with ticket secrets hashed at rest.
- Tracking bootstrap and socket access require ticket entitlement.
- Demo reset rejects remote and production-like database targets.
- No real secret or `.env` file is committed.

These controls are sufficient for the Demo MVP proof. They are not a substitute for a production
threat model, rate limiting, dependency scanning, managed secret rotation, audit retention, or KVKK
operational review.

## Deterministic Presentation Runbook

Prerequisites: Docker Desktop, Node/pnpm, Chromium installed through Playwright, free ports
3000–3003, and internet access for external map tiles.

1. Start PostgreSQL/PostGIS and Redis with `pnpm infra:up`.
2. Install the browser once with `pnpm test:e2e:install`.
3. Prove the exact presentation stack with `pnpm test:e2e:full`.
4. Recreate stable presentation data with `pnpm demo:reset`.
5. Confirm invariants with `pnpm demo:verify`.
6. Start the applications with `pnpm dev` and the live scenario with `pnpm tracking:simulate`.
7. Present passenger web at `http://localhost:3000` and admin web at
   `http://localhost:3002` using the documented local demo accounts.

The Playwright runner itself resets data, starts production builds, checks four health endpoints,
executes both critical journeys, and terminates the exact process trees it created.

## Known Non-Blocking Debt

- API lint exits successfully with zero errors but reports 117 existing warnings, largely decorator
  injection and Jest-global false positives. This is maintenance debt, not a demonstrated demo-flow
  defect.
- GitHub Actions reports a Node 20 action-runtime deprecation notice for current action versions;
  jobs are automatically forced to Node 24 and pass.
- The presentation depends on a running local Docker engine and external map tiles.
- No offline screen-recording backup is stored in the repository; prepare one before an external
  meeting if network or device reliability is uncertain.
- Real payment-provider, GPS-device, notification, cancellation/refund, and production compliance
  integrations remain intentionally outside the Demo MVP.

## Roadmap Reconciliation

| Issue                                     | Disposition                                              | Evidence or boundary                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| #2 Monorepo/local infrastructure          | Complete                                                 | PR #18 plus current Docker and CI database proof                                                                           |
| #3 CI/logging/OpenAPI                     | Complete                                                 | Required CI, Pino, Swagger `/api/docs`, and exact green runs                                                               |
| #4 Brand/design/application shells        | Complete                                                 | PR #52                                                                                                                     |
| #5 Authentication/user ownership          | Complete                                                 | PRs #25, #43, and #47                                                                                                      |
| #6 Transport and deterministic seed       | Complete                                                 | PRs #27 and #47                                                                                                            |
| #7 Search and results                     | Complete                                                 | PRs #29, #47, and #52                                                                                                      |
| #8 Trip detail/map/timeline               | Complete                                                 | PRs #31, #49, and #52                                                                                                      |
| #9 Seat inventory/concurrency             | Complete                                                 | PRs #33 and #41                                                                                                            |
| #10 Checkout/payment/tickets              | Complete                                                 | PRs #35, #43, #45, and #47                                                                                                 |
| #16 Docker Compose/database init          | Complete                                                 | PostgreSQL/PostGIS and Redis services; migrations pass in CI                                                               |
| #20 API infrastructure                    | Complete                                                 | Redis, Pino, OpenAPI, and environment validation are present                                                               |
| #14 Security/accessibility/PWA/QA/staging | Demo subset complete; remainder not planned for this MVP | Security, responsive accessibility, QA, and release gate delivered; public staging, PWA, and production hardening deferred |

The broad #14 epic must not remain an ambiguous open blocker: its delivered Demo MVP subset is
accepted, and its staging/production remainder is explicitly deferred rather than misreported as
complete.

## Final Sign-Off

- Demo-critical P0/P1 blocker found by the automated release gate: **none**.
- Controlled local presentation readiness: **GO**.
- Public staging readiness: **NO-GO**.
- Pilot/production readiness: **NO-GO**.
- Required next action before the company presentation: run the deterministic preflight on the
  actual presentation machine and prepare an offline recording fallback.
