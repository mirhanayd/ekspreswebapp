# Secure QR and Entitled Tracking Campaign

## Scope

- Issue: #48, follow-up to ticket/tracking foundations #11 and #12.
- Branch: `feature/48-secure-qr-tracking`.
- Secure the ticket QR contract and make the live map believable and ticket-entitled.

## Ticket QR

- New ticket secrets are SHA-256 hashes at rest; the database value is never returned to the passenger.
- The owned active-ticket endpoint issues a fresh five-minute signed QR payload.
- Cancelled or inactive tickets cannot obtain a QR payload.
- The passenger ticket page renders a real error-corrected QR image and displays its expiry.
- Active in-transit tickets remain in the active list even after scheduled departure time.

## Tracking Authorization

- Authenticated REST bootstrap verifies ticket ownership, active status, and a boarding/in-transit trip.
- Bootstrap returns route geometry, the latest Redis snapshot, trip context, and a five-minute tracking-only token.
- The WebSocket gateway verifies the scoped token and rechecks ticket/trip state in PostgreSQL before joining one bound room.
- Arbitrary client-controlled trip subscription events and wildcard CORS were removed.
- Cancelling the ticket revokes subsequent socket authorization.

## Route-Realistic Simulator

- Simulator selects only `in_transit` trips with PostGIS route geometry.
- Positions interpolate by distance along the LineString, include heading, sequence, source, speed, and timestamp, and publish every two seconds.
- Redis stores one expiring latest-position snapshot per active trip and publishes the same typed payload.
- `pnpm tracking:simulate` builds and starts the deterministic worker.
- `pnpm demo:reset` now clears tracking snapshots; `pnpm tracking:reset` is also available independently.

## Runtime Proof

| Scenario                                                       | Result |
| -------------------------------------------------------------- | ------ |
| QR response is signed/expiring and does not expose stored hash | PASS   |
| Cross-user tracking bootstrap denied                           | PASS   |
| Cancelled ticket QR and socket authorization denied            | PASS   |
| Entitled real socket receives `tracking:position`              | PASS   |
| Only the deterministic in-transit trip has a Redis snapshot    | PASS   |
| Sampled simulator point distance from route                    | 38.21m |
| Simulator interpolation/heading tests                          | 2/2    |
| API PostgreSQL integration tests                               | 11/11  |
| API, passenger, and simulator production builds                | PASS   |

## CI Result

- PR: #49.
- Required check: in progress.

## Status

LOCAL_RUNTIME_VALIDATION_COMPLETE
