# Driver staging fixture refresh (2026-09-29)

The Neon `ekspres_staging` database was inspected read-only. Older demo trips were stale and had associated bookings, so rewriting their dates or assignments would affect existing records. The `pre-driver-readiness-2026-09-27` snapshot remains intact.

`staging:seed` now creates a separate deterministic driver-readiness route, bus, four trips, seats, assignments and three ticketed passengers with pending, boarded and no-show states. It does not migrate schemas, truncate data, create users or rewrite the older trip IDs. It requires `STAGING_SEED_CONFIRM=ekspres-staging`, the exact `ekspres_staging` database name and a local or Neon host. Before writing, a transaction rejects unrelated orders, tickets, seats or driver assignments on its own fixture trips. Existing terminal records are not updated. Calendar dates are calculated in `Europe/Istanbul`.

`staging:verify` performs read-only checks for one current active trip, three future trips, 156 seats, four assignments, at least three active tickets and four route stops. Running the seed again intentionally resets only the dedicated fixture records and must be done when the staging operator approves the reset of that demo scenario.

The new fixture must still be run and verified against Neon after code review and CI. Authenticated HTTPS driver acceptance remains a separate gate. OBUS integration has not started.
