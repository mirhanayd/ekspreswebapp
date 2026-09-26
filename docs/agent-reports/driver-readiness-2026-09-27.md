# Driver production readiness audit — 2026-09-27

Tracking epic: #90. Initial UI implementation: #91 / PR #92. Historical visual reference: unmerged PR #63. Snapshot: main `47b813fe9600582321c7a145ccd74b767f936c1a` (2026-09-26, managed realtime).

## Verified source and hosted state

- Current GitHub main has dedicated Vercel Next.js driver BFF, framework-neutral shared services in `packages/database/src/server`, migrations `0009_driver-operations.sql` and `0010_tracking-history.sql`, ticket-scoped Ably token/publisher code, and a Neon/PostGIS tracking snapshot service.
- Vercel account contains `ekspres-driver-staging`, `ekspres-passenger-staging`, and `ekspres-admin-staging`; latest production-scoped deployments for the inspected main SHA were all READY.
- Driver deployed `/login` GET returned HTTP 200; unauthenticated `/api/driver/trips` GET returned 401. These do **not** validate a full authenticated driver-to-passenger tracking journey.
- Vercel seven-day grouped driver errors contain Sept 25 missing `DATABASE_URL` on a **prior** deployment; passenger logs contain a prior missing `JWT_SECRET` occurrence; SSL-mode deprecation/security warnings appear in driver/passenger logs. The current secret names/scopes and the latest successful runtime route must be independently checked.
- Live Neon inspection was blocked because the linked Neon tool requires the exact nonsecret project ID, which is not available in the connector or repository. Known identifying context: project name `ekspres-staging`, main branch, database `ekspres_staging`, Frankfurt/PostgreSQL16/PostGIS. Do not infer current migrations/indexes or readiness from code.
- Ably `ABLY_API_KEY` is consumed server-side and the passenger receives a five-minute subscribe-only TokenRequest bound to the ticket's trip. Actual Ably delivery, quota, and deployed configuration are not yet verified.

## Immediate product defects found in main

1. Current driver UI compresses trip, terminal, manifest, GPS, status and assignments into one long mobile screen, unlike the better user-approved visual prototype in #63. Issue #91 restores separate screens into the **real** driver app with live data, not demo state.
2. Deployed login publicly prefilled a known demo account and password. #91 removes prefill, but production must also disable/rotate public demo accounts and require separate real driver credentials.
3. `updateDriverTripStatus` currently permits arbitrary status transitions, including moving completed trips backwards. Add a server-enforced forward-only state machine and explicit authorized administrative override.
4. GPS accepts arbitrary client `recordedAt`, latitude/longitude within global ranges, and optimistic HTTP 201 even if `publishManagedTrackingPosition` returns false. Require timestamp/accuracy/geographical plausibility, bounded retries and actual persisted-versus-published health signals.
5. Driver HTTP success != passenger Ably receipt. Passenger app must mark locations live/delayed/stale based on age and connection; operator monitoring must distinguish lack of GPS from lack of publish.
6. Browser `watchPosition` is not reliable with a locked phone or suspended browser. Decide between a native/background-capable driver runtime or dedicated GPS equipment before claiming continuous tracking.
7. The historical driver frontend-only demo #63 and outdated documentation still exist; don't merge stale mock driver routes into current passenger app or trust old hybrid architecture documentation as current deployment evidence.
8. Data protection: minimize personal passenger phone/email visibility; add audited driver access, retention, and secure account lifecycle; verify old public demo logins are disabled before production.

## Sequential release gates before OBUS

| Gate | Acceptance evidence | Current state |
| --- | --- | --- |
| Source/environment audit | GitHub SHA, three Vercel settings, Neon ID/branch/database, PostGIS migrations, shared JWT/Ably key **presence by scope**, backup/rollback | GitHub/Vercel deployment checks partial; Neon ID and current env scopes not verified |
| Visual restoration | Passenger-style mobile home, route, stop detail, searchable manifesto, MapLibre, location diagnostics, account; genuine API data; mobile responsive visual approval | #91 / PR #92 in progress |
| Domain integrity | Assigned-driver role/session, current trip state, legal transitions, boarding stop integrity, rate limits, passenger PII and audit | Assignment guard exists; full hardening pending |
| GPS + Ably | Real-phone foreground updates, accurate timestamps, offline recovery, publish acknowledgment, entitled passenger live receipt, stale indicator, battery/background decision | Integration code present, end-to-end evidence pending |
| Operations | Safe seed, user/driver assignment, terminal sequencing, accurate manifest and boarding updates, rollback, PostGIS indexes | Staging script exists, production verification pending |
| Release tests | CI + Playwright mobile; real HTTPS route, driver login, boarding, GPS, Ably, entitled passenger, cross-trip denials; logs/monitoring | CI baseline exists for old flow, fresh integrated field test pending |
| Rollout | Operator-approved phone test, protected production credentials, deploy scopes, monitoring, rehearsed rollback; retire legacy only after parity | Pending |
| OBUS — **last** | Operator-provided API docs/credentials, trip+manifest sync, reconciliation and permitted boarding write-back | Deliberately deferred |

This report is **not** a production sign-off. No live production table or secret was mutated during the audit.
