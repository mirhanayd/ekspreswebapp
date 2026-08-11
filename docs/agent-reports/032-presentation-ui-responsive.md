# Presentation-ready Responsive UI

## Scope

- Issue: #22.
- Branch: `feature/22-presentation-ui`.
- Deliver a cohesive, responsive presentation layer without changing the proven passenger or admin
  business flows.
- Use the written Siirt Kurtalan Ekspres brand direction because the repository contains no supplied
  reference artwork.

## Implementation

- Established shared passenger design tokens and reusable surface, action, field, and focus styles.
- Added a persistent branded passenger header/footer and a dark hero with a route-specific visual motif.
- Redesigned home search, results, trip detail, authentication, and registration for mobile-first use.
- Built a coach-shaped 2+1 seat selector with clear available, selected, held, and occupied states.
- Redesigned checkout, success, ticket wallet, signed-QR ticket, and live tracking surfaces around the
  real API data and security boundaries.
- Kept the MapLibre live view full-height beneath the branded application shell.
- Aligned the admin application to the same red, charcoal, stone, and white visual language while
  preserving its information-dense operational layout.
- Removed placeholder presentation elements and verified Turkish copy for encoding regressions.

## Browser Proof

The in-app browser exercised the production builds against the real API, PostgreSQL/PostGIS, Redis,
and tracking simulator.

- Passenger home was audited at 375, 390, 768, 1024, and 1440 CSS-pixel viewports.
- Search returned two real trips; trip detail and all audited pages had no page-level horizontal overflow.
- Demo passenger authentication protected seat selection as expected.
- Seat 7 was held, the countdown and server price appeared, and checkout navigation succeeded.
- The seeded ticket wallet rendered the real signed QR image.
- Ticket-entitled MapLibre tracking rendered one canvas, the correct route, live status, vehicle plate,
  ETA, and simulator speed.
- Admin login, dashboard, and ticket operations rendered real derived values at tablet and phone widths
  without page-level horizontal overflow.

## Validation

| Check                                      | Result                                  |
| ------------------------------------------ | --------------------------------------- |
| Passenger typecheck and lint               | PASS                                    |
| Passenger production build                 | PASS                                    |
| Admin typecheck and lint                   | PASS                                    |
| Admin production build                     | PASS                                    |
| Responsive widths 375/390/768/1024/1440    | PASS, no page-level horizontal overflow |
| Authenticated passenger critical-flow QA   | PASS                                    |
| Signed QR and simulator-backed live-map QA | PASS                                    |
| Authenticated admin responsive QA          | PASS                                    |
| Turkish mojibake scan                      | PASS                                    |
| Final demo reset and verification          | PASS                                    |

## CI Result

- PR: pending.
- Required check: pending.

## Status

READY_FOR_PR
