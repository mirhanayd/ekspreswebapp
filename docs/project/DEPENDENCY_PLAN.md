# Dependency Plan

**Rule:** Do not install all future libraries now. Use just-in-time installation for each phase and record the reason.

### M1 Foundation Dependencies

| Package       | Version    | Location            | Type | Immediate Purpose    | Why it is required now          |
| ------------- | ---------- | ------------------- | ---- | -------------------- | ------------------------------- |
| `drizzle-orm` | `^0.45.2`  | `packages/database` | Prod | Database ORM         | Core requirement for db queries |
| `drizzle-kit` | `^0.31.10` | `packages/database` | Dev  | Migration tool       | Generate/run migrations         |
| `pg`          | `^8.23.0`  | `packages/database` | Prod | Postgres driver      | Connect to PostgreSQL           |
| `@types/pg`   | `^8.21.0`  | `packages/database` | Dev  | TypeScript types     | Type safety for pg              |
| `dotenv`      | `^17.4.2`  | `packages/database` | Prod | Env var loader       | Read .env for local tooling     |
| `tsx`         | `^4.23.11` | `packages/database` | Dev  | TypeScript execution | Run verify script directly      |

## M1 Foundation & Infrastructure

- `next` / `react` / `react-dom` (Next.js App Router for UI)
- `@nestjs/core` / `@nestjs/common` (NestJS backend framework)
- `drizzle-orm` / `pg` (Database ORM and driver)
- `zod` (Validation)
- `pino` (Structured logging)

## M2 Design System & Auth

- `lucide-react` (Icons)
- `@nestjs/jwt` / `bcrypt` (Authentication)

## M3 Routes, Trips & Search

- `date-fns` (Date manipulation)

## M4 Maps & Seat Inventory

- `maplibre-gl` (Vector mapping)
- `redis` / `ioredis` (Seat hold locking)

## M5 Checkout & Tickets

- `qrcode` (Ticket generation)

## M6 Live Tracking

- `@nestjs/websockets` / `socket.io` (Real-time updates)
