# Carfam Dealership Demo — Build Spec

You are building a complete, modern, private Carfam dealership demo in this project folder.

- **Repository:** https://github.com/sp-der/carfam (this folder is its local clone)
- **Source package:** the recon package is extracted at `./carfam-recon/`
- **Working branch:** `demo-build`. Never commit to or merge into `main`.

Build the public website, a working staff admin dashboard, and an inventory-connected shopping chatbot. Do not stop at a plan, homepage mockup, or dashboard with decorative buttons.

---

## Execution model (read first)

This build runs in **phases**. The user will tell you which phase to run.

- Complete only the requested phase, then **stop** and report: what was built, what was tested and how, what's incomplete, and any decisions needed.
- Do not start the next phase until told.
- Commit at the end of each phase on `demo-build` with a message like `Phase 2: core public site`. Push to `origin demo-build` only when the user says to.
- Treat `CLAUDE.md` as the record of decisions made in earlier phases. Update it when the stack, data model, or conventions change.

| Phase | Scope |
|---|---|
| 0 | Plan only. Read everything, propose data model, route map, import mapping, budget price field, conflicts, gaps. No code. |
| 1 | Foundation: scaffold, Supabase migrations + RLS, idempotent inventory import, shared filter schema + search service, tests. No UI. |
| 2 | Core public site: homepage, inventory page, vehicle detail template. |
| 3 | Remaining public pages, forms, legacy aliases, empty/error states. |
| 4 | Staff auth + roles + admin inventory management. |
| 5 | Lead inbox, financing overview, content management, settings, audit log. Wire public forms to leads. |
| 6 | Chatbot: deterministic demo assistant, then AI adapter behind the same tools. |
| 7 | Full verification, README, `.env.example`, screenshots, handoff list. |

---

## Instruction priority

This spec replaces `CLAUDE_BUILD_PROMPT.md` and overrides conflicting instructions in `CLAUDE_REBUILD_HANDOFF.md`.

Staff authentication, persistent inventory management, an admin dashboard, and a server-side AI integration are authorized parts of the build. Public customer accounts are not required.

The project remains a private demo. Real credit applications, CRM delivery, customer emails/SMS, appraisal services, and production inventory feeds must remain disabled until separately configured and authorized.

---

## Stack (locked)

- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database, auth, storage:** Supabase (Postgres, Supabase Auth, Supabase Storage)
- **Chatbot AI:** Anthropic SDK, server-side only, behind a provider-agnostic adapter
- **Tests:** Vitest for unit/integration; Playwright for end-to-end and screenshots
- **Package manager:** npm

Do not switch frameworks or databases without asking.

### Environment

- Supabase project credentials are in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). If any are missing, stop and ask; do not invent a substitute database.
- `ANTHROPIC_API_KEY` may or may not be present. If absent, follow the fallback rules in "AI and backend implementation."
- Never commit `.env.local`. Ensure `.gitignore` covers `.env*` except `.env.example`, plus `node_modules` and `.next`.
- Never put the service role key in client code.

---

## Skills to use

These are installed. Use them:

- **frontend-design**: visual direction for all public and admin UI
- **vercel-react-best-practices**: performance and Next.js patterns
- **vercel-composition-patterns**: reusable component structure
- **vercel-react-view-transitions**: restrained page and gallery transitions
- **webapp-testing**: run the app and capture screenshots at the required viewports
- **web-design-guidelines**: audit UI at the end of each UI phase, then fix findings

---

## Inspect and start

Inspect the repository before changing code. Preserve useful working systems.

Read in `./carfam-recon/`:

- `README.md`
- `CLAUDE_REBUILD_HANDOFF.md`
- `DESIGN_RECOMMENDATIONS.md`
- `CONTENT_ISSUES.md`
- `VEHICLE_DETAIL_TEMPLATE.md`
- `FORMS_AND_INTEGRATIONS.md`
- `THIRD_PARTY_SERVICES.md`
- `MOBILE_AUDIT.md`
- Relevant files in `data/`

The package already contains the audit, captured routes, 127 vehicle records, original assets, and desktop screenshots. Do not repeat the crawl unless a specific missing fact blocks implementation.

---

## Public website

Create a polished automotive website that feels welcoming, energetic, and professional.

Preserve Carfam's original logo proportions and cyan/pink identity: `#00aeef` and `#ef59a1`. Use a cinematic graphite hero, bright inventory surfaces, strong typography, real imagery, and restrained animation.

Present the full mixed inventory: commuters, family vehicles, trucks, sports/luxury vehicles, EVs, and hybrids. Do not position Carfam as luxury-only.

Build:

- Homepage with search, body-style browsing, featured vehicles, financing/sell panels, business story, customer photography, and location/hours.
- Inventory with keyword search, documented filters, sorting, filter chips, clear/reset, result count, pagination or Load More, saved vehicles, and comparison.
- Reusable vehicle detail pages with galleries, specifications, equipment, packages, pricing breakdown, disclosures, calculator, inquiry forms, and similar vehicles.
- Financing pages with English/Spanish choices and clearly labeled provider demo screens.
- Trade appraisal wizard with VIN/plate/manual branches, condition, mileage, optional photos, contact, review, and demo confirmation.
- Find My Car and contact flows.
- About, staff, customers, community, careers, research/resources, and legal pages from the package.
- Observed legacy inventory/category/detail aliases backed by shared data and filtering logic.
- Proper unavailable-vehicle, broken-image, and no-results states.

URL filters and browser back/forward must work. Do not redirect every unknown route to the homepage; return a real 404.

Use the asset manifests to resolve filenames. Never invent vehicle specifications, prices, staff biographies, reviews, ratings, awards, or policy terms. Preserve unknown fields as unknown.

Flag conflicting business information for owner review. Do not publish the conflicting 200/250-mile return policy as settled fact. Customer photography is not a verified review feed.

Label the captured inventory as demo snapshot data.

---

## Working admin dashboard

Build `/admin` with protected staff login and functional management screens.

Use persistent storage so changes survive refreshes and server restarts. Seed the captured inventory once using an idempotent import; never overwrite staff edits on application startup or re-import.

Use one inventory source for the public website, admin dashboard, and chatbot.

### 1. Staff access

- Individual staff accounts and logout.
- **Password reset in the demo:** the owner resets staff passwords from the admin. No password-reset emails.
- Owner, manager, and sales roles.
- Enforce permissions in the database (Supabase RLS) and server routes, not just by hiding buttons.
- Owner controls staff access and settings; managers manage inventory/content/leads; sales staff manage assigned leads.
- No public admin registration, shared hardcoded passwords, or authentication bypass.
- Initial owner account is created by a documented bootstrap script, not a hardcoded credential.
- Document MFA as a production requirement for privileged access.

### 2. Inventory management

- Add, edit, preview, publish/unpublish, and archive vehicles.
- Available, pending, and sold status.
- VIN, stock number, year, make, model, trim, mileage, colors, known specifications, description, features, packages, pricing, and fee components.
- Upload, reorder, replace, and remove images (Supabase Storage).
- Featured-vehicle controls.
- Validation and duplicate VIN/stock checks.
- Confirm destructive actions; prefer archival for records referenced by leads.
- Changes immediately update public listings and chatbot search results.

### 3. Lead inbox

- Contact, test-drive, vehicle inquiry, trade appraisal, Find My Car, and chatbot contact requests.
- Search/filter, lead details, interested vehicle, source, assigned staff, notes, and timestamps.
- New, contacted, scheduled, and closed statuses.
- Dashboard counts and an activity feed.
- Use clearly labeled synthetic sample leads in the demo.

### 4. Financing overview

- Synthetic application references and statuses for the demo.
- Restricted access for authorized staff.
- A future provider adapter for permitted metadata/status and secure provider links.
- Do not claim RouteOne or Capital One API access is available.
- Do not collect or store real SSNs, banking details, identity documents, or real credit applications.
- Do not simulate a real lender approval or credit decision.

### 5. Content management

- Hours, contact information, homepage headlines/promotions, staff content, featured inventory, resources, and approved dealership FAQs.
- Draft/preview/publish behavior for editable content.
- Clearly mark policy conflicts requiring owner confirmation.

### 6. Settings and audit history

- Staff permissions, notification settings, chatbot greeting/FAQs, and integration connection status.
- Log important inventory, content, permission, and lead-status changes with staff identity and timestamp.
- Show integrations honestly as demo, unconfigured, or connected.

Reporting must reflect actual stored demo activity or clearly labeled sample data. Do not fabricate live conversion statistics.

---

## Inventory shopping chatbot

Build a branded, mobile-friendly chat widget with this editable greeting:

> "Welcome to Carfam! What can I help you find?"

It must search and navigate the website using structured tools.

Required behavior:

- "Show me Hondas under $15k" applies Honda and price strictly below $15,000.
- "Show me Lexuses" applies Lexus.
- "Only SUVs" preserves existing relevant filters and adds SUV.
- "Actually under $20k" replaces the earlier price limit.
- "Clear everything" resets filters.
- "Show me that one" opens the referenced vehicle when the reference is unambiguous.
- Ambiguous requests trigger a concise clarification.
- No matches produces an honest result and suggested changes; never silently relax a budget.

Use a shared, validated filter schema and the same search service as the public inventory page. Define which displayed price field the budget filter uses (decided in Phase 0) and communicate it consistently.

Controlled tools:

- Search inventory.
- Apply inventory filters.
- Open a vehicle detail page.
- Retrieve approved dealership FAQs.
- Open a contact/test-drive form.

Validate tool arguments server-side. Navigation must use allowlisted local routes. The model must not execute arbitrary URLs, SQL, or admin actions.

Display matching vehicle cards with actual prices, images, and detail links. Update the inventory URL and visible filter chips when applying filters.

Use current database inventory for results. Do not rely on model memory for availability or vehicle facts. Archived, unpublished, and sold vehicles are excluded from normal shopping results.

The chatbot may explain approved hours, location, shopping steps, and general financing information. It must not guarantee approval, invent APRs/payments, make unsupported vehicle-history claims, or ask for sensitive credit details.

Provide an explicit staff-contact option. In the demo it records only a clearly labeled demo inquiry.

---

## AI and backend implementation

Use server-side AI requests through the Anthropic SDK behind a provider-agnostic adapter. Make the model name configurable via environment variable. Store API keys only in server environment variables.

Add input limits, rate limiting, bounded conversation/tool execution, error handling, and a configurable usage cap. Do not send admin data, lead data, or credit information to the model.

If `ANTHROPIC_API_KEY` is not set:

- Keep the site and dashboard operational.
- Use a clearly labeled deterministic demo assistant supporting every shopping example above.
- Keep the real AI adapter implemented and document how to enable it.
- Do not call the fallback a live AI integration.

Provide Supabase migrations, RLS policies, seed/import scripts, and setup instructions.

Separate public vehicle data from restricted staff/lead data. Restrict uploads by size and type. Protect all mutation endpoints.

---

## Demo and production boundaries

Public forms must clearly state "Demo only—nothing was sent."

Safe non-sensitive demo submissions may be stored in the demo database for dashboard demonstration. Credit application screens use synthetic records only.

Do not invoke original Carfam submission endpoints, production tracking IDs, provider keys, live email/SMS, checkout, credit checks, or valuation APIs.

Design future inventory-feed and lead/provider adapters without claiming they are connected. Document the source-of-truth decision needed if Carfam already manages inventory in a dealership system.

Keep the demo noindex. Noindex is not access control: any hosted preview must use hosting-level protection (e.g., Vercel Deployment Protection). Do not deploy anywhere unless the user asks. Never replace or deploy to `carfam.com`.

---

## Verification

Verify desktop (1440px) and mobile viewports at 375, 390, and 430 pixels, including keyboard navigation and reduced motion.

Test complete flows:

- Search → filtered inventory → vehicle → demo inquiry → admin inbox.
- Admin login → add/edit vehicle/photos/pricing/status → public site and chatbot reflect changes.
- Unauthorized users cannot read leads or mutate inventory.
- Sales staff cannot access owner-only controls.
- Duplicate imports do not overwrite staff edits.
- Chatbot Honda/budget, Lexus, follow-up filters, reset, no-results, and vehicle navigation examples.
- AI failures, missing keys, and rate-limit behavior.
- Financing language choices, appraisal branches, Find My Car, contact, saves/comparison, and legacy aliases.
- No real credit, lead, email, or SMS transmission.

Add meaningful automated tests for permissions, inventory/pricing/filter logic, import behavior, and chatbot tool validation. Run typecheck, lint, tests, and production build.

Capture desktop/mobile screenshots of the public site, admin dashboard, and chatbot into `./screenshots/`.

---

## Delivery (end of Phase 7)

- Working public site, admin dashboard, and shopping assistant.
- Persistent inventory import and management.
- Secure staff access with documented owner bootstrap.
- Database migrations and sample data.
- `.env.example` containing variable names only.
- README with local setup, staff bootstrap, AI setup, demo boundaries, and production integration requirements.
- A runnable local preview; a protected hosted preview only if the user requests one.
- Actual verification results and screenshots.
- A concise list of remaining credentials or dealer decisions.

Make routine implementation choices without asking. If one integration is blocked, finish everything else in the current phase. Clearly distinguish implemented, tested, simulated, and unconfigured features.
