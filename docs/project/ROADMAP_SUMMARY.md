# Roadmap Summary

This is the executable summary of the detailed roadmap.

## M0 Governance & Discovery

- Repository setup, GitHub Project, issues, and delivery workflow.

## M1 Foundation & Infrastructure

- Monorepo setup (Next.js + NestJS).
- Docker Compose (PostgreSQL/PostGIS + Redis).
- CI/CD quality gates.
- Database schema initialization.

## M2 Design System & Auth

- UI brand system, responsive shell.
- User registration and login flows.
- JWT session management.

## M3 Routes, Trips & Search

- Seed deterministic test data for locations and routes.
- Search API (by origin, destination, date).
- Search results UI with filtering.

## M4 Maps & Seat Inventory

- Trip detail page.
- Route map rendering (MapLibre).
- Seat layout and concurrency-safe seat holds (Redis TTL).

## M5 Checkout & Tickets

- Passenger details input.
- Test checkout flow (simulated payment).
- Order and ticket issuance in the database.
- Ticket list and QR code detail view.

## M6 Live Tracking

- Real-time location ingestion API.
- Simulated bus worker.
- WebSocket gateway for client updates.
- Live active ticket UI.

## M7 Admin, QA & Demo Deployment

- Admin dashboard for monitoring.
- Staging demo deployment.
- Security and responsive QA.
- Final presentation script rehearsal.
