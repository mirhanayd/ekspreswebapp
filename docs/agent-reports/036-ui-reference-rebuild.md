# UI Reference Rebuild

## Metadata

- Branch: `feat/ui-reference-rebuild`
- Issue: [#58](https://github.com/mirhanayd/ekspreswebapp/issues/58)
- PR: [#59](https://github.com/mirhanayd/ekspreswebapp/pull/59)
- Starting main SHA: `bba3caf7e2dfcf08a2e88201baf2fd57d133abcb`
- Final main SHA: recorded in the follow-up docs commit
- Merge SHA: recorded in the follow-up docs commit

The branch was cut from `feature/57-presentation-ui-redesign` rather than directly from `main`.
That branch was an open, unmerged attempt at this same campaign (PR #57) whose stated direction was
to take `/ui` as inspiration and re-render it in the previous brand palette — the opposite of this
campaign's directive. Cutting from it keeps its genuinely functional work (PostGIS EWKB coordinate
parsing, route-progress projection, server-side sort/filter, the brand assets) instead of
rebuilding it, while this campaign replaces the visual layer it produced. PR #57 is superseded.

## Canonical References

Every image under `ui/`:

| File                           | Pixels    | Inferred viewport                                 |
| ------------------------------ | --------- | ------------------------------------------------- |
| `ui/mobile-home-reference.png` | 335 × 724 | 375 × 810 phone screen                            |
| `ui/trip-search-reference.png` | 337 × 689 | 375 × 767 phone screen                            |
| `ui/live-map-reference.png`    | 372 × 747 | 390 × 783 phone screen (device mock with padding) |

Colour and geometry were not eyeballed. Each PNG was decoded into a canvas and sampled: a quantised
palette histogram, a centre-column band scan, point probes on named controls, and connected-region
bounding boxes for masked colours. That produced the numbers the implementation targets.

## Reference Mapping

| Reference                   | Route                          | Implementation                                                                                                 |
| --------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `mobile-home-reference.png` | `/`                            | `app/page.tsx` + `components/BottomNav.tsx`                                                                    |
| `trip-search-reference.png` | `/search`                      | `app/search/page.tsx`, `components/RoutePanel.tsx`, `components/JourneyCard.tsx`, `components/SearchPanel.tsx` |
| `live-map-reference.png`    | `/trips/[id]/live`             | `app/trips/[id]/live/LiveMapView.tsx`                                                                          |
| — (derived)                 | `/trips/[id]`                  | `app/trips/[id]/page.tsx`                                                                                      |
| — (derived)                 | `/trips/[id]/seats`            | `app/trips/[id]/seats/{page,SeatSelector}.tsx`                                                                 |
| — (derived)                 | `/trips/[id]/checkout`         | `app/trips/[id]/checkout/{page,CheckoutForm}.tsx`                                                              |
| — (derived)                 | `/trips/[id]/checkout/success` | `app/trips/[id]/checkout/success/page.tsx`                                                                     |
| — (derived)                 | `/tickets`                     | `app/tickets/page.tsx`                                                                                         |
| — (derived)                 | `/tickets/[ticketId]`          | `app/tickets/[ticketId]/page.tsx`                                                                              |
| — (derived)                 | `/canli`                       | `app/canli/page.tsx` (new tracking entry point)                                                                |
| — (derived)                 | `/login`, `/register`          | `components/AuthShell.tsx`, `components/AuthForm.tsx`                                                          |
| — (derived)                 | `/hesap`                       | `app/hesap/page.tsx`                                                                                           |

## Old UI Removed

- The whole previous token set. The palette was brand red + warm charcoal + ember, explicitly
  derived from the company assets rather than from `/ui`. It is gone.
- `components/SiteHeader.tsx` and `components/SiteFooter.tsx` are deleted. The references are
  headerless phone screens with a floating tab pill and no footer.
- The marketing home page — hero grid, "Nasıl çalışır?" three-step section, service-promise section,
  stat tiles, section headers — is gone. The reference home is a single app screen.
- Every `globals.css` component class was rewritten: `.app-sheet`, `.shell`, `.page`, `.panel`,
  `.panel-sheen`, `.card-link` shadows, `.btn-secondary`, `.btn-on-dark`, `.icon-btn-light`,
  `.chip`, `.segmented`, `.badge-*`, `.data-tile`, `.facts-strip`, `.floating-nav`, `.stop-tab`,
  `.action-bar` and the rest.
- The old seat visuals (bordered seat buttons, cockpit shell with hard borders), the old ticket
  presentation, the old map overlays and the old auth split-screen are all replaced.

## New UI Architecture

Tokens live in `packages/ui/tailwind.config.js`, sampled from `/ui`:

| Token                   | Value                 | Source                                    |
| ----------------------- | --------------------- | ----------------------------------------- |
| `sage-100`              | `#E8F3E9`             | home canvas                               |
| `cream-200`             | `#F3F2E7`             | search canvas                             |
| `ink-900`               | `#051A09`             | chips, buttons, tab bar, journey panel    |
| `lime-400` / `lime-500` | `#CEDE44` / `#BCCB30` | active tab, selected date, journey rail   |
| `amber-400`             | `#F7AA12`             | duration pill, active stop, live progress |
| `butter-200`            | `#FFFA93`             | facts strip                               |
| `signal-500`            | `#F0632A`             | map destination pin, error tone           |

`brand-*` and `ember-*` survive as aliases onto the new ink and amber scales so the admin console —
which `/ui` does not specify and which this campaign deliberately leaves alone — inherits the new
system without a speculative rewrite.

Components:

- `BottomNav` — the floating five-slot tab pill; stands down on the immersive live route.
- `TopNav` — the `lg` counterpart, same near-black capsule vocabulary.
- `ScreenHeader` — the 56px circular control / centred title / matching slot top row.
- `RoutePanel` — the tinted route card with dotted map texture, dashed path and vehicle badge.
- `JourneyCard` — the lime rail + rotated wordmark + journey block + `#FFFA93` facts strip card.
- `SearchPanel`, `AuthShell`, `AuthForm`, `BookingSteps`, `PrintButton`, `LogoutButton`.

Shared classes carry the reference geometry: `.screen`, `.screen-pad`, `.top-row`, `.display-1`,
`.code-xl` / `.code-lg` / `.code-2xl`, `.chip`, `.segmented`, `.date-cell`, `.rail`, `.facts-strip`,
`.tab-bar`, `.stop-tile`, `.map-fab`, `.status-pill`, `.panel-dark`, `.duration-pill`.

## Pixel-Matching Work

Rendered geometry was measured in the browser and compared against the boxes extracted from the
PNGs, at the reference viewport:

| Element               | Reference                     | Implemented                   |
| --------------------- | ----------------------------- | ----------------------------- |
| home tab pill         | x21 y710 324×~72, radius full | x20 y722 335×72               |
| home active tab tile  | lime `#CEDE44`, ~48           | 48×48, radius 18, `#CEDE44`   |
| home search capsule   | x293 y185 50×111              | x295 y185 56×112              |
| home category chip    | y311, height 50               | y321, height 49               |
| home display heading  | ~52px, semibold               | 52px, weight 600              |
| search back control   | x26 y50 55×56                 | x24 y64 56×56                 |
| search active segment | x150 y59 92×42                | x152 y71 95×42                |
| search route panel    | y131, height ~142, `#E9E7D5`  | y144, height 162, `#E9E7D5`   |
| search filter chip    | x26 y294 91×49, white         | x24 y300 101×49, white        |
| search selected date  | 57×70, `#BCCB30`              | 57×70, `#BCCB30`              |
| search filter control | 48×48 circle, white           | 48×48 circle, white           |
| result card rail      | 63px wide, lime               | 63px wide, `#BCCB30`          |
| result facts strip    | `#FFFA93`, ~76 tall           | `#FFFA93`, 68 tall            |
| live stop tile        | ~74×74, amber when active     | 74×74, radius 24, `#F7AA12`   |
| live map control      | ~48 glass circle              | 48×48, `white/85` + blur      |
| live journey panel    | ~331×138, radius ~24          | 343×152, radius 28, `#051A09` |

Decisions worth recording:

- **Canvas per surface.** The references use two grounds — sage on home, cream on search. Rather
  than averaging them, both are tokens: browse surfaces (home, tickets, account, tracking hub, auth)
  are sage, booking surfaces (search, trip, seats, checkout, confirmation) are cream.
- **Near-black is the action colour, lime is the selection colour.** In all three references the
  filled action (`Searching`, the active chip) is near-black and lime only ever marks the current
  choice. Buttons follow that; lime is reserved for selected seats, the active tab and the date cell.
- **Long Turkish place names.** The reference journey block leads with a three-letter airport code.
  `Diyarbakır` is not three letters, and at the reference type size it clipped. Names longer than
  eight characters step down one size (`code-lg`) instead of being cut off, and the origin column is
  content-sized so the destination keeps the remaining width.
- **The result card has one band the reference does not show.** The reference card is cut off by the
  screen edge below its facts strip and shows no price or CTA. Booking needs both, so a third band
  in the same stacked composition carries them.
- **Live tracking is a full-screen view.** The reference has no tab bar on that screen and is
  dismissed by its own circular control, so the tab pill stands down on `/live`.

## Responsive Validation

Every route rendered and screenshotted at **375, 390, 430, 768, 1024 and 1440**, with a
horizontal-overflow assertion at each width. Routes covered: `/`, `/search`, `/search` with query,
`/trips/[id]`, `/trips/[id]/seats`, `/trips/[id]/checkout`, `/trips/[id]/checkout/success`,
`/tickets`, `/tickets/[id]`, `/trips/[id]/live`, `/canli`, `/login`, `/register`, `/hesap` — 84
renders. Final result: no horizontal overflow anywhere.

Two real defects were found and fixed by that sweep:

1. Checkout overflowed to 439px at 375/390/430. The two grid children defaulted to `min-width:auto`,
   so the route panel's intrinsic width escaped the viewport.
2. The trip-detail duration pill wrapped onto two lines inside the route panel.

## Functional Regression Validation

No API, schema, migration, auth, seat-locking, payment-state, QR-signing or tracking-authorization
code was touched. This campaign changed the passenger app's presentation layer and its tokens only.

Because Docker Desktop is not running on this machine, PostgreSQL/PostGIS, Redis and the NestJS API
could not be started, so the deterministic Playwright gate could not be executed locally. Every
screen was instead rendered against a local fixture API serving the real endpoint shapes, and every
flow was walked in the browser: home → search → results → trip → seats (hold + countdown + release)
→ checkout → demo payment → confirmation → ticket → QR → live tracking, plus the tickets wallet, the
tracking hub, sign in, sign up and the account screen.

The release gate itself runs in CI against real infrastructure, and every selector it depends on was
either preserved or deliberately updated:

| Contract                                                                     | Status                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `getByRole('heading', { level: 1 })` on `/`                                  | preserved (text now `Yolun Hazır`)                     |
| `getByLabel('Nereden')` / `getByLabel('Nereye')`                             | preserved, now on `/search` behind `Aramayı düzenle`   |
| `Sefer Ara` submit                                                           | preserved                                              |
| `Seferi seç` / `Koltuk seç` links                                            | preserved, breakpoint-exclusive so exactly one renders |
| `Koltuk 7, available` seat aria-label                                        | preserved                                              |
| `Ayırma süresi` hold countdown                                               | preserved                                              |
| `Devam et`                                                                   | preserved, breakpoint-exclusive                        |
| `Biletinizi tamamlayın`, `Ad *`, `Soyad *`, `Telefon`, `E-posta`, `Demo Öde` | preserved                                              |
| `Biletiniz hazır!`, `Bileti ve QR'ı aç`                                      | preserved                                              |
| `bilet QR kodu` image alt                                                    | preserved, still the real signed QR                    |
| `TKT-DEMO-AKTIF`, `Otobüsü canlı izle`                                       | preserved                                              |
| `Canlı takip aktif`, `56 SKE 01`, `72 km/sa`, single `canvas`                | preserved                                              |

The previous CI failure was a strict-mode violation: `getByLabel('Nereye')` matched both the
destination select and a section labelled `Nereye gidiyorsun?`. That section no longer exists.

## Automated Validation

| Command                                      | Result                                            |
| -------------------------------------------- | ------------------------------------------------- |
| `pnpm --filter passenger-web typecheck`      | pass                                              |
| `pnpm --filter admin-web typecheck`          | pass                                              |
| `pnpm --filter passenger-web lint`           | pass, 0 warnings                                  |
| `pnpm --filter admin-web lint`               | pass, 0 warnings                                  |
| `npx prettier --check` on every changed file | pass                                              |
| `pnpm build`                                 | pass                                              |
| Rendered sweep, 14 routes × 6 widths         | pass, no horizontal overflow                      |
| `pnpm format:check` (repository-wide)        | not usable locally — see note                     |
| `pnpm test:e2e`                              | not runnable locally — Docker Desktop unavailable |

`pnpm format:check` reports 28 files locally, including files this campaign never touched
(`README.md`, `package.json`, `turbo.json`, `playwright.config.mjs`, prior agent reports). The cause
is the Windows CRLF checkout meeting Prettier's `endOfLine: "lf"` default; the same check passes on
the Linux CI runner. Changed files were verified with `prettier --end-of-line auto --check`.

## CI

Recorded on the pull request.

## Remaining Visual Deviations

- **Basemap tiles.** Local screenshots of `/trips/[id]/live` and the trip-detail map show the chrome
  over an empty ground because this sandbox cannot reach the CartoDB tile CDN. The map component,
  its single canvas, the route line and the marker are unchanged and load normally with network
  access. This is an environment limitation, not a layout deviation.
- **Hero imagery.** The reference home hero is a scenic landscape; ours is the company coach
  photograph from `brand/`, per the instruction to use real brand assets rather than substitute
  imagery. Aspect ratio, radius, crop, scrim, overlay text, stat row and CTA pill follow the
  reference.
- **Journey code size for long names.** Place names over eight characters render one step smaller
  than the reference's three-letter codes, as described above.
- **Result card band count.** The result card has a price/CTA band the reference does not show.

## Final Status

`COMPLETE`
