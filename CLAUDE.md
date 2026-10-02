# CLAUDE.md — Carfam demo decision record

Build spec: `SPEC.md`; its "Demo mode" section overrides the rest. Phase 0 plan: `docs/PHASE0_PLAN.md`. Ignore `carfam-recon/_superseded/`.

## Working rules
- Branch `demo-build` only; never commit to or merge into `main`. Push only when asked.
- Run one phase at a time, then stop and report.
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

## Decisions
- **Budget field:** `salePrice` (internet price + doc + smog fees), with a strict `<` upper bound. It matches the original site's PriceRange facet counts. Every card, list and detail page shows this same price, labeled as including doc and smog fees; the detail page shows the breakdown. All pricing goes through `src/lib/inventory/pricing.ts`.
- **Money** is stored as integer cents. `salePriceCents` is always derived from its components, never stored independently.
- **Two status axes:** `status` (available/pending/sold) and `publication` (draft/published/archived). Shopping results are published vehicles that are available or pending; pending shows a badge.
- **Recon import** parses description, packages, highlights, tagline and equipment rows from local `source_html`.
- **Unknown values stay null.** No guessed body or fuel types, and no history badges taken from description text. The one allowed inference: a vehicle listed on Carfam's own single-criterion filter page (`/filter/fuel/X`, `/filter/bodytype/X`) takes that value, recorded in `fieldSources` and flagged. This only changed the 2017 Fusion Energi, to plug-in hybrid.
- **Default sort ("recommended"):** featured vehicles first (by rank), then newest model year, then lowest sale price.
- **Demo roles:** only the owner can "Reset demo data". Managers manage inventory and all leads. Sales can view inventory and work on leads assigned to them.
- **Photos:** up to the first 6 per vehicle are copied into `public/vehicles/{sourceId}/` and committed (606 files for 101 vehicles, ~70 MB). Runtime never loads Carfam's photo server; vehicles without copied photos use the fallback image.
- **Vehicles without photos** (26 in the snapshot) stay in inventory but always rank last in "recommended", even if featured. They are never used on the homepage or in featured slots (`selectFeaturedVehicles`), and never lead the chatbot's results when a comparable vehicle with photos exists (`preferPhotographed`). Explicit sorts like price still place them in order. Staff can't feature a vehicle without photos, and removing all photos un-features it. Similar-vehicle suggestions deprioritize them. Tests: `tests/photo-ranking.test.ts`.
- **Canonical inventory URL:** `/pre-owned-cars`. Legacy paths are parsed into the shared filter schema (`src/lib/inventory/legacy-routes.ts`).
- **Appraisal photos** are previewed in the browser only and never uploaded.
- **Chatbot:** "show me X" starts a new search; "only/also/actually/and" refines the current one.
- **Financing demo records** (post-approval) are visible to owner and manager. New leads start unassigned, and sales staff see only leads assigned to them.

## Phase 2 requirements (recorded at Phase 1 approval)
- **Payment calculator** starts from `salePriceCents`, not the internet price, and shows `calculatorDisclosure()` from `pricing.ts`: the sale price includes doc and smog fees. **Do not reuse Carfam's original calculator disclosure** saying dealer/doc/smog charges are excluded. APR is user-selected and illustrative; Carfam's old APR presets are not lender rates.
- Homepage featured vehicles come from `selectFeaturedVehicles`. Inventory cards, lists and the detail page all use the same sale price via `toVehicleCard`/`priceBreakdown`.

## Open items
See `docs/PHASE0_PLAN.md` §8 (owner-review conflicts) and §9 (gaps).
