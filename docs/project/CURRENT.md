# Current Project Status

## Verified Release Baseline

- Driver operations campaign `#64` has been merged to `main` by PR `#65`.
- Merge commit: `ce715677452aae46ae229c31de5821ddad8588cd`.
- PR #65 reported a green CI gate covering install, format, lint, typecheck, tests, production build, database checks and critical E2E journeys.

## Current Phase

Production-like staging workflow verification.

## Current Campaign

- GitHub issue: `#68 ops: external production rollout and smoke test`.
- Working branch: `feature/68-staging-seed-e2e`.
- Add a guarded, non-global remote staging fixture that preserves existing user IDs.
- Exercise passenger booking/ticket/QR, admin operations, driver manifest/boarding/GPS and passenger
  WebSocket tracking over the deployed HTTPS topology.
- Verify Redis live state indirectly through the entitled passenger tracking UI and verify sampled
  `MOBILE_APP` history directly in PostGIS.

## Driver Capability Set

- Driver authentication is separately role-gated.
- Drivers can access only assigned trips.
- Assigned route stops are shown in operational order.
- Passenger manifests expose seat and company-owned booking contact details.
- Passenger status can be persisted as `pending`, `boarded` or `no_show`.
- Driver can update trip operational status (`scheduled`, `boarding`, `in_transit`, `completed`).
- Browser geolocation can publish `MOBILE_APP` positions for the assigned bus/trip.
- Mobile positions feed the same Redis snapshot/pub-sub pipeline consumed by passenger live tracking.

## Production Tracking Direction

- Redis contains the short-lived authoritative latest location and pub/sub stream.
- PostgreSQL/PostGIS stores sampled historical positions for analytics and operational history.
- Default latest-position TTL: 120 seconds.
- Default durable history interval: 30 seconds per trip.
- Driver/browser GPS remains foreground web GPS; lock-screen/background continuity requires a later native or platform-specific implementation.

## OBUS Boundary

No OBUS/Obilet credentials or APIs are required for the current deployment foundation. A future OBUS adapter can synchronize trips/manifests into the local canonical model without changing the driver UI contract.

## Next Gate

- Run the full local CI suite and open the issue #68 PR.
- Seed the remote staging fixture through a direct Neon connection without exposing it.
- Pass the full HTTPS E2E and PostGIS tracking-history verification.
- Perform physical-device HTTPS GPS QA.
- Close #68 only after all workflow evidence is recorded.
