# CLAUDE.md — Carfam demo decision record

Build spec: `SPEC.md`. Phase 0 plan: `docs/PHASE0_PLAN.md`. Ignore `carfam-recon/_superseded/`.

## Working rules
- Branch `demo-build` only; never commit to or merge into `main`. Push only when asked.
- Run one phase at a time, then stop and report.
- Line endings: LF (`.gitattributes`). Never commit `.env*` except `.env.example`.

## Stack (locked)
Next.js App Router + TypeScript + Tailwind; Supabase (Postgres, Auth, Storage); Anthropic SDK behind a provider adapter; Vitest + Playwright; npm.

## Decisions (Phase 0)
- **Budget field:** `sale_price` (internet price + doc + smog fees), strict `<` upper bound. It matches the original site's PriceRange facet counts. Label: "Sale price — includes $85 doc and $50 smog fees; excludes tax, registration and other charges."
- **Money** stored as integer cents; `sale_price_cents` maintained by trigger from its components. All pricing goes through one module.
- **Two status axes:** `status` (available/pending/sold) and `publication` (draft/published/archived). Shopping results = published and (available or pending).
- **Import** is explicit, insert-only, matched on `source_id`, then VIN. It never updates staff-edited rows. Descriptions, packages, highlights, tagline and equipment rows are parsed from local `source_html`.
- **Canonical inventory URL:** `/pre-owned-cars`. Legacy paths are parsed into the shared filter schema.
- **Unknown values stay null.** No body or fuel type is guessed. No history badges come from description text.
- **Appraisal photos:** previewed in the browser only, never uploaded.
- **Chatbot:** "show me X" starts a new search; "only/also/actually/and" refines the current one.

## Open items
See `docs/PHASE0_PLAN.md` §8 (owner-review conflicts) and §9 (blockers/decisions). Phase 1 is blocked until `.env.local` exists.
