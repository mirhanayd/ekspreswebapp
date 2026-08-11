# 035 — Presentation UI Redesign Campaign

Rebuild of the passenger and admin interface layer for the company presentation.
Backend, API contracts, routes and business logic are unchanged.

> **Second pass — reference fidelity.** The first pass treated `ui/` as loose
> inspiration. It was redone to follow the reference screens closely and to lead
> with the application experience rather than the web page. See
> "Application shell" and "Screen-by-screen mapping" below.

## Application shell

Mobile now runs headerless, exactly like the reference screens: `--app-header-h`
is `0` below `md`, every view owns its own top row (circular back button or a
brand row), and a floating dark tab pill handles navigation. The desktop header
and footer return from `md` upwards. `/hesap` was added so the tab bar has a
real fourth destination and mobile keeps a place to sign out.

## Brand assets

Both assets were reworked to fit the interface instead of being dropped in:

- `logo.png` — the supplied wordmark sits on a solid white rectangle, which
  forced an ugly white plate on dark chrome. It is re-rendered with the white
  knocked out to alpha (feathered 215–245 so the letter colour survives) and
  trimmed to its content box (900×244). It now sits directly on any surface, and
  dark chrome uses a white silhouette treatment.
- `coach.jpg` — recropped from the original press photo to drop the parked-bus
  clutter and most of the sky, and exported at 2400×1076. On the home card it is
  composited as a masked horizontal band over the dark panel rather than being
  over-zoomed into a portrait frame, so the livery and wordmark stay readable.

Both were produced with a headless-Chromium canvas pass; the originals in
`brand/` are untouched.

## Screen-by-screen mapping

| Reference               | Element                                                              | Implementation                                                     |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `mobile-home-reference` | greeting row + top-right info widget                                 | brand wordmark + date pill                                         |
|                         | small caps eyebrow                                                   | `Siirt · Kurtalan hattı`                                           |
|                         | large display heading with a tall capsule beside it                  | headline + `.search-capsule` linking to the search form            |
|                         | scrollable category pills, first one dark                            | real popular-route chips                                           |
|                         | large image card, centred overlay, meta row, outlined pill CTA       | featured service built from the earliest upcoming trip             |
|                         | floating dark tab bar                                                | `.floating-nav`                                                    |
| `trip-search-reference` | circular back + segmented toggle                                     | back + `En erken` / `En uygun` sort                                |
|                         | route card with dotted path and a dark circular badge                | same, over the faint map texture                                   |
|                         | pills inside the card, then a filter pill row                        | date chip + edit toggle, then date/month/count pills               |
|                         | circular date strip with a filled active day                         | same, brand red for the active day                                 |
|                         | "N tickets found" + circular filter button with a dot                | same, the dot appears when a time filter is on                     |
|                         | rail card: rotated label, badge, times over dates, tinted 3-up strip | same, with `EKSPRES` rail, day labels and `.facts-strip`           |
| `live-map-reference`    | circular close, centred title pill, circular action                  | back, route + live status pill, ticket shortcut                    |
|                         | numbered tabs down the left edge, active in amber                    | real route stops; the next stop is amber and tapping flies the map |
|                         | circular map controls down the right edge                            | zoom in, zoom out, recenter on the vehicle                         |
|                         | dark panel: times, amber duration pill, dashed progress              | same, plus endpoint names and live progress                        |
|                         | dark pill row under the panel                                        | next stop + distance, plate, current speed                         |

## Design direction

Direction is derived from two sources that already lived in the repository:

- `brand/logo.png` — heavy condensed wordmark, red letterforms (~#B0342A) with a
  near-black outline on white.
- `brand/bus.jpeg` — white coach with a warm red/orange livery.
- `ui/mobile-home-reference.png`, `ui/trip-search-reference.png`,
  `ui/live-map-reference.png` — the transport-app references.

Rules extracted from the references and applied across the product:

| Reference cue                                    | Implementation                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| Pill geometry, circular icon buttons             | `.btn` is fully rounded; `.icon-btn` for back/swap/map actions           |
| Large soft radii on cards and image panels       | cards `rounded-3xl`, hero/image panels `rounded-4xl`                     |
| Near-black "active" fill against a soft canvas   | `.chip-active`, `.segmented-item-active` on a warm `#FAF7F4` canvas      |
| One warm accent for the key highlight            | `.duration-pill` (ember) reserved for journey durations and live ETA     |
| Dotted journey path with a centred vehicle badge | `.dotted-path` + dark circular `BusFront` badge on route cards           |
| Result card with a coloured vertical rail        | brand rail with rotated `EKSPRES` label on trip and ticket cards         |
| Floating dark tab bar                            | `.floating-nav` — lifted pill, icon-only, brand-filled active tab        |
| Floating map overlays                            | live tracking status bar, dark journey panel, circular MapLibre controls |
| Circular date strip                              | search date cells as filled pills, brand red for the active day          |

Palette is brand red + warm charcoal ("ink") + a restrained ember accent — no
secondary hues. Type is Archivo (display) over Inter (UI); both now load the
`latin-ext` subset so Turkish glyphs render from the webfont instead of falling
back.

## Screens redesigned

**Passenger**

| Screen           | Highlights                                                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home             | Greeting row, display headline with search FAB, quick-route chips, featured-service image card built from the earliest real upcoming trip, search panel, how-it-works, service promise                         |
| Search           | Circular back, segmented sort (`En erken` / `En uygun`), dotted route card, circular 5-day strip, time-of-day filters, rail trip cards with times, ember duration pill, facts strip and live seat availability |
| Trip detail      | Journey summary card, stop timeline with clock times computed from `estimatedMinutesFromStart`, working route map, fleet standard grid, availability meter, sticky mobile booking bar                          |
| Seat selection   | Real 2+1 deck: cockpit, aisle divider, rear block; four seat states with icon + pattern cues, legend, hold countdown with progress, sticky continue bar                                                        |
| Checkout         | Two-column layout, sticky order summary with route/seat/duration/price breakdown, structured demo-payment explanation                                                                                          |
| Confirmation     | Stepper, success header, dark ticket preview, primary CTA to the ticket                                                                                                                                        |
| My tickets       | Wallet header with counts, rail ticket cards with seat badge, grouped active/past/cancelled, live-tracking action                                                                                              |
| Ticket + QR      | Perforated boarding pass with notches, brand plate header, big times, passenger/seat/vehicle/fare tiles, prominent QR with validity pill, print action                                                         |
| Live tracking    | Map-first shell, floating status bar with live indicator, dark journey panel with dotted progress track, next stop derived by projecting the vehicle onto the route, remaining distance, plate and speed       |
| Login / register | Shared split shell with coach imagery, password reveal, explicit labels                                                                                                                                        |

**Admin**

| Screen               | Highlights                                                                |
| -------------------- | ------------------------------------------------------------------------- |
| Shell                | Grouped sidebar with active states, brand plate, sticky topbar            |
| Dashboard            | KPI tiles, 7-day sales bars, occupancy meter, live fleet strip            |
| Transport operations | Summary tiles, route and bus cards, trip table with occupancy meters      |
| Tickets              | Summary tiles plus operational table with status chips                    |
| Ticket detail        | Grouped passenger/trip field lists with fare emphasis                     |
| Live fleet           | Larger map, live counter, manual refresh, vehicle cards with focus-on-map |
| Reports              | Metric tiles, distribution meters, daily sales table with inline bars     |

## Component / system changes

- `packages/ui/tailwind.config.js` — brand/ember/ink scales, shadow scale
  (`card`, `lift`, `panel`, `brand`, `seat`), radius extensions, display font
  family, gradients and motion keyframes. Existing semantic tokens were kept so
  no consumer broke.
- `apps/passenger-web/src/app/globals.css` — the passenger component layer
  (surfaces, buttons, fields, chips, segmented controls, badges, duration pill,
  dotted paths, rails, meters, empty states, floating nav, action bar) plus
  MapLibre control restyling.
- `apps/admin-web/src/app/globals.css` — denser operational layer sharing the
  same tokens (`surface`, `ops-btn`, `ops-field`, `chip-status`, `data-grid`,
  `ops-meter`).
- New passenger components: `SiteHeader`, `SiteFooter`, `BottomNav`,
  `BrandLogo`, `SearchPanel`, `BookingSteps`, `AuthShell`, `PrintButton`.
- New passenger libs: `lib/format.ts` (single source for date/price/duration
  formatting and status labels), `lib/geo.ts`, `lib/route-progress.ts`.
- `apps/admin-web/src/components/ui.tsx` rewritten with typed props and a
  `PageHeader` / `EmptyRow` pattern; new `AdminNav` client component.

## Functional additions that are real, not decorative

- Search results and trip detail read live seat availability from the existing
  public `GET /seats/trip/:id` endpoint.
- Search sorting and time-of-day filtering are driven by URL params and applied
  server-side to real trip data.
- Popular routes and the featured service card are generated from
  `GET /transport/routes` and `GET /transport/trips`.
- Route stop coordinates arrive as PostGIS EWKB hex; `lib/geo.ts` parses them so
  the trip map draws stop markers and the route line. Previously the map
  rendered an empty basemap.
- Live tracking projects the vehicle onto the route LineString to derive
  progress, remaining distance and the next stop.
- Admin dashboard composes `/admin/overview`, `/admin/fleet` and
  `/admin/reports`; the two secondary calls degrade to a fallback so a partial
  outage cannot take the console down.

No new backend endpoints, no contract changes, no schema changes.

## Accessibility

- Semantic landmarks, skip link, `aria-current` on navigation, `aria-label` on
  icon-only controls, `role="alert"` / `aria-live` on async states.
- Seat states carry an icon and a hatch pattern in addition to colour, and the
  seat `aria-label` contract (`Koltuk 7, available`) is unchanged.
- Visible focus ring on the brand colour with an offset, retained globally.
- Map screens keep a textual equivalent: the live panel states progress,
  remaining distance, next stop, speed and last update in text; the trip map is
  accompanied by a numbered stop list.
- `prefers-reduced-motion` disables transitions and animations.

## Validation performed

| Check                                   | Result                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter passenger-web typecheck` | pass                                                                                                                                                                     |
| `pnpm --filter admin-web typecheck`     | pass                                                                                                                                                                     |
| `pnpm --filter passenger-web lint`      | pass, 0 warnings                                                                                                                                                         |
| `pnpm --filter admin-web lint`          | pass, 0 warnings                                                                                                                                                         |
| `pnpm build` (turbo, 6 tasks)           | pass                                                                                                                                                                     |
| Rendered screen sweep                   | both apps built and served in an isolated worktree against a local fixture API; every passenger and admin screen captured and inspected at 375 / 390 / 768 / 1440 / 1920 |

Layout defects found in the sweep and fixed:

- search date strip forced document overflow (`flex-1` without `min-w-0`);
- long terminal names overflowed journey headings (missing `truncate` on the
  large place names in search and trip detail);
- admin fleet and route rows overflowed (`truncate` applied to a flex container
  instead of the text span);
- admin dashboard sales bars collapsed to zero height (percentage height inside
  a flex item);
- the footer intruded on the full-height live tracking screen.

The Playwright critical-journey gate (`pnpm test:e2e`) needs PostgreSQL/PostGIS,
Redis and the API; it could not be executed in this environment because Docker
was not running. All selectors the gate depends on were preserved deliberately:
the home `h1` text, the `Nereden` / `Nereye` / `E-posta` / `Şifre` / `Ad *` /
`Soyad *` / `Telefon` labels, the `Sefer Ara`, `Giriş Yap`, `Devam et`,
`Demo Öde` and `Yönetim paneline giriş` button names, the `Seferi seç`,
`Koltuk seç`, `Bileti ve QR'ı aç` and `Otobüsü canlı izle` link names, the
`Koltuk 7, available` seat label, the `bilet QR kodu` image alt, the
`Ayırma süresi`, `Canlı takip aktif`, `56 SKE 01`, `72 km/sa` and
`1 canlı araç` text nodes, the `Biletinizi tamamlayın`, `Biletiniz hazır!`,
`Operasyon özeti`, `Operasyonel bilet listesi` and `Aktif araçlar` headings, and
the single-canvas live map. Duplicated CTAs are breakpoint-exclusive so only one
is ever rendered.

## Remaining non-blocking polish

- Basemap tiles come from `basemaps.cartocdn.com`; the sweep environment had no
  outbound network so map surfaces rendered as flat panels. Marker and overlay
  geometry was verified from the DOM.
- The passenger home page is long on mobile (~4000px); the sections below the
  featured card are web-style marketing content and could be shortened once the
  presentation script is final.
- `packages/ui` still exports only `StatusBadge` and `cn`; the passenger and
  admin component layers could be promoted into it if a third surface appears.
- Seat map assumes the seeded 2+1 layout shape; other layouts render but have
  not been visually tuned.
- The trip-detail service list is company-standard copy, not per-trip data. It
  is labelled "Filo standardı" so it cannot be read as trip-specific inventory.
