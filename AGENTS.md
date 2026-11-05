# Project Agent Rules & Contract

## 1. Product Goal

Develop the Siirt Kurtalan Ekspres bus platform as a modern passenger, driver and admin product with ticketing, live vehicle tracking, seat reservations and driver operations, while keeping the architecture suitable for a first real operator deployment.

## 2. Approved Stack

- **Web (Passenger, Driver & Admin):** Next.js App Router + TypeScript
- **API/BFF target:** Next.js Route Handlers + framework-neutral TypeScript server logic on Vercel
- **Legacy API during migration:** NestJS + TypeScript only as a temporary compatibility fallback
- **Main DB:** PostgreSQL
- **Geographic DB:** PostGIS
- **Cache/Hold target:** PostgreSQL transactions/expiration; no new Redis/KV unless a measured need is approved
- **Realtime target:** managed Pub/Sub (Ably is the initial migration target); durable GPS remains in PostGIS
- **Passenger alerts:** Web Push (PWA service worker + VAPID via `web-push`) for alighting notifications; the in-app banner is the fallback, and the dispatch log in PostgreSQL is authoritative
- **Object Storage:** S3-compatible storage (Cloudflare R2 is the initial target when uploads are introduced)
- **Map:** MapLibre GL JS
- **ORM/SQL:** Drizzle ORM
- **Containerization:** Docker Compose
- **CI/CD:** GitHub Actions
- **Package Manager:** pnpm
- **Production-like hosting target:** Vercel for web/serverless handlers + Neon PostgreSQL/PostGIS; Render is temporary legacy fallback until issue #73 completes

## 3. Source-of-Truth Documents

- `roadmap/otobus_web_app_sifirdan_sirket_sunumuna_roadmap.md` (Main Architecture & Planning)
- `docs/project/ROADMAP_SUMMARY.md`
- `docs/project/DELIVERY_WORKFLOW.md`
- `docs/project/CURRENT.md`
- `docs/deployment/PRODUCTION.md`

## 4. Repository Structure (Planned)

- `apps/passenger-web`
- `apps/driver-web`
- `apps/admin-web`
- `apps/api`
- `apps/tracking-simulator`
- `packages/ui`
- `packages/contracts`
- `packages/database`
- `packages/config`
- `infra/`

## 5. Branch Naming

- `feature/<issue-number>-<short-desc>`
- `bugfix/<issue-number>-<short-desc>`
- `chore/<issue-number>-<short-desc>`
- `docs/<issue-number>-<short-desc>`

## 6. Commit Convention

Use Conventional Commits (e.g., `feat:`, `fix:`, `chore:`, `docs:`).

## 7. Issue-to-Branch-to-PR Workflow

1. Read current issue.
2. Create branch from `main` using issue number.
3. Implement exactly the scope of the issue.
4. Create PR, link issue (`Closes #<issue-number>`).
5. Do not merge manually; wait for CI and approval.

## 8. Definition of Ready (DoR)

- Clear acceptance criteria are defined.
- UI/API contracts are agreed upon.
- Dependencies are identified.

## 9. Definition of Done (DoD)

- Code is pushed and passes CI/CD (lint, format, build).
- Tests are written and passing.
- Documentation (OpenAPI, README) is updated.
- Meets acceptance criteria.
- No direct commit to `main`.

## 10. Security Rules

- **NEVER** print or expose tokens, credentials, cookies, SSH keys, or secret values.
- **NEVER** change the repository visibility from PRIVATE.
- Do not commit `.env` files with actual secrets; use `.env.example`.
- Shared server authentication lives in `packages/database/src/server`; Route Handlers must reuse it.
- Passenger transaction identity must come from the canonical JWT principal (`userId`, `email`, `role`), never from client-supplied IDs.
- Admin and driver APIs must enforce signed JWT role checks server-side. NestJS routes may use `@Roles`; serverless Route Handlers must apply equivalent framework-neutral guards.
- Driver trip reads, mutations, passenger state changes, and GPS ingestion must verify that the JWT driver is assigned to the target trip.
- Passenger state is `pending`, `boarded`, `alighted` or `no_show`, enforced by a database constraint; the driver's current stop is device-local and is never a source of truth for tickets or boarding.
- Driver Route Handlers must revalidate the signed principal against the current users row on every request; deactivation and password reset increment `session_version` to revoke existing sessions.
- Admin driver provisioning and trip assignments use the shared Neon-backed service, a live admin role check, transaction-scoped conflict checks and `driver_admin_audit`. Never expose an account password in API responses or audit records.
- PostgreSQL transactions and constraints remain authoritative for seat, order, payment, ticket, boarding-state and durable tracking invariants. A seat may carry several tickets only on non-overlapping legs, enforced by the `tickets_seat_leg_excl` exclusion constraint; never relax it.
- Redis latest-location keys are ephemeral operational state and must have bounded TTLs.
- Managed realtime tokens must be short-lived, subscribe-only and scoped to the authenticated passenger's entitled trip channel.
- Managed realtime API keys are server-only and must never use a `NEXT_PUBLIC_*` name.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are server-only too (never `NEXT_PUBLIC_*`); the browser receives the public key from `GET /api/push/vapid-key`. Configure the same three values on the passenger and driver Vercel projects, because the driver GPS ingest path decides and sends alighting alerts.
- Alighting alerts are decided on the server from durable tracking data and the ticket's `orders.alightingLocationId` (route destination when unset); `alighting_notification_dispatches` has a unique `(ticket_id, threshold_km)` so every alert is sent once. Push subscriptions and preferences always come from the signed passenger principal, never from client-supplied user IDs.
- Production secrets belong in the hosting provider's secret store, never in Git.

## 11. Migration Rules

- Use Drizzle ORM for schema definitions.
- Always create idempotent migration scripts.
- Do not run manual destructive SQL commands in production.

## 12. Documentation Update Rules

- Any architectural change must update `AGENTS.md` and related `docs/`.
- Updates to `CURRENT.md` should happen when phases or blockers change.

## 13. Agent Output Format

- Be concise. Output short confirmations or markdown formatting.
- Only print exact commands required to run locally if manual intervention is needed.
- No verbose conversational filler.

## 14. Context Rule

- Read ONLY the current issue and specifically required documentation files. Do not scan or read the entire repository for every task to preserve context size.
