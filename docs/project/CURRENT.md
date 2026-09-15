# Current Project Status

## Verified Release Baseline

- Driver operations campaign `#64` has been merged to `main` by PR `#65`.
- Merge commit: `ce715677452aae46ae229c31de5821ddad8588cd`.
- PR #65 reported a green CI gate covering install, format, lint, typecheck, tests, production build, database checks and critical E2E journeys.

## Current Phase

Production deployment and storage foundation.

## Current Campaign

- GitHub issue: `#66 chore: production deployment and storage foundation`.
- Working branch: `chore/66-production-deploy-foundation`.
- Standardize API/web production environment variables.
- Keep PostgreSQL/PostGIS as the durable source of truth and Redis as the live tracking/cache layer.
- Replace inconsistent hard-coded live-location TTL values with `TRACKING_LATEST_TTL_SECONDS`.
- Persist a sampled GPS history in PostGIS using `TRACKING_HISTORY_INTERVAL_SECONDS` rather than writing every live update.
- Add a Render Frankfurt Blueprint for API/PostgreSQL/Key Value and a Vercel runbook for the three Next.js apps.
- Define an S3-compatible object-storage environment contract without coupling current product flows to a storage vendor.

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

- Run the full CI suite for issue #66.
- Review the Render Blueprint without storing secrets in Git.
- Merge only after CI is green.
- Provision Render/Vercel resources after the deployment configuration is merged.
- Perform physical-device HTTPS GPS QA after the hosted driver application is available.
