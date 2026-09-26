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

1. **Source/environment audit.** GitHub/Vercel deployment checks are partial. Verify three Vercel runtime variable scopes, Neon project ID/branch/database, PostGIS migrations, JWT/Ably configuration presence and rollback.
2. **Visual restoration.** Issue #91 / draft PR #92 restores the original mobile product hierarchy, an authentic MapLibre map, stop detail, filterable manifest and live GPS diagnostics using actual assigned-driver APIs.
3. **Domain integrity.** Assignment guard exists; add explicit legal trip transitions, current stop progression, authenticated session revalidation, rate limits and audited passenger contact access.
4. **GPS + Ably.** Verify real-phone foreground GPS, accuracy, offline recovery, server persistence and pub/sub acknowledgment, entitled passenger receipt, stale detection and a locked-screen/background strategy.
5. **Operations.** Validate safe staging seed, driver assignment, stop/manifests, boarding updates, PostGIS indexes, monitoring and protected rollback.
6. **Release tests.** Pass CI and Playwright visual checks, then test real HTTPS login, boarding, GPS, Ably, entitled passenger map and cross-trip denials on a physical phone.
7. **Rollout.** Obtain operator acceptance, disable public demo credentials, verify deployed Preview/Production environments, set alerting and rehearse rollback; retire legacy only after parity.
8. **OBUS — last.** Obtain official operator-issued API contracts and credentials, then build trip/manifest sync, conflict handling, reconciliation and permitted boarding write-back.

This report is **not** a production sign-off. No live production table or secret was mutated during the audit.
