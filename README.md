# Siirt Kurtalan Ekspres Demo MVP

A modern, responsive web application for a local bus company to showcase ticketing, real-time vehicle tracking, and seat reservations. This repository contains the monorepo foundation.

## Architecture

This project is a Turborepo-managed monorepo containing:

### Apps
- **`apps/passenger-web`**: Next.js (App Router) passenger interface.
- **`apps/admin-web`**: Next.js (App Router) admin dashboard.
- **`apps/api`**: NestJS backend API.
- **`apps/tracking-simulator`**: Node.js CLI script for GPS simulation.

### Packages
- **`packages/ui`**: React component library.
- **`packages/contracts`**: Shared TypeScript definitions and enums.
- **`packages/database`**: Drizzle ORM schemas and connections.
- **`packages/eslint-config`**: Shared ESLint configuration.
- **`packages/typescript-config`**: Shared TypeScript configuration.

## Development

1. Ensure Node.js v22.14.0 is installed.
2. Enable pnpm: `corepack enable pnpm`
3. Install dependencies: `pnpm install`
4. Run development servers: `pnpm dev`
