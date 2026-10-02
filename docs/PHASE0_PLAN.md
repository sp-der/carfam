# Phase 0 — Plan

Status: approved with changes (see `SPEC.md` "Demo mode"). The Supabase/RLS parts of §3 are post-approval work; the demo uses a JSON file store behind the same repository interface.
Inputs read: `SPEC.md`; `carfam-recon/` README, CLAUDE_REBUILD_HANDOFF, DESIGN_RECOMMENDATIONS, CONTENT_ISSUES, VEHICLE_DETAIL_TEMPLATE, FORMS_AND_INTEGRATIONS, THIRD_PARTY_SERVICES, MOBILE_AUDIT, CARFAM_SITE_AUDIT; `data/*.json`; `asset_manifest.csv`; sampled `evidence/html` and `evidence/text`. `carfam-recon/_superseded/` was ignored.

---

## 1. What the data actually contains (verified in Phase 0)

| Fact | Value |
|---|---|
| Vehicle records | 127, unique `id`, VIN and stock number |
| Pricing | `internet_price + doc_fee ($85) + smog_fee ($50) = sale_price` holds for all 127 |
| Sale price range | $7,912 – $90,134 |
| Mileage range | 12,991 – 186,560 |
| Makes | 24 (Chevrolet 22, Toyota 15, GMC 10, Lexus 8, BMW 8, Jeep 8, Honda 7, …) |
| Body (raw, mixed case) | SUV 40, Sedan 31, Pickup 31, Coupe 8, Hatchback 7, Passenger-Van 5, Cargo Van 3, Convertible 1, null 1 |
| Fuel (raw) | Gasoline 85, "Gasoline Fuel" 16, Diesel 10, Hybrid 7, Flex 4, Electric 3, null 2 |
| Photos | 2,961 remote URLs; 26 vehicles show only a Coming Soon placeholder; 36 local photos for 9 vehicles in `assets/inventory-demo/` |
| Empty in `inventory.json` for **all 127** | `description`, `included_packages_text`, `highlighted_features`, `carfax_urls` |
| Equipment | Three flattened strings per vehicle (exterior/interior/safety), not row lists |

**Important gap found:** descriptions, packages/options and highlights are *not* in `inventory.json` but *are* in the captured VDP HTML (`source_html`): description on 125 VDPs, packages table on 124, highlights on 23, tagline (`h3` under the title) on 127. Equipment rows are also cleanly delimited in the HTML. The import will extract these from `source_html` (local files, no re-crawl).

---

## 2. Budget price field — decision

**The budget filter uses `sale_price`** (internet price + listed doc and smog fees), with a strict upper bound: "under $15k" means `sale_price < 15000`.

Why:
- The original site's PriceRange facet counts match `sale_price` buckets exactly (8 / 47 / 53 / 11 / 6 / 1 / 1) and do **not** match `internet_price` (10 / 47 / 52 / 12 / 4 / …). Carfam's own filter used this field.
- It is the bottom-line "Sale Price" on cards and the VDP sidebar, so a shopper never sees a car advertised above their stated budget.
- It is the more conservative of the two numbers.

How it's communicated everywhere (inventory filter label, chips, chatbot replies, VDP): **"Sale price — includes $85 doc and $50 smog fees; excludes tax, registration and other charges."** Price sorting uses the same field. Legacy `pricerange=a-b` maps to `a ≤ sale_price < b`; "Over N" maps to `≥ N`.

---

## 3. Data model (Supabase Postgres)

Money is stored as integer cents. All tables have `created_at`/`updated_at`. Enums shown in brackets.

### Public inventory (readable by anon only through RLS when published)

**`vehicles`**
- `id uuid pk`; `source_id text unique null` (original DealerSync id, e.g. `1449827`; null for admin-created); `slug text` (original slug, e.g. `2020-Cadillac-XT5`)
- `vin text` unique on `upper(vin)`; `stock_number text` unique on `lower(stock_number)`
- `year int`, `make`, `model`, `trim null`, `title`, `tagline null`, `style null`
- `mileage int`, `exterior_color`, `interior_color null`
- `body_type` [sedan, coupe, suv, pickup, hatchback, passenger_van, cargo_van, convertible, other] null = unknown
- `fuel_type` [gasoline, diesel, hybrid, plug_in_hybrid, electric, flex_fuel] null = unknown
- `drivetrain` [fwd, rwd, awd, 4wd] + `drivetrain_label` (raw, keeps "Four Wheel Drive/DRW")
- `transmission` [automatic, manual]; `engine`, `horsepower`, `torque` (text, as sourced); `mpg_city`, `mpg_highway` (int null)
- `description text null`
- `internet_price_cents`, `doc_fee_cents`, `smog_fee_cents`, `other_fees jsonb` ([{label, cents}], default []); `sale_price_cents` maintained by trigger as the sum — one pricing source
- `status` [available, pending, sold]; `publication` [draft, published, archived] (independent axes)
- `is_featured bool`, `featured_rank int null`
- `has_placeholder_image bool`, `data_quality_flags text[]`, `field_sources jsonb`
- Provenance: `snapshot_at`, `source_html_path`, `imported_at`, `import_hash`
- Edit tracking: `staff_edited_at null`, `created_by`, `updated_by`
- `search tsvector` generated from year/make/model/trim/title/tagline/colors/stock/VIN

**`vehicle_images`**: `vehicle_id`, `position`, exactly one of `storage_path` (Supabase Storage) or `remote_url`, `is_placeholder`, `alt`, `width`, `height`, `origin` [import_local, import_remote, upload].
**`vehicle_packages`**: `vehicle_id`, `position`, `name`, `msrp_cents null`, `included bool`, `review_flag text null` (e.g. Acura duplicate).
**`vehicle_equipment`**: `vehicle_id`, `category` [exterior, interior, safety], `position`, `label`.
**`vehicle_highlights`**: `vehicle_id`, `position`, `label`.
**`vehicle_documents`**: `vehicle_id`, `kind` [carfax, window_sticker], `url`.

### Staff and restricted data

- **`staff_profiles`**: `user_id pk → auth.users`, `full_name`, `email`, `role` [owner, manager, sales], `active bool`. Helpers `current_staff_role()` / `is_staff()` as `security definer` functions used by RLS.
- **`leads`**: `type` [contact, test_drive, vehicle_inquiry, trade_appraisal, find_my_car, chatbot_contact], `subtype null` (best_price, question, text_link), `status` [new, contacted, scheduled, closed], `source_path`, `vehicle_id null`, name/email/phone, `department null`, `message null`, `details jsonb` (validated per type: appraisal vehicle/condition/mileage, Find My Car criteria), `assigned_to null`, `is_synthetic bool`.
- **`lead_notes`**: `lead_id`, `author_id`, `body`.
- **`finance_applications_demo`**: `reference` (`DEMO-FA-0001`), `provider` [dealer, routeone, capital_one], `language` [en, es], `status` [started, sent_to_provider, awaiting_provider, closed] — deliberately no "approved/declined", `vehicle_id null`, `applicant_label` (synthetic), `provider_link null`, `is_synthetic bool CHECK (is_synthetic)`. No SSN/DOB/income/bank columns exist.
- **`staff_directory`** (public staff page content, separate from accounts): name, role null, email, photo null, bio null, draft/published.
- **`content_entries`**: `key` (hours, contact, homepage_hero, promotions, resources, …), `draft jsonb`, `published jsonb`, `published_at`, `requires_owner_review bool`, `review_note`.
- **`faqs`**: question, answer, `status` [draft, published], `approved_by`, `requires_owner_review`. Chatbot reads published only.
- **`settings`**: key/value (chatbot greeting, notification prefs, usage cap). Integration status is computed from env + settings, shown as demo / unconfigured / connected.
- **`audit_log`**: `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id`, `diff jsonb`, `created_at`. Insert-only via triggers/security-definer function; no update/delete grant. Feeds the dashboard activity feed.
- **`import_runs`**: counts of inserted / skipped-existing / skipped-staff-edited, file hash, timestamp.
- **`chat_rate_limits`** / **`chat_usage`**: hashed client key + window counters, daily token totals for the usage cap.

### RLS summary

| Table | anon | sales | manager | owner |
|---|---|---|---|---|
| vehicles + children | select where `publication='published'` | select all | full CRUD | full CRUD |
| leads | none (inserts go through a server route using a narrow `insert_demo_lead` function) | select/update where `assigned_to = auth.uid()` | all | all |
| lead_notes | none | on own assigned leads | all | all |
| finance_applications_demo | none | none | select/update | all |
| content_entries, faqs, staff_directory | select published fields | select | CRUD | CRUD |
| staff_profiles | none | own row | select | CRUD, role changes |
| settings | none (greeting served via server) | none | select | CRUD |
| audit_log | none | none | select | select |

Server routes re-check role before every mutation; RLS is the backstop. Service-role key is used only by the import/bootstrap scripts and a few server-only paths, never in client bundles.

### Storage buckets
- `vehicle-images` — public read, staff write; JPEG/PNG/WebP, ≤ 8 MB.
- Appraisal photos: **previewed in the browser only, not uploaded** in the demo (avoids an anonymous public upload surface). The lead records the photo count.

---

## 4. Import mapping (`inventory.json` + `source_html` → DB)

Run explicitly (`npm run import:inventory`), never on app startup.

| Source | Target | Transform |
|---|---|---|
| `id` | `source_id` | as-is |
| `detail_url` | `slug` | segment after `/detail/` |
| `title`, `year`, `make`, `model`, `trim`, `style` | same | trim whitespace; keep null |
| VDP `h3` under title | `tagline` | from HTML; not treated as trim |
| `stock_number`, `vin` | same | VIN upper-cased |
| `mileage` (float) | `mileage` | int |
| `internet_price`, `doc_fee`, `smog_fee` | `*_cents` | ×100; `sale_price` verified equal to sum, else row flagged and skipped |
| `body_type` | `body_type` | case-fold; `Passenger-Van`→passenger_van, `Cargo Van`→cargo_van; null stays null |
| `fuel_type` | `fuel_type` | Gasoline/"Gasoline Fuel"→gasoline; Diesel→diesel; Hybrid→hybrid; "Electric Fuel System"→electric; "Flex Fuel Capability"→flex_fuel; null stays null |
| `drivetrain` | `drivetrain` + label | FWD/RWD/AWD/4WD; DRW kept in label |
| `transmission`, `engine`, `horsepower`, `torque`, MPG | same | as sourced |
| VDP description block | `description` | text, paragraphs preserved |
| VDP packages table | `vehicle_packages` | name, MSRP, "Included"; exact duplicates get `review_flag` |
| VDP highlights | `vehicle_highlights` | labels only (icons replaced with our SVGs) |
| VDP spec panes | `vehicle_equipment` | one row per `.ds-vdp-feature-row`; exact duplicate rows dropped |
| `monroney_urls` | `vehicle_documents` (window_sticker) | 48 vehicles |
| `image_urls` | `vehicle_images` | order preserved; `comingsoon/` URLs → `is_placeholder` |
| `demo_assets.json` local files | Storage `vehicle-images/{source_id}/…` | replace the matching remote positions for those 9 vehicles |
| `has_placeholder_image`, `data_quality_flags`, `field_sources`, `snapshot_at`, `source_html` | same-named columns | as-is |
| `availability` (all InStock) | `status=available`, `publication=published` | |

**Idempotency rule:** match on `source_id` (fallback VIN). Existing rows are **never updated** by default — inserts only, children inserted only alongside a new parent. An explicit `--refresh-unedited` flag may update rows where `staff_edited_at IS NULL`; it never touches staff-edited rows. Every run writes an `import_runs` record. Tests cover: double import = no change; staff edit survives re-import with and without the flag.

Synthetic sample leads and finance references are seeded by a separate `npm run seed:demo`, labelled `is_synthetic`, with obviously fake names (e.g. "Sample Lead 01", `@example.com`).

---

## 5. Shared filter schema and search service

One zod schema (`InventoryFilters`) used by the inventory page URL parser, the legacy-alias parser, the search service and every chatbot tool.

| Key | Type | Notes |
|---|---|---|
| `q` | string ≤ 100 | full-text over `search` |
| `make`, `model` | string[] | canonical names; slug input accepted |
| `body` | body_type[] | |
| `yearMin`, `yearMax` | int | |
| `priceMin`, `priceMax` | int dollars | on `sale_price`; `priceMax` exclusive |
| `mileageMax` | int | inclusive |
| `fuel`, `drivetrain`, `transmission` | enum[] | |
| `exteriorColor`, `interiorColor` | string[] | exact source color names |
| `hwyMpgMin` | int | |
| `sort` | relevance, price-asc/desc, year-asc/desc, make-asc/desc, model-asc/desc, mileage-asc/desc | |
| `page` | int | Load More, 24 per page |

Normal shopping results always add `publication = published AND status IN (available, pending)`; pending shows a badge. Sold and archived are excluded. The search returns facet counts computed from the same query so chips and counts stay consistent.

Dropped from the original filter set, with reason: **Estimated range** (no vehicle has a range value), **Condition** (all are pre-owned), **Basic color** (the source has facet counts but no per-vehicle mapping; exact exterior color is offered instead).

---

## 6. Route map

### Public
| Route | Notes |
|---|---|
| `/` | Homepage |
| `/pre-owned-cars` | Canonical inventory; filters in query string |
| `/inventory`, `/searchused.aspx` | 308 → `/pre-owned-cars` (query preserved) |
| `/pre-owned-cars/{year}`, `/{make}`, `/{year}/{make}`, `/{year}/{make}/{model}` | Legacy category aliases → parsed to filters, render inventory with `canonical` to clean URL |
| `/pre-owned-cars/filter/{k}/{v}/…`, `/pre-owned-cars/filter/pricerange=a-b` | Legacy filter paths → 308 to query form (matches original behaviour) |
| `/pre-owned-cars/detail/{slug}/{id}` | VDP. Wrong slug → 308 to correct slug. Unknown id → 404. Sold/archived/unpublished → unavailable page, HTTP 410, with similar vehicles. `1505080` (Kia, captured 410) → 410 |
| `/compare`, `/saved` | Local-device saves and comparison |
| `/find-my-car`, `/contact-us` (+ `/contactus.aspx` 308), `/sell-my-car` | Forms / appraisal wizard |
| `/finance-your-car`, `/finance-your-car/pre-approved`, `/solicitar-financiacion`, `/capital-one-pre-qualify-then-shop`, `/bad-credit-financing-in-bloomington-ca` | Finance pages and labelled provider placeholders |
| `/about-us`, `/meet-our-team`, `/customer-gallery-at-carfam`, `/used-car-dealer-serving-the-community-in-rialto`, `/careers` | Dealership |
| `/resources` + the 7 article paths at their original URLs; `/news` | Resources center; news = outbound Edmunds links |
| `/ada-policy-statement`, `/privacy-policy`, `/privacy-rights` | Legal |
| `/account/login`, `/account/forgot-password` | Readable shells: "Customer accounts aren't part of this demo; saves stay on this device." |
| `/visual-sitemap` | Generated from the route registry |
| `/pre-owned-exotic-cars`, anything else | Real 404 |

### Admin (all behind middleware + server role checks)
`/admin/login`, `/admin` (counts + activity feed), `/admin/inventory`, `/admin/inventory/new`, `/admin/inventory/[id]`, `/admin/inventory/[id]/preview`, `/admin/leads`, `/admin/leads/[id]`, `/admin/financing` (owner/manager), `/admin/content/*`, `/admin/faqs`, `/admin/staff` (owner), `/admin/settings` (owner), `/admin/audit` (owner/manager).

### Server endpoints
Admin mutations via server actions. Route handlers: `POST /api/leads` (validated, rate-limited, demo-only), `POST /api/chat` (rate-limited, bounded), `GET /api/inventory/search` (shared service, used by the chat widget and Load More).

All pages: `noindex`, unique titles, one H1, canonical URLs.

---

## 7. Chatbot plan (detail lands in Phase 6)

Tools (zod-validated server-side, same schema as above):
`search_inventory(filters)`, `apply_inventory_filters({mode: replace|merge|clear, filters, remove?})`, `open_vehicle({vehicleId})`, `get_dealership_faq({topic})`, `open_contact_form({kind, vehicleId?})`. Navigation targets are built server-side from an allowlist; the model never supplies a URL.

Filter-merge semantics (deterministic assistant and AI adapter share them):
- "Show me Hondas under $15k" → new search: `make=[Honda], priceMax=15000`. Snapshot result: **1** (2013 Accord, $10,134); the 2016 Odyssey at $15,912 is correctly excluded.
- "Show me Lexuses" → new search, `make=[Lexus]` → 8.
- "Only SUVs" → merge, keeps other filters, sets `body=[suv]` → Lexus SUVs: 3.
- "Actually under $20k" → merge, replaces `priceMax`.
- "Clear everything" → reset.
- "Show me that one" → opens the vehicle only if the last result set had exactly one vehicle or one was explicitly referenced; otherwise asks which one.
- No results → says so, names the active filters, suggests specific relaxations with counts; budget is never silently relaxed.

---

## 8. Conflicts requiring owner review (shown as flagged, never as settled fact)

1. **Return policy**: 3 days/200 mi (About) vs 3 days/250 mi "no questions asked" (Customers). Not published.
2. **Location wording**: Rialto (header, contact, schema) vs Bloomington (legacy routes/titles, popup).
3. **Phone numbers**: sales 909-543-1450, text 909-251-7182, popup/Capital One 909-990-5043.
4. **Hours**: Mon–Sat 9–8 (main) vs Mon–Sat 9–9 (Capital One footer). Demo uses main-site hours, flagged.
5. **ADA statement does not exist**: `/ada-policy-statement` redirects to `/privacy-policy` and its captured text is identical to the privacy policy. Demo page will say an accessibility statement is pending dealer approval — no policy text invented.
6. **Body/fuel classification vs Carfam's own facets**: the 2018 Mercedes CLA 250 Coupe is `coupe` in the data but is not in the original coupe filter (facet says 33 sedans / 7 coupes); the Tesla Model 3 body is null; the 2017 Fusion Energi is "Hybrid" in the data but Carfam's own Plug-In filter page lists it (Phase 1: set to plug-in hybrid from that evidence, flagged); Flex fuel 4 vs facet 5 and 2 vehicles null. Import keeps the data's values (or null), with flags; admin can correct.
7. **Vehicle descriptions contain history claims**: 13 descriptions (corrected in Phase 1; Phase 0 counted the two phrasings separately) say "Carfax 1-Owner"-type language, but no CARFAX report link was captured for any vehicle. Descriptions shown verbatim as dealer copy; no badges derived; chatbot does not repeat history claims.
8. **Acura RDX duplicate package** (Majestic Black Pearl $400 ×2 = $800): flagged; total added value not shown.
9. **Calculator disclosure** says doc/smog fees excluded while the sale price includes them.
10. **"Guaranteed Car Loans"** in finance metadata — not reused.
11. **Research article specs** (SUV page RDX/Tahoe claims) — summarised conservatively, flagged.
12. **Community page** CHOC 2017–2018 recognition and partnerships — flagged for reconfirmation.
13. **AutoDriven 128 vs main site 127** — separate provider, not merged.

---

## 9. Gaps, blockers and decisions needed

### Blocker for Phase 1
- **`.env.local` does not exist.** Phase 1 needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `ANTHROPIC_API_KEY` is optional. Per the spec I'll stop and ask rather than substitute a database.
- Migrations: plan is to keep SQL migrations in `supabase/migrations/` and apply them with the Supabase CLI (`npx supabase db push`, needs the project ref and DB password or an access token). Alternatively I can apply them through the connected Supabase MCP if you name the project.

### Decisions (default in bold, proceed unless told otherwise)
1. **Vehicle photos for the 92 non-local vehicles.** Only 36 photos for 9 vehicles are local. Options: (a) **reference the recorded `images.dealersync.com` URLs at runtime with a broken-image fallback**; (b) a one-time opt-in script that mirrors them into Supabase Storage (~2,900 files; re-fetches from Carfam's CDN and may exceed free-tier storage). (a) is the default; it does mean viewers' browsers load images from Carfam's provider CDN. Republication rights are not established either way.
2. **"Show me <make>" after an earlier search**: **starts a new search**; refinement words ("only", "just", "also", "actually", "and") modify the current one.
3. **Pending vehicles**: **shown in shopping results with a Pending badge**; sold/archived/unpublished excluded.
4. **Canonical inventory URL**: **`/pre-owned-cars`**, with `/inventory` redirecting to it.
5. **Who sees financing demo records**: **owner and manager only**.
6. **Lead assignment**: **new leads unassigned**; owner/manager assign; sales see only assigned leads.

### Content gaps (handled honestly, no invention)
- No ADA statement text (see conflict 5).
- Staff: one entry (Magic Faouri, email only; no role, bio or photo).
- No estimated-range data for EVs; no per-vehicle basic-color mapping.
- No CARFAX links; 79 vehicles without a window sticker.
- 26 vehicles have only placeholder imagery.
- No approved dealership FAQ set. Phase 5 seeds **draft** FAQs drawn only from captured facts (address, main hours, phones with purpose labels, shopping steps); the chatbot uses only published ones, and the owner must publish them.
- RouteOne later steps and Capital One flow beyond the first screen are unknown; demo screens show only what was observed, labelled as placeholders.
- No mobile reference screenshots of the original.
- Asset republication rights unconfirmed (private demo only).

### Production requirements to document (README, Phase 7)
MFA for owner/manager accounts; hosting-level protection for any preview; inventory source-of-truth decision if Carfam keeps DealerSync as the system of record; dealer-approved lead delivery, consent text, spam protection and retention policy; provider agreements for RouteOne, Capital One, CARFAX, Monroney, maps and analytics.

---

## 10. Phase 1 outline (for reference)

Next.js App Router + TS + Tailwind scaffold; Supabase clients (browser/server/service, server-only guard); migrations for §3 with RLS and triggers; import script for §4; zod filter schema, legacy-alias parser, pricing module and search service for §5; Vitest tests for pricing arithmetic, filter parsing/merge semantics, alias parsing, import idempotency and RLS (against the Supabase project with anon/sales/manager/owner test users). No UI.
