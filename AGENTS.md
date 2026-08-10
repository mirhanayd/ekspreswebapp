# Project Agent Rules & Contract

## 1. Product Goal

Develop a Demo MVP of "Siirt Kurtalan Ekspres Bus Platform" – a modern, responsive web application for a local bus company to showcase ticketing, real-time vehicle tracking, and seat reservations, aiming for a 5-7 minute company presentation.

## 2. Approved Stack

- **Web (Passenger & Admin):** Next.js App Router + TypeScript
- **API:** NestJS + TypeScript
- **Main DB:** PostgreSQL
- **Geographic DB:** PostGIS
- **Cache/Hold:** Redis
- **Map:** MapLibre GL JS
- **ORM/SQL:** Drizzle ORM
- **Containerization:** Docker Compose
- **CI/CD:** GitHub Actions
- **Package Manager:** pnpm

## 3. Source-of-Truth Documents

- `roadmap/otobus_web_app_sifirdan_sirket_sunumuna_roadmap.md` (Main Architecture & Planning)
- `docs/project/ROADMAP_SUMMARY.md`
- `docs/project/DELIVERY_WORKFLOW.md`
- `docs/project/CURRENT.md`

## 4. Repository Structure (Planned)

- `apps/web-passenger`
- `apps/web-admin`
- `apps/api`
- `apps/tracking-sim`
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
- Passenger transaction identity must come from the canonical JWT principal (`userId`, `email`, `role`), never from client-supplied IDs.
- Admin APIs must declare `@Roles('admin')` and remain protected by the global JWT and roles guards.
- PostgreSQL transactions and constraints remain authoritative for seat, order, payment, and ticket concurrency invariants.

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
