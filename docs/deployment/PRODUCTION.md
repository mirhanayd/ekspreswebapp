# Production Deployment Foundation

The platform is migrating from an always-on NestJS/Render backend to a serverless-first topology. The migration is intentionally incremental so working passenger/admin flows remain available until equivalent Vercel handlers pass E2E.

## Target topology

- Passenger web: Vercel, `apps/passenger-web`.
- Admin web: Vercel, `apps/admin-web`.
- Driver web + driver BFF: Vercel, `apps/driver-web`.
- Durable database: Neon PostgreSQL/PostGIS.
- Realtime target: managed Pub/Sub; Ably is the initial migration target for trip-scoped vehicle location fan-out.
- Ephemeral hold state: PostgreSQL transactions and expiration. No additional Redis/KV is required for holds.
- Legacy compatibility API: Render/NestJS until issue #73 completes.
- Object storage: S3-compatible contract for future uploads.

## Driver serverless path

Issue #72 moves the driver application off the Render request path:

1. Driver login runs in a Node.js Next.js Route Handler on Vercel.
2. Credentials are verified against the Neon users table.
3. A signed HTTP-only JWT cookie identifies the driver.
4. Driver trip reads and mutations query Neon directly.
5. Every trip operation verifies that the JWT driver is assigned to the target trip.
6. GPS ingestion persists sampled durable points in PostGIS.
7. If `ABLY_API_KEY` is configured, accepted positions are published to `trip:<tripId>:location`.

Required driver Vercel runtime secrets/config:

- `DATABASE_URL`: Neon pooled PostgreSQL connection string with PostGIS database.
- `JWT_SECRET`: the same high-entropy signing secret used for the current staging identity contract.
- `TRACKING_HISTORY_INTERVAL_SECONDS`: optional; defaults to 30.
- `ABLY_API_KEY`: optional during #72; required when the managed realtime subscriber cutover is enabled.

`ABLY_API_KEY` is server-side only. Never expose it through a `NEXT_PUBLIC_*` variable.

## Passenger authentication checkpoint (#76)

Passenger `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` and
`GET /api/passenger/auth/me` run on Vercel's Node.js runtime against Neon. Server-side
session reads use the same service. Logout deletes the HTTP-only cookie locally.
Driver credentials and passenger credentials share framework-neutral services in
`packages/database/src/server`; neither auth path calls Render.

Before staging this checkpoint, configure the passenger project for both the deployment
scope being tested (Preview) and its staging domain (Production):

- `DATABASE_URL`: pooled Neon connection for the existing staging database.
- `JWT_SECRET`: same signing secret as the existing driver/legacy backend.

Do not create a new database, rotate the signing secret, or expose either variable with
`NEXT_PUBLIC_`. Existing sessions remain compatible. New registrations always create a
passenger. Email case remains unchanged for compatibility with existing accounts.
Registration passwords must fit bcrypt's 72-byte limit; existing login passwords retain
legacy verification behavior. Duplicate emails return 409; invalid sessions return 401
and Route Handler responses clear the invalid cookie. Session responses never include
password hashes and have `Cache-Control: no-store`.

The auth HTTP E2E test runs against a separate passenger process whose legacy API URL
points to a rejecting local endpoint. This gate proves auth independence; it does not
claim that transport, booking or realtime have migrated.

## Temporary passenger/admin path

Until issue #73 is complete, passenger non-auth HTTP, admin HTTP and Socket.IO requests may still target the Render NestJS API. Keep their current `API_URL` / `NEXT_PUBLIC_API_URL` values during the transition.

Do not delete or disable Render yet. It remains the rollback path while passenger booking, ticketing, admin operations and realtime subscription are migrated and tested.

## Tracking data policy

- PostgreSQL/PostGIS remains authoritative for durable sampled GPS history.
- Live fan-out is moving from Render Redis pub/sub + Socket.IO to managed realtime.
- The managed realtime channel is ephemeral transport, not the durable source of truth.
- Passenger authorization must be checked before issuing any realtime subscription capability in the final cutover.
- Default durable history interval remains 30 seconds per trip.

## Migration order

1. #72: move driver HTTP/login/GPS ingestion off Render.
2. Verify driver login/dashboard while Render is sleeping.
3. #73: migrate passenger auth/transport/seats/checkout/tickets.
4. Migrate admin APIs.
5. Replace passenger Socket.IO subscription with managed realtime token auth.
6. Move any remaining seat-hold/latest-location ephemeral requirements to a serverless-compatible store.
7. Run full passenger + driver + admin E2E.
8. Remove Render API/Key Value only after the replacement paths are verified.

## Object storage

Object storage remains separate from ticketing and GPS state. When uploads are introduced, use the existing S3-compatible environment contract and keep credentials only in provider secret stores.

## Scaling notes

Keep business invariants in PostgreSQL transactions and constraints. Realtime services carry ephemeral fan-out only. Avoid introducing Kafka, Kubernetes or microservices until measured load or operational ownership justifies them.
