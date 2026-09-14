# Current Project Status

## Verified Release Baseline

- Base SHA for the driver operations campaign: `673ca5e69144cf21f3109afd4184bf107d3e2120`.
- GitHub issue: `#64 Driver operations app without OBUS integration`.
- Working branch: `feature/64-driver-operations`.
- Previous Demo MVP passenger/admin release remains the compatibility baseline.

## Current Phase

Driver operations extension implemented on a feature branch and ready for repository quality gates.

## Current Campaign

- Add an OBUS-independent driver workflow backed by the existing PostgreSQL/Redis/NestJS platform.
- Add a `driver` role and trip assignments.
- Add driver-only trip, manifest, boarding-state, trip-status and GPS APIs.
- Feed mobile GPS into the existing Redis snapshot/pub-sub pipeline used by passenger live tracking.
- Add a mobile-first `apps/driver-web` interface aligned with the passenger visual language.

## Driver Capability Set

- Driver authentication is separately role-gated.
- Drivers can access only assigned trips.
- Assigned route stops are shown in operational order.
- Passenger manifests expose seat and company-owned booking contact details.
- Passenger status can be persisted as `pending`, `boarded` or `no_show`.
- Orders can retain boarding/alighting location IDs; legacy/full-route orders fall back to the route origin for boarding grouping.
- Driver can update trip status (`scheduled`, `boarding`, `in_transit`, `completed`).
- Browser geolocation can publish `MOBILE_APP` positions for the assigned bus/trip.
- Mobile positions update `tracking:latest:<tripId>` and publish to `trip_locations`, preserving the existing passenger tracking consumer.
- Deterministic demo seed includes a driver account and trip assignments.

## OBUS Boundary

No OBUS/Obilet credentials or APIs are required for the driver demo. A future OBUS adapter can synchronize trips/manifests into the local canonical model without changing the driver UI contract.

## Validation Status

- Repository write access is working and implementation commits are being created on `feature/64-driver-operations`.
- The execution container still cannot clone `github.com` directly and does not have the repository dependencies installed, so local pnpm quality gates are not claimed as passed.
- `apps/driver-web` is a new pnpm workspace. `pnpm-lock.yaml` must be regenerated with pnpm before a frozen-lockfile CI run can pass.
- Browser geolocation requires HTTPS in production (localhost is the normal development exception); ordinary mobile web pages do not guarantee background/lock-screen GPS continuity.

## Next Campaign

- Run `corepack enable && pnpm install` in a normal repository clone to regenerate `pnpm-lock.yaml`.
- Run migration/reset and full format/lint/typecheck/test/build gates.
- Add physical-device QA for GPS behavior.
- Integrate OBUS only after official credentials and API contracts are supplied.
