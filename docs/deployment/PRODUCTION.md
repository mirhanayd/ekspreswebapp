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
- `NEXT_PUBLIC_MAPTILER_KEY`: recommended browser-facing MapTiler key, restricted to the driver web
  domains; used by the MapLibre route surface when no custom style URL is supplied.
- `NEXT_PUBLIC_MAP_STYLE_URL`: optional public MapLibre style JSON URL for a company-owned or
  alternative provider style. The style provider's attribution must remain visible in the map.
- `NEXT_PUBLIC_OPERATIONS_PHONE`: optional operations-center number for the driver "Ara" and
  "Sorun bildir" actions. Without it those buttons stay disabled.

The driver app is installable as a PWA (`/manifest.webmanifest`, `/sw.js`). The service worker
caches only hashed static assets, icons and an offline notice; `/api/*` responses and rendered
pages (passenger manifest, GPS, driver identity) are never cached. `sw.js` is served with
`Cache-Control: no-cache` so a new deployment replaces the worker on the next load.

`ABLY_API_KEY` is server-side only. Never expose it through a `NEXT_PUBLIC_*` variable.
Map tile keys are different: they are intentionally browser-facing, but must be domain-restricted
and must never be confused with server secrets.

## Driver account and assignment rollout (#96)

Apply migrations `0011_driver-admin.sql` and `0012_admin-driver-hardening.sql` before deploying
application code that reads the driver lifecycle columns. Take and verify a restore point before
running the additive migrations against staging. They do not alter existing accounts, passwords,
assignments or trip statuses.

An authenticated admin uses the operations/trips screen to create driver accounts with a
unique email and a server-generated temporary password (shown once), activate/deactivate an account,
reset its password,
and assign, replace or remove a trip driver. The same-origin admin Route Handlers enforce a
fresh database-backed admin session. `GET /api/admin/drivers` lists accounts;
`GET/PUT/DELETE /api/admin/trips/:tripId/driver` reads and changes an assignment.
`POST /api/admin/drivers`, `PATCH /api/admin/drivers/:id`, and
`POST /api/admin/drivers/:id/reset-password` manage account access. Passwords are hashed before
storage, never audited, and must be conveyed to the driver through a separate secure channel.
The temporary password is returned only in the account-creation response. Initial passwords and
resets revoke prior sessions when changed; deactivation invalidates
active sessions immediately. The driver API checks the current account row and assignment on
every request. Assignment writes lock the trip, serialize competing bus/driver assignments and
reject overlapping trips for either bus or driver. The one-driver-per-trip database index remains
authoritative. No public demo identity is suitable for real onboarding.

Staging verification order: migrate an isolated copy and run CI integration/E2E; apply the
additive migration to the verified staging branch with a tested restore procedure; deploy the
admin and driver previews; create a unique test account from the admin UI; exercise assignment,
replacement, revocation and unassignment through HTTPS. Do not deploy the new code against a
database that has not been migrated. Production rollout requires its own restore point and
credential review. `demo:reset` is local-only and must never run on Neon.

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
points to a rejecting local endpoint. This gate proves auth independence; transport and
seats have their own legacy-unavailable gates below.

## Passenger transport checkpoint (#78)

Passenger locations, configured routes, trip search and trip detail use the shared
framework-neutral transport service in `packages/database/src/server`. Public
`/api/transport/*` Route Handlers run in the Node.js runtime and query Neon directly.
Passenger Server Components reuse the same service instead of making a server-to-server
request to Render.

Trip filters are validated and applied in PostgreSQL. Dates use the existing
`YYYY-MM-DD` public contract and UTC day boundaries. Direct server consumers receive the
same JSON-safe date values as HTTP clients. These handlers require only the passenger
project's existing pooled `DATABASE_URL`; no Redis/KV or additional provider is needed.

The transport E2E gate starts the passenger application with its legacy API URL pointed
to a rejecting endpoint, then verifies locations, routes, filtered trips, trip detail,
invalid-input handling and the home server render. Seat availability/holds are covered
by the separate #80 checkpoint below.

## Passenger seat checkpoint (#80)

Passenger seat inventory, hold creation and hold release use the shared seat service in
`packages/database/src/server`. Public inventory is exposed at
`GET /api/seats/trip/:tripId`; authenticated hold/release handlers derive the passenger
identity only from the signed HTTP-only JWT cookie.

PostgreSQL row locks serialize competing requests for one seat. The partial unique index
on active holds remains a second database-level guard. Expired holds are marked durable
and stale `held` seat rows are repaired to `available`. Same-passenger retries return the
existing hold, and repeated owner release is idempotent. Purchased and blocked seats are
never changed by the hold service. No Redis/KV is used for this lifecycle.

The seat E2E gate runs against the legacy-unavailable passenger process and verifies
inventory, unauthenticated denial, authenticated hold, idempotent retry and release.
PostgreSQL integration tests additionally race two passengers, reclaim expired holds and
reject purchased/blocked seats.

## Passenger checkout checkpoint (#82)

Authenticated order creation, owner-only order detail and demo payment use the shared
checkout service in `packages/database/src/server` through Node.js Route Handlers at
`/api/checkout/order*`. The confirmation Server Component calls the same service
directly, so none of these paths proxy to Render.

The signed JWT principal is the only source of passenger identity. Order creation locks
the held seat, validates an active unexpired owner hold and derives `totalMinor` from the
database seat price. PostgreSQL transaction advisory locks serialize simultaneous uses
of one idempotency key, while the existing unique key remains the final constraint.
Payment locks the order and seat and atomically marks the order paid, consumes the hold,
purchases the seat, and creates exactly one payment and ticket. Retried order and payment
requests return the durable existing result. This checkpoint adds no payment provider or
new environment variable; the current payment remains an explicitly labelled demo.

The checkout E2E gate runs with the legacy API pointed at a rejecting endpoint and covers
hold, authoritative total, idempotent order creation, concurrent payment retries, ticket
creation and owner-only detail. PostgreSQL integration tests independently verify the
same concurrency and identity invariants.

## Passenger ticket checkpoint (#84)

Passenger ticket wallet, detail and QR reads use the shared ticket service in
`packages/database/src/server`. Authenticated Node.js Route Handlers expose
`/api/tickets*`; the ticket Server Components call the same service directly. Ownership
is derived from the signed JWT principal, and another passenger cannot read a ticket or
mint its QR payload.

QR values preserve the existing five-minute HS256 JWT contract (`purpose`, ticket ID,
ticket number and trip ID). `JWT_SECRET` stays server-side. Neither list nor detail
responses expose the durable `qrTokenHash`. No additional provider or environment
variable is required.

The legacy-unavailable E2E extends the booking journey through wallet, ticket detail and
QR claims. PostgreSQL integration tests cover ownership, response sanitization and
cancelled-ticket QR denial.

## Admin serverless checkpoint (#86)

Admin login verifies credentials and the admin role through the shared auth service, then
sets the admin application's HTTP-only JWT cookie. Overview, metrics, transport, ticket,
fleet and report reads use the framework-neutral admin service and same-origin Node.js
Route Handler. Every request revalidates the signed principal and admin role server-side.

Fleet reads no longer depend on the Redis latest-location snapshot. Active trip metadata,
route geometry and the newest durable position are queried from Neon/PostGIS; freshness is
derived from that persisted timestamp. Managed realtime remains responsible only for
ephemeral passenger fan-out after its own cutover.

The admin browser E2E runs with `API_URL` pointed at a rejecting legacy endpoint and covers
passenger-role denial, admin login, dashboard, tickets and fleet. PostgreSQL integration
also covers overview, transport, ticket detail, reports and the no-position fleet state.

## Passenger managed realtime checkpoint (#88)

Passenger tracking bootstrap now runs in the passenger Vercel project through
`GET /api/tracking/tickets/:ticketId/bootstrap`. It validates the signed passenger
principal, ticket ownership, active ticket state and the trip's `boarding`/`in_transit`
state before returning route geometry and the newest durable PostGIS position.

The browser obtains a five-minute signed Ably TokenRequest from
`POST /api/tracking/tickets/:ticketId/token`. Its capability grants only `subscribe`
on `trip:<tripId>:location`. The API key never reaches the browser, and the Ably SDK
uses the same-origin token endpoint for renewal. Driver GPS ingestion publishes the
same accepted position after durable PostGIS handling; a managed publish failure does
not discard the durable GPS write.

Configure the same server-only `ABLY_API_KEY` in both passenger and driver Vercel
Preview and Production scopes. No `NEXT_PUBLIC_ABLY_*` variable is used. Redis is not
the latest-position source: bootstrap/admin reads use `tracking_positions`. The legacy
Redis/Socket.IO services remain available only as rollback until final #73 E2E and the
explicit Render deletion approval.

## Passenger redesign and alighting notifications (#106)

The passenger app is a phone-width PWA (`/manifest.webmanifest`, `/sw.js`). The service worker caches
nothing; it only receives Web Push and focuses or opens the live-tracking screen when a notification is tapped.

**Trigger.** `recordDriverLocation` (driver Vercel project) calls the alighting notifier after every accepted
GPS fix. For each active, non-`no_show` ticket on the trip it computes the remaining road distance to the
ticket's alighting stop (`orders.alightingLocationId`, route destination when unset) along the stored route
geometry. The first time that distance is at or under 5 km, and again at 1 km, one row is claimed in
`alighting_notification_dispatches` (unique per ticket and threshold) and a Web Push is sent. If a GPS gap
jumps past a threshold, only the most urgent alert is sent. A switched-off threshold is recorded as
`disabled`, so turning it on later never replays it. Failures never reject the driver's GPS write.

**Delivery.** Passengers subscribe from the settings sheet (`POST /api/push/subscription`). Each alert goes
to all of a passenger's devices, at most 8 push requests at a time with a 4 s socket timeout each; one failing
device never stops the others. The service worker always shows the system notification (same tag, so it
replaces rather than stacks); when an app window is visible it is shown silently and the window also gets
the alert as an in-app banner.
Dispatches with no push delivery (no subscription, permission refused, VAPID unset) are offered to the open
app as banners by `GET /api/notifications/alighting`, and acknowledged with `POST .../ack`.

**Environment (server-only; never `NEXT_PUBLIC_*`).** Set the same values on the passenger **and** driver
projects: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` or https URL). Generate with
`npx web-push generate-vapid-keys`. Without them push is skipped and only in-app banners work.

**Migration.** `0013_alighting-notifications` adds `alighting_notification_dispatches`, `push_subscriptions`
and `notification_preferences` with `IF NOT EXISTS` guards, so it can be re-run safely. The demo and staging
seeds now create the 41-seat coach layout; existing staging buses keep their stored layout until re-seeded.

**Map worker.** maplibre-gl 6 starts its worker from `import.meta.url`, which a bundled build turns into a
`file:` URL, so the map would only paint its background. In passenger-web and driver-web,
`scripts/copy-maplibre-worker.mjs` (run by `pnpm dev` and `pnpm build`) copies the worker and its shared
chunk to `public/maplibre/`, and the map code calls `setWorkerUrl()`. Do not bypass the package `build`
script on Vercel.

**Timezone.** Trip and hold times are stored as zone-less wall-clock values and read back as UTC. Run the
seed and the apps with `TZ=UTC` (as Vercel and CI do); a local non-UTC machine shifts raw-SQL hold sweeps.

## Driver redesign (#108)

`apps/driver-web` is now a single screen at `/`; `/map`, `/passengers` and `/trips` redirect there. The driver
Route Handler accepts a fourth passenger state, `alighted`, which needs migration `0014_passenger-alighted`
(idempotent: it replaces the `passenger_boarding_status_check` constraint). Deploy the migration before the
driver app, otherwise "İndi" fails the constraint. Alighted passengers no longer receive alighting alerts.

Leaving a stop marks on-board passengers for that stop `alighted` and waiting passengers `no_show`, after a
confirmation when anyone is still waiting. The operations call and report buttons appear only when
`NEXT_PUBLIC_OPERATIONS_PHONE` is set.

## Driver stop data (#110)

Migrations run in order after `0014`. `0015_coach-41-seats` rewrites every `2+1` bus to the 41-seat layout and
adds the missing seats to trips that are not finished. Seat numbers on sold tickets do not change, but seats
1-39 move on the plan, so sold seats keep their number and not their old position.

`0016_seat-ticket-legs` needs the `btree_gist` extension (available on Neon) and replaces
`seat_ticket_unique_idx` with the exclusion constraint `tickets_seat_leg_excl`. Existing tickets default to the
whole route, so they keep their exclusivity.

`GET /api/driver/trips/:id/stops/:locationId` responds `403` to a driver not assigned to the trip and `404`
when the location is not on the route.

## Temporary compatibility path

The migrated passenger, admin and driver critical handlers no longer require
`API_URL` / `NEXT_PUBLIC_API_URL`. The remaining compatibility catch-all and legacy
simulator stay in the repository until the final cleanup milestone.

Do not delete or disable Render yet. It remains the rollback path while passenger booking, ticketing, admin operations and realtime subscription are migrated and tested.

## Tracking data policy

- PostgreSQL/PostGIS remains authoritative for durable sampled GPS history.
- Live fan-out uses ticket-scoped managed realtime; Render Redis pub/sub + Socket.IO is rollback-only.
- The managed realtime channel is ephemeral transport, not the durable source of truth.
- Passenger authorization is checked before every realtime TokenRequest; capability is subscribe-only and trip-scoped.
- Default durable history interval remains 30 seconds per trip.

## Migration order

1. #72: move driver HTTP/login/GPS ingestion off Render.
2. Verify driver login/dashboard while Render is sleeping.
3. #73: migrate passenger auth/transport/seats/checkout/tickets.
4. Migrate admin APIs.
5. Replace passenger Socket.IO subscription with managed realtime token auth (#88).
6. Confirm no remaining seat-hold/latest-location requirement needs Redis/KV.
7. Run full passenger + driver + admin E2E.
8. Remove Render API/Key Value only after the replacement paths are verified.

## Object storage

Object storage remains separate from ticketing and GPS state. When uploads are introduced, use the existing S3-compatible environment contract and keep credentials only in provider secret stores.

## Scaling notes

Keep business invariants in PostgreSQL transactions and constraints. Realtime services carry ephemeral fan-out only. Avoid introducing Kafka, Kubernetes or microservices until measured load or operational ownership justifies them.
