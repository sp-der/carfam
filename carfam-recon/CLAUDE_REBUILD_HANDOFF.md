# Claude: build a modern private Carfam dealership demo

## Start here

You are the implementation agent. This folder is research, source content, vehicle data, original assets, and visual references from Carfam's public site, captured October 2, 2026. It is not a replacement-site repository. Read `README.md`, this file, `DESIGN_RECOMMENDATIONS.md`, `CONTENT_ISSUES.md`, `VEHICLE_DETAIL_TEMPLATE.md`, `FORMS_AND_INTEGRATIONS.md`, and `MOBILE_AUDIT.md` before coding. Use your installed frontend/design/browser skills where applicable. Do not assume a skill exists just because this prompt mentions one.

Build the demo now from the local package. You should not have to repeat the crawl. Inspect source evidence only when a record needs clarification. No dealer-admin access or production credentials were provided.

## Business and brand

Carfam is a used-car dealership serving Rialto and surrounding Inland Empire communities. The captured mix includes practical commuters, family SUVs/minivans, work trucks, sports/luxury models, EVs and hybrids. Position it as welcoming, energetic, trustworthy, and premium in presentation. Do not portray it as a luxury-only business.

Use `data/dealership.json` for address, sales/text phone, email, hours, social links, and known staff. Main-site address is 1731 South Cactus Ave, Rialto, CA 92316; main sales number 909-543-1450; sales@carfam.com. Hours: Mon–Sat 9AM–8PM, Sun 10AM–7PM, America/Los_Angeles. Other public sources conflict; see the issues file.

The original CarFam logo is downloaded in `assets/branding`. Preserve its proportions, cyan/pink identity, and legibility. Use the asset manifest to resolve actual filenames. Original observed accent colors: #00aeef and #ef59a1. Recommended presentation: cinematic graphite hero/header, bright inventory surfaces, bold typography, and restrained motion. Do not simply apply a dark theme to the old template.

## Routes and navigation

`data/routes.json` is the exhaustive discovered-and-requested URL ledger, with status/final URL, title/meta, headings, links, assets, forms, third-party scripts/frames, timestamps, and source paths. `data/inventory_categories.json` maps make/model/year and filtered category aliases to the shared inventory. Do not create a separate hardcoded inventory dataset for each category.

Keep these publicly observed entry points operational in the demo:

| Section | Routes |
| --- | --- |
| Home | `/` |
| Inventory | `/pre-owned-cars`, `/inventory` alias; observed budget/body/make/model/year routes in the data |
| Vehicle | `/pre-owned-cars/detail/{original-slug}/{original-id}` from inventory records |
| Find vehicle | `/find-my-car` |
| Finance | `/finance-your-car`, `/finance-your-car/pre-approved`, `/solicitar-financiacion`, `/capital-one-pre-qualify-then-shop`, `/bad-credit-financing-in-bloomington-ca` |
| Sell | `/sell-my-car` |
| Dealership | `/about-us`, `/contact-us`, `/meet-our-team`, `/used-car-dealer-serving-the-community-in-rialto`, `/careers` |
| Legal | `/ada-policy-statement`, `/privacy-policy`, `/privacy-rights` |
| Customers | `/customer-gallery-at-carfam` |
| Research | The seven captured editorial routes in `data/research_pages.json`, plus news if retained |
| Accounts/site index | Discovered account routes and `/visual-sitemap`; preserve readable demo shells when useful |

Suggested main nav: Inventory, Financing, Sell Your Car, About, Resources. Contact stays easy to reach. Our Customers belongs under About with a homepage highlight. Shop From Home is an external AutoDriven service; do not impersonate a connected checkout. The original Research menu's BMW/Jeep/Lexus/Nissan/Toyota items are inventory make filters; move them to Shop by Make.

Preserve legacy URLs even when presenting clean labels. Build a central alias parser from observed paths and query parameters rather than inventing routes. Return genuine not-found/tombstone states for missing or sold vehicles. Do not redirect all bad routes to home.

## Homepage architecture

The original sequence is recorded in `CARFAM_SITE_AUDIT.md`. The demo sequence should prioritize shopping:

1. Contact utility strip and compact navigation.
2. Single cinematic hero with editable HTML headline, Browse Inventory, and vehicle search.
3. Body-style browsing (Sedan, Coupe, SUV, Truck/Pickup, Hatchback, Minivan/Passenger Van).
4. Featured inventory from actual captured records; select a balanced mix without calling stale inventory live.
5. Finance and Sell Your Car conversion panels.
6. Short business story and authentic customer-photo presentation.
7. Location, sales hours, call/text/directions.
8. Complete footer/legal/social routes.

Use real vehicle/dealership imagery wherever available. Hero reference files include a plain woman/dog photo plus Welcome and We Buy Your Car banners with text embedded; do not place duplicate HTML text over baked-in captions. No unsolicited popup. Do not fabricate dealership awards, star ratings, sales volume, or testimonials.

## Inventory and data

Use `data/inventory.json`. Snapshot timestamps are explicit. Unknowns remain null. `source_inventory_count` is the count displayed on the source, not a guarantee the detail snapshot has identical count; inventory changed during collection. Check `data/coverage.json` for actual capture counts and failures.

Normalize numeric fields for filtering and display. Keep year, make, model, trim, mileage, internet price, fee components, sale price, stock, VIN, colors, specs, photos, packages, equipment, and history references. Read `data/inventory_filters.json` for actual choices and sort values. Body/fuel coverage may be incomplete; never silently guess nulls. Category membership can help when observed.

Required UI: keyword search, all original filter dimensions, sort, filter chips, clear/reset, complete result count, Load More/pagination, no-results assistance, visual cards, local saves, and comparison. List/grid view is a supported original behavior and can be retained. URL state and browser back/forward should work. Use an explicit snapshot label in the demo.

Vehicle cards show image, year/make/model/trim, mileage, internet price, doc/smog fee breakdown, sale price, details CTA, and a locally saved state. Data-driven badges only. Never display a made-up payment or one-owner/accident-free badge without per-vehicle evidence.

## Vehicle detail

Implement the complete reusable template in `VEHICLE_DETAIL_TEMPLATE.md`. Support galleries, scannable facts, history/sticker slots, highlights/packages/equipment, description, financing estimator, inquiries, dealer info, similar vehicles, and disclosures. Use local gallery images for representative vehicles; all remaining image URLs are in inventory data. A fallback must work if a source URL disappears.

Keep prices consistent between cards and detail pages. Listed sale price is not an out-the-door promise. Do not advertise uncertain return-policy terms. Original calculator presets are historical references and must not be presented as lender rates.

## Finance, sell, Find My Car, and contact

Follow `FORMS_AND_INTEGRATIONS.md` and `data/forms.json` for fields, branch structure, provider separation, context, consent, and actions. Appraisal should model VIN/plate/manual entry, vehicle/condition/mileage, optional photos, contact, review, local demo confirmation. No real valuation lookup is available.

Keep English and Spanish financing choices prominent. Never host a fake live credit form; use local informational/provider placeholder screens. A generic contact inquiry is acceptable but must not pretend to be a submitted credit application. RouteOne initial fields and later step labels are known; later fields and authorization are unknown.

Every form must validate and show a clear local-only result. Do not invoke original `/ContactUs/Submit`, `/FindMyCar/Submit`, `/sell-my-car/save`, `/Widget/SaveToPhone`, account endpoints, or provider submit APIs.

## About, staff, customers, community, careers

Use `data/content_index.json` and each source text file. Retain verified business identity, broad services, contact, directions, and local/community positioning. Rewrite generic filler for clarity; avoid inventing history or staff. Magic Faouri is the only observed staff entry, with an email and placeholder image; role and bio are unknown.

Our Customers contains customer photography, not a verified review feed. Build a tasteful photo gallery. Do not synthesize names/quotes/ratings. Review-provider integration can be a future slot. Careers should reflect captured source; no hiring promises or live application delivery.

## Research and SEO

Use the article inventory and corresponding source files. Preserve existing paths and topic intent. Organize Buying Guides, Body Styles, and EV Ownership into a Resources center. Technical claims on older pages need fact checking before published reuse; summarize questionable sections conservatively. Preserve useful newer EV/buyer-guide topic structures. Manufacturer labels map to inventory and are not unseen articles.

Implement unique titles/descriptions, one primary H1, semantic headings, canonical URLs, breadcrumbs, image alt text, AutoDealer schema, and Vehicle/Offer schema using actual values. Do not reuse “Guaranteed Car Loans” blindly. No fabricated review schema. Keep arbitrary filter combinations out of the index; decide canonical/indexing behavior deliberately. A private demo should be noindex and must not replace the live dealer site.

## Integrations and production boundary

`THIRD_PARTY_SERVICES.md` and `data/integrations.json` distinguish observed services from source hooks. DealerSync is the existing platform/inventory/frontend host, not evidence of a portable licensed API. RouteOne, Capital One, CARFAX, Monroney, AutoDriven, maps, analytics, translation, sharing, video, and texting need individual decisions. No private credential was acquired.

Do not copy public client tokens, old tracking IDs, map keys, or antiforgery tokens into the demo. Disable production analytics, CRM submissions, SMS/email, credit/appraisal connections, checkout, and real account creation. Do not invent a Supabase, payment gateway, or CRM dependency simply to build a demo. Keep any future integration behind a clean adapter/config boundary.

## Suggested code boundaries

`SiteHeader`, `MobileNavigation`, `HeroSearch`, `BodyStyleBrowse`, `InventoryFilters`, `FilterSheet`, `SortSelect`, `VehicleCard`, `SavedVehicles`, `VehicleComparison`, `PhotoGallery`, `VehiclePriceBreakdown`, `PaymentEstimator`, `DemoLeadForm`, `AppraisalWizard`, `FinanceProviderPlaceholder`, `DealerInfo`, `StaffCard`, `CustomerGallery`, `ResearchCard`, `ArticleLayout`, `SiteFooter`.

Central modules: inventory adapter, category/alias parser, pricing formatter, filter predicates, SEO metadata, demo form state, and integration configuration. Do not duplicate pricing or filtering logic. Choose an appropriate framework based on the actual destination repository, not a guessed stack.

## Assets

Resolve assets through `asset_manifest.csv` and `data/downloaded_assets.json`, not guessed filenames. Preserve originals. Downloaded inventory demo galleries are referenced by a demo-asset map. The rest of the inventory URLs remain recorded. Assets are private reference/demo materials; commercial republication rights have not been established. Do not label placeholder staff or stock promotional photography as actual dealer staff/building.

## Mobile, accessibility, and verification

The original mobile visual audit is incomplete; `MOBILE_AUDIT.md` is explicit about that. Complete responsive verification during your build at 375/390/430px and desktop. Keyboard-friendly menus, accessible filters/modals, labels/errors, focus management, meaningful alt text, reduced motion, sufficient contrast, and unobscured sticky actions are mandatory. The old accessibility widget does not guarantee compliance.

Verify complete user paths: hero search → filtered inventory → VDP → local inquiry; finance language choice → provider placeholder; sell wizard branches → local review/result; Find My Car → validation/result; contact and directions; saves/compare; legacy alias routes; unavailable image/vehicle/no-results states. No remote lead transmission should occur. Report what was actually tested and attach desktop/mobile screenshots.

## Delivery

Produce a polished working demo, with a README explaining snapshot data and disabled integrations, a reviewable preview, and honest verification notes. Ask for dealer access only when moving from demo to a production inventory/feed/forms implementation. Do not stop at a plan or static homepage.
