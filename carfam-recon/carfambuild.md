You are building a complete, modern, private Carfam dealership demo in the connected GitHub repository.

Use the attached `carfam-recon.zip` as the source package. Build the public website, a working staff admin dashboard, and an inventory-connected shopping chatbot. Do not stop at a plan, homepage mockup, or dashboard with decorative buttons.

## Instruction priority

This prompt replaces `CLAUDE_BUILD_PROMPT.md` and overrides conflicting instructions in `CLAUDE_REBUILD_HANDOFF.md`.

Specifically, staff authentication, persistent inventory management, an admin dashboard, and a server-side AI integration are now authorized parts of the build. Public customer accounts are not required.

The project remains a private demo. Real credit applications, CRM delivery, customer emails/SMS, appraisal services, and production inventory feeds must remain disabled until separately configured and authorized.

## Inspect and start

Inspect the repository before choosing a framework or changing existing code. Preserve useful working systems.

Read:

- `README.md`
- `CLAUDE_REBUILD_HANDOFF.md`
- `DESIGN_RECOMMENDATIONS.md`
- `CONTENT_ISSUES.md`
- `VEHICLE_DETAIL_TEMPLATE.md`
- `FORMS_AND_INTEGRATIONS.md`
- `THIRD_PARTY_SERVICES.md`
- `MOBILE_AUDIT.md`
- Relevant files in `data/`

Use available Claude design, frontend, backend, and browser skills where appropriate. Do not assume a skill is installed.

The package already contains the audit, captured routes, 127 vehicle records, original assets, and desktop screenshots. Do not repeat the crawl unless a specific missing fact blocks implementation.

## Public website

Create a polished automotive website that feels welcoming, energetic, and professional.

Preserve Carfam’s original logo proportions and cyan/pink identity: `#00aeef` and `#ef59a1`. Use a cinematic graphite hero, bright inventory surfaces, strong typography, real imagery, and restrained animation.

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

URL filters and browser back/forward must work. Do not redirect every unknown route to the homepage.

Use the asset manifests to resolve filenames. Never invent vehicle specifications, prices, staff biographies, reviews, ratings, awards, or policy terms. Preserve unknown fields as unknown.

Flag conflicting business information for owner review. Do not publish the conflicting 200/250-mile return policy as settled fact. Customer photography is not a verified review feed.

Label the captured inventory as demo snapshot data.

## Working admin dashboard

Build `/admin` with protected staff login and functional management screens.

Use persistent storage so changes survive refreshes and server restarts. Seed the captured inventory once using an idempotent import; never overwrite staff edits on application startup.

Use one inventory source for the public website, admin dashboard, and chatbot.

Implement:

1. Staff access
   - Individual staff accounts, logout, and password recovery where supported.
   - Owner, manager, and sales roles.
   - Enforce permissions on the server/database, not just by hiding buttons.
   - Owner controls staff access and settings; managers manage inventory/content/leads; sales staff manage assigned leads.
   - No public admin registration, shared hardcoded passwords, or authentication bypass.
   - Use MFA for production privileged access where supported.

2. Inventory management
   - Add, edit, preview, publish/unpublish, and archive vehicles.
   - Available, pending, and sold status.
   - VIN, stock number, year, make, model, trim, mileage, colors, known specifications, description, features, packages, pricing, and fee components.
   - Upload, reorder, replace, and remove images.
   - Featured-vehicle controls.
   - Validation and duplicate VIN/stock checks.
   - Confirm destructive actions; prefer archival for records referenced by leads.
   - Changes immediately update public listings and chatbot search results.

3. Lead inbox
   - Contact, test-drive, vehicle inquiry, trade appraisal, Find My Car, and chatbot contact requests.
   - Search/filter, lead details, interested vehicle, source, assigned staff, notes, and timestamps.
   - New, contacted, scheduled, and closed statuses.
   - Dashboard counts and an activity feed.
   - Use clearly labeled synthetic sample leads in the demo.

4. Financing overview
   - Synthetic application references and statuses for the demo.
   - Restricted access for authorized staff.
   - A future provider adapter for permitted metadata/status and secure provider links.
   - Do not claim RouteOne or Capital One API access is available.
   - Do not collect or store real SSNs, banking details, identity documents, or real credit applications.
   - Do not simulate a real lender approval or credit decision.

5. Content management
   - Hours, contact information, homepage headlines/promotions, staff content, featured inventory, resources, and approved dealership FAQs.
   - Draft/preview/publish behavior for editable content.
   - Clearly mark policy conflicts requiring owner confirmation.

6. Settings and audit history
   - Staff permissions, notification settings, chatbot greeting/FAQs, and integration connection status.
   - Log important inventory, content, permission, and lead-status changes with staff identity and timestamp.
   - Show integrations honestly as demo, unconfigured, or connected.

Reporting must reflect actual stored demo activity or clearly labeled sample data. Do not fabricate live conversion statistics.

## Inventory shopping chatbot

Build a branded, mobile-friendly chat widget with this editable greeting:

“Welcome to Carfam! What can I help you find?”

It must search and navigate the website using structured tools.

Required behavior:

- “Show me Hondas under $15k” applies Honda and price strictly below $15,000.
- “Show me Lexuses” applies Lexus.
- “Only SUVs” preserves existing relevant filters and adds SUV.
- “Actually under $20k” replaces the earlier price limit.
- “Clear everything” resets filters.
- “Show me that one” opens the referenced vehicle when the reference is unambiguous.
- Ambiguous requests trigger a concise clarification.
- No matches produces an honest result and suggested changes; never silently relax a budget.

Use a shared, validated filter schema and the same search service as the public inventory page. Define which displayed price field the budget filter uses and communicate it consistently.

Implement controlled tools such as:

- Search inventory.
- Apply inventory filters.
- Open a vehicle detail page.
- Retrieve approved dealership FAQs.
- Open a contact/test-drive form.

Validate tool arguments server-side. Navigation must use allowlisted local routes. The model must not execute arbitrary URLs, SQL, or admin actions.

Display matching vehicle cards with actual prices, images, and detail links. Update the inventory URL and visible filter chips when applying filters.

Use current database inventory for results. Do not rely on model memory for availability or vehicle facts. Archived, unpublished, and sold vehicles must be excluded from normal shopping results.

The chatbot may explain approved hours, location, shopping steps, and general financing information. It must not guarantee approval, invent APRs/payments, make unsupported vehicle-history claims, or ask for sensitive credit details.

Provide an explicit staff-contact option. In the demo it records only a clearly labeled demo inquiry.

## AI and backend implementation

Inspect the existing stack first. If the repository is empty, choose a maintainable TypeScript stack with server routes and a relational database.

Supabase is an acceptable option for authentication, database, and image storage, but do not assume a project already exists. Provide migrations, permission policies, seed/import scripts, and setup instructions for the chosen backend.

Use server-side AI requests through an appropriate SDK and a configurable model provider. Store API keys only in server environment variables.

Keep the AI provider replaceable. Add input limits, rate limiting, bounded conversation/tool execution, error handling, and a configurable usage cap. Do not send admin data or credit information to the model.

If no model key is available:
- Keep the site and dashboard operational.
- Provide a clearly labeled deterministic demo assistant supporting the specified shopping examples.
- Keep the real AI adapter implemented and document how to enable it.
- Do not call the fallback a live AI integration.

If backend credentials are unavailable, provide a reproducible persistent local development setup and secure authentication. Document what blocks a hosted preview; do not substitute an insecure browser-only admin system.

Separate public vehicle data from restricted staff/lead data. Restrict uploads by size/type and protect mutation endpoints.

## Demo and production boundaries

Public forms must clearly state “Demo only—nothing was sent.”

Safe non-sensitive demo submissions may be stored in the demo database for dashboard demonstration. Credit application screens use synthetic records only.

Do not invoke original Carfam submission endpoints, production tracking IDs, provider keys, live email/SMS, checkout, credit checks, or valuation APIs.

Design future inventory-feed and lead/provider adapters without claiming they are connected. Document the source-of-truth decision needed if Carfam already manages inventory in a dealership system.

Keep the demo noindex. Noindex is not access control: use hosting-level protection for a hosted private preview where available. Do not replace or deploy to `carfam.com`.

## Verification

Verify desktop and real mobile viewports at 375, 390, and 430 pixels, including keyboard navigation and reduced motion.

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

Add meaningful automated tests for permissions, inventory/pricing/filter logic, import behavior, and chatbot tool validation. Run the appropriate typecheck, lint, tests, and production build.

Capture desktop/mobile screenshots of the public site, admin dashboard, and chatbot.

## Delivery

Complete the implementation in the connected repository. Commit and push to a dedicated feature branch when repository access permits. Do not merge to the main branch automatically.

Deliver:

- Working public site, admin dashboard, and shopping assistant.
- Persistent inventory import and management.
- Secure staff access.
- Database migrations and sample data.
- `.env.example` containing variable names only.
- README with local setup, staff bootstrap, AI setup, demo boundaries, and production integration requirements.
- A protected preview if hosting access is available; otherwise a runnable local preview.
- Actual verification results and screenshots.
- A concise list of remaining credentials or dealer decisions.

Proceed autonomously with routine implementation choices. Finish everything possible if one integration is blocked. Clearly distinguish implemented, tested, simulated, and unconfigured features.