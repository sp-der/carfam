# CLAUDE.md — Carfam demo decision record

Build spec: `SPEC.md`; its "Demo mode" section overrides the rest. Phase 0 plan: `docs/PHASE0_PLAN.md`. Ignore `carfam-recon/_superseded/`.

## Working rules
- Owner update October 2, 2026: publish completed work to `main` and continue all remaining phases. This supersedes the earlier branch-only and stop-per-phase instructions.
- Keep the approved demo-mode stack and data rules; production integrations remain disabled.
- Line endings: LF (`.gitattributes`). Never commit `.env*` except `.env.example`.

## Phases (revised after Phase 0)
1 import + data layer + search service + tests · 2–3 public site · 4 admin · 5 chatbot · 6 verification + README.

## Stack
- Next.js App Router, TypeScript, Tailwind, Vitest, Playwright, npm. Anthropic SDK behind a provider adapter (Phase 5).
- **Demo mode: no Supabase and no login.** Supabase, auth, content management, audit log, financing overview and settings are post-approval work, listed in the README.

## Data layer
- All reads and writes go through the repository interface in `src/lib/data/repository.ts`. The demo implementation is a server-side JSON file store (`src/lib/data/json-store.ts`), and a Supabase implementation replaces it later without UI changes.
- Store files: `data/seed/inventory.seed.json` (committed, built from recon by `npm run import:recon`); `.data/store.json` (runtime, gitignored, seeded from the seed file on first read).
- Seeding is idempotent: matched on `sourceId`, then VIN. It inserts missing vehicles only and never overwrites edits. "Reset demo data" restores the seed.
- Read-only filesystem detection puts the store (and later the admin) in read-only mode.
- Permission checks live in `src/lib/auth/permissions.ts` as server-side functions taking an actor `{ role }`. Demo admin gets the role from the "Viewing as" switcher; real auth plugs in later.

## Layout and commands
- `src/lib/inventory/` — types, normalize, pricing, filters (shared zod schema + patch semantics), search, legacy-routes, public (card projection). Pure modules, no I/O.
- `src/lib/services/` — inventory and lead services: validation + `assertCan` + repository. UI, route handlers and the chatbot call these, never the repository directly for writes.
- `src/lib/data/` — repository interface, JSON store, `getRepository()` (server-only).
- `scripts/import-recon.ts` → `data/seed/inventory.seed.json` (deterministic). `data/seed/demo.seed.json` is hand-written synthetic staff and leads (`@example.com`, `isSynthetic`).
- `scripts/copy-photos.ts` estimates by default; `-- --download` copies, then re-run `import:recon`.
- `npm run typecheck` (runs `next typegen` first; Next 16 needs generated route types), `npm run lint`, `npm test`, `npm run build`.
- Public API responses use `toVehicleCard`, so review flags, provenance and staff fields never leave the server.
- `src/app/(site)/` — public pages inside the site header/footer layout. `src/app/not-found.tsx` is the real 404.
- `src/components/` — `site/` (header, nav, footer), `home/`, `inventory/`, `vehicle-detail/`, `vehicles/` (card, image + fallback), `shopping/` (saved/compare), `icons.tsx` (inline SVG, no icon fonts).
- `src/lib/site.ts` — dealership facts (from recon `dealership.json`), hours, nav, snapshot label.
- `.data/store.json` is created once and never picks up later seed changes (e.g. new photos). Run `npm run demo:reset` (with the server stopped; it caches the store in memory) to rebuild it from the seed.

## Decisions
- **Budget field:** `salePrice` (internet price + doc + smog fees), with a strict `<` upper bound. It matches the original site's PriceRange facet counts. Every card, list and detail page shows this same price, labeled as including doc and smog fees; the detail page shows the breakdown. All pricing goes through `src/lib/inventory/pricing.ts`.
- **Money** is stored as integer cents. `salePriceCents` is always derived from its components, never stored independently.
- **Two status axes:** `status` (available/pending/sold) and `publication` (draft/published/archived). Shopping results are published vehicles that are available or pending; pending shows a badge.
- **Recon import** parses description, packages, highlights, tagline and equipment rows from local `source_html`.
- **Unknown values stay null.** No guessed body or fuel types, and no history badges taken from description text. The one allowed inference: a vehicle listed on Carfam's own single-criterion filter page (`/filter/fuel/X`, `/filter/bodytype/X`) takes that value, recorded in `fieldSources` and flagged. This only changed the 2017 Fusion Energi, to plug-in hybrid.
- **Default sort ("recommended"):** featured vehicles first (by rank), then newest model year, then lowest sale price.
- **Demo roles:** only the owner can "Reset demo data". Managers manage inventory and all leads. Sales can view inventory and work on leads assigned to them.
- **Photos:** up to the first 6 per vehicle are copied into `public/vehicles/{sourceId}/` and committed (606 files for 101 vehicles, ~70 MB). Runtime never loads Carfam's photo server; vehicles without copied photos use the fallback image.
- **Homepage automatic fill** (`selectFeaturedVehicles`, after staff-featured vehicles) skips cargo and passenger vans (`AUTO_FILL_EXCLUDED_BODIES`); staff can still feature one.
- **Vehicles without photos** (26 in the snapshot) stay in inventory but always rank last in "recommended", even if featured. They are never used on the homepage or in featured slots (`selectFeaturedVehicles`), and never lead the chatbot's results when a comparable vehicle with photos exists (`preferPhotographed`). Explicit sorts like price still place them in order. Staff can't feature a vehicle without photos, and removing all photos un-features it. Similar-vehicle suggestions deprioritize them. Tests: `tests/photo-ranking.test.ts`.
- **Canonical inventory URL:** `/pre-owned-cars`. Legacy paths are parsed into the shared filter schema (`src/lib/inventory/legacy-routes.ts`).
- **Appraisal photos** are previewed in the browser only and never uploaded.
- **Chatbot:** "show me X" starts a new search; "only/also/actually/and" refines the current one.
- **Financing demo records** (post-approval) are visible to owner and manager. New leads start unassigned, and sales staff see only leads assigned to them.

## Phase 2 requirements (recorded at Phase 1 approval)
- **Payment calculator** starts from `salePriceCents`, not the internet price, and shows `calculatorDisclosure()` from `pricing.ts`: the sale price includes doc and smog fees. **Do not reuse Carfam's original calculator disclosure** saying dealer/doc/smog charges are excluded. APR is user-selected and illustrative; Carfam's old APR presets are not lender rates.
- Homepage featured vehicles come from `selectFeaturedVehicles`. Inventory cards, lists and the detail page all use the same sale price via `toVehicleCard`/`priceBreakdown`.

## Phase 2 decisions (public site: homepage, inventory, vehicle detail)
- **Visual system** (tokens in `src/app/globals.css`): graphite `#161616` header/hero/footer, white and mist `#eef1f4` content, cyan `#00aeef` on dark only (`cyan-ink #0072a3` for text and focus rings on light), pink `#ef59a1` for conversion buttons **with graphite text** (white on pink is 3.2:1). Archivo variable with the `wdth` axis: `.font-display` (expanded, 800) for headlines and prices; tabular numbers for prices. Sentence case throughout.
- **Homepage hero** is a sentence search ("Show me [body] from [make] under [budget]"): a GET form that works without JS, with a live count from `/api/inventory/search?summary=1`. The body-style lineup uses the dealer's cutouts (960px WebP derivatives in `public/body-styles/`) with real counts.
- **Inventory URL is the single source of truth.** Server renders results; controls call `navigate()` from `InventoryNavProvider` (transition + `useOptimistic`, so checkboxes don't flicker). Filter chips are real links. Load More is `?page=N` (cumulative). The mobile filter sheet stages changes and previews counts/facets via the search API. No-results shows one-filter relaxations with counts (`suggestRelaxations`); the budget is never relaxed automatically.
- **Routes:** `/pre-owned-cars/[[...segments]]` (clean URL, legacy category paths render with a canonical URL, legacy `/filter/…` and query keys 308 to the clean form); `/pre-owned-cars/detail/[slug]/[id]` (wrong slug 308, unknown 404, unavailable shows a tombstone with similar vehicles). `/inventory` and `/searchused.aspx` 308 via `next.config.ts`.
- **HTTP 410** for unavailable vehicles comes from `src/proxy.ts`, which asks `/api/inventory/route-status` (proxy must not import the data layer) and rewrites with status 410.
- **Vehicle detail:** packages shown via `publicPackages` (exact duplicates once, no review flags, no added-value total, "original MSRP" label). Dealer descriptions are shown verbatim under "From the dealer", with a note that history details aren't checked against a report. Inquiry dialog (test drive / question / best price) → server action → `submitDemoLead`; shows "Demo only—nothing was sent." Test drives are requests, never confirmed appointments.
- **Saved vehicles and comparison** live in `localStorage` on the device (compare max 3), looked up via `/api/inventory/vehicles?ids=`. Clearing either offers Undo.
- **Image optimization is off by default** (`images.unoptimized`; `CARFAM_IMAGE_OPTIMIZER=on` re-enables). On this Windows machine the Next 16.3.8 optimizer intermittently left some image/width requests hanging forever (root cause not found). Instead, `npm run photos:variants` pre-generates `{n}-480.webp` and `{n}-960.webp` beside every committed `public/vehicles/{id}/{n}.jpg` (committed; ~64 MB). `VehiclePhoto` serves them: cards use `<picture>` so phones (< 640px) always get the 480px file; the detail gallery uses the full srcset; the lightbox uses the 1200px original. `tests/photo-variants.test.ts` fails if a variant is missing. Re-run the script after adding photos.
- `agentRules: false` in `next.config.ts` stops `next dev` appending generated text to this file.
- Owner-selected React Bits BranchedMenu styling is adapted in the shared `FilterPanel`: animated curved branches, independent multi-select paths, 44px checkbox rows, foldable groups and reduced-motion support. Existing URL filters, counts, ranges, mobile staging and chatbot behavior are unchanged. No new icon dependency is needed.
- Owner-approved homepage opening: 1.5-second cyan light sweep and existing logo reveal on graphite, subtle pink halo, then fade. Once per tab session; direct non-home entries skip it. Skip, pointer interaction, Escape/Tab and reduced motion dismiss/bypass it. It has no server-rendered overlay or content loading dependency. Browser visual verification remains pending.
- Opening startup follow-up: wait for tab visibility instead of abandoning the reveal; remove the focus-at-hydration check. `/?intro=1` explicitly replays it, while respecting reduced motion. Session marker version 2 lets visitors review the corrected intro once after this release. Visibility scheduling/cancellation has focused unit coverage.

## Open items
See `docs/PHASE0_PLAN.md` §8 (owner-review conflicts) and §9 (gaps).
- Phase 3 routes, Phase 4 demo inventory/lead workspace and Phase 5 assistant are implemented. See `docs/IMPLEMENTATION_STATUS.md` for verification and remaining Phase 6 browser checks.
- Image optimizer hang: re-test on the hosting platform before enabling `CARFAM_IMAGE_OPTIMIZER`.
- Staff-picked homepage vehicles are approved and seeded in rank order: 2021 Toyota RAV4 XLE Premium, 2022 Chevrolet Silverado 1500 LTD Custom, 2021 Toyota Corolla Hybrid LE, 2018 Tesla Model 3 Long Range Battery, 2020 Kia Telluride SX, 2023 Toyota Tacoma 4WD TRD Off Road, 2024 Chevrolet Malibu LT, 2022 Cadillac Escalade Sport. `scripts/import-recon.ts` preserves these picks on re-import.
