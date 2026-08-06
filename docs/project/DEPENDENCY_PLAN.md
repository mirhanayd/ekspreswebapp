# Dependency Plan

**Rule:** Do not install all future libraries now. Use just-in-time installation for each phase and record the reason.

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
