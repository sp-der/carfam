# Carfam private dealership demo

Next.js App Router + TypeScript + Tailwind, using the approved server-side JSON repository. Captured inventory is from October 2, 2026; it is not live stock. The original cyan/pink visual system, shared filter schema, sale-price rules and pre-generated 480/960 WebP image setup are preserved.

## Start locally

Requires Node 22+ and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. Public shopping uses `/pre-owned-cars`; the demo workspace is `/admin`.

Optional environment settings are documented in `.env.example`. Do not commit `.env.local` or API keys.

## What is implemented

- Public homepage, search/filter/sort inventory, vehicle details, saved vehicles/comparison, pricing and illustrative calculator.
- Remaining dealership, finance/provider-preview, appraisal, Find My Car, contact, resource, legal/demo-notice, account-shell and sitemap routes.
- Explicit route registry: unknown paths remain genuine 404s; legacy inventory aliases remain supported.
- Local-only contact, inquiry, appraisal and Find My Car requests feeding the demo inbox. No actual email/SMS, credit check, appraisal valuation or appointment confirmation.
- Admin inventory create/edit, photo upload/reordering/removal, prices, equipment, availability, publication/archive, featured rank and owner-review flags.
- Lead inbox with search/status filters, role-scoped access, assignment, notes and owner-only reset.
- Shopping assistant: make/body/fuel/under-budget searches, follow-up criteria, reset, public vehicle navigation and approved-FAQ boundary. An optional Anthropic SDK adapter extracts one validated tool call; local code creates replies and routes.

## Demo admin is NOT authentication

The approved Demo mode in `SPEC.md` explicitly requires **no Supabase and no login**. The “Viewing as” control selects synthetic owner/manager/sales actors, and server services enforce the simulated roles. Anybody with access to the private demo can choose those roles. This is not a security boundary and must not hold real customer information.

Production staff accounts/login, MFA/RLS, financing overview, content/settings tools and audit history were explicitly deferred after Phase 0. There is no owner password to bootstrap in this version. Use hosting-level protection for any shared preview; noindex alone is not protection. No hosted deployment is included.

## Storage and images

- `data/seed/inventory.seed.json`: 127 captured vehicles, including eight approved featured picks.
- `.data/store.json`: runtime store (gitignored). Imports insert missing vehicles only; edits survive re-import.
- `npm run demo:reset`: restores seed vehicles/leads/staff and removes local edits. Stop the server first because the process caches its repository. Confirm before using it on a demo containing edits you want to keep.
- `npm run import:recon`: deterministic import; preserves the approved featured picks.
- Original photos and 480/960 WebP variants are committed. No Carfam photo-server calls occur at runtime.
- Admin uploads accept JPEG/PNG/WebP up to 8 MB, validate image contents, strip metadata through re-encoding and generate 480/960 variants beside a JPEG. Runtime uploads live in `.data/photo-uploads/` (or `CARFAM_UPLOAD_DIR`), are gitignored, and are served through a validated local image route; back them up separately if needed.
- Removing a photo detaches its record; its files are retained for recovery. Appraisal photos never upload; only their count is recorded.
- Use a writable, persistent filesystem and a single server process for full demo editing. Read-only hosting exposes a read-only banner and refuses writes. Ephemeral/multi-instance serverless hosting is not a reliable writable JSON datastore.

## Chatbot

Without `ANTHROPIC_API_KEY` **and** `ANTHROPIC_MODEL`, the clearly labeled deterministic demo assistant is used. It does not claim to be live AI. Complex unsupported criteria produce guidance rather than silently dropping constraints.

Examples:

- “Show me Hondas under $15k” → Honda, sale price strictly below $15,000.
- “Show me Lexuses” → a new Lexus search.
- “Only SUVs” → keeps existing criteria and adds SUV.
- “Actually under $20k” → replaces the budget limit.
- “Clear everything” → resets.
- “Show me that one” → opens an unambiguous result; otherwise asks which vehicle.

To enable AI, obtain a server-side Anthropic API key and set the exact available model ID in `ANTHROPIC_MODEL`. The adapter is implemented but real API calls have not been verified here. Timeouts/errors/cap exhaustion fall back to the deterministic behavior where possible.

There is one model call per request, no autonomous tool loop, no model-generated URLs/SQL/admin operations, strict local tool/filter validation, message limits, request rate limits and a conservative per-process daily token reservation cap. Limits are demonstration controls, not distributed production enforcement. No lead/admin records are sent to the provider. Common sensitive/contact patterns are rejected; this is not a complete production DLP system. Visitors should never share identity or financial information in chat.

FAQ seed entries remain draft pending dealer approval. The assistant never repeats drafts as approved facts. Production FAQ publishing is deferred with the content tools.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Self-contained API/HTTP test server and isolated test datastore:
CARFAM_START_SERVER=1 npm run verify:http
# Browser suite on a machine allowed to run a local Chromium browser:
npx playwright install chromium
npm run test:browser
```

On PowerShell, set `$env:CARFAM_START_SERVER="1"` before `npm run verify:http`.

If the `tsx` CLI cannot create its temporary IPC socket in your environment, use `node --import tsx scripts/reset-demo.ts` or `node --import tsx scripts/import-recon.ts` for the same scripts. Project commands remain unchanged.

Browser tests include desktop 1440px and mobile 375/390/430px projects, route/overflow checks, contact → inbox, assistant → filters, role controls, appraisal and screenshots. Stop other servers first to ensure the suite uses its isolated datastore. **Browser tests/screenshots remain unverified in this execution environment because the cloud browser blocks localhost with `ERR_BLOCKED_BY_CLIENT`.** See `docs/IMPLEMENTATION_STATUS.md` for the exact verification record and remaining work.

## Production requirements

Before a real launch: select an authoritative inventory source/feed, migrate the repository to a persistent multi-user database, implement staff authentication/MFA and authorization, approve dealer facts/policies/privacy/retention/consent, configure delivery and providers, add distributed rate limiting/spam controls, persistent image storage/backups, monitoring and an audit trail. Keep sensitive credit applications in the approved provider unless a separately reviewed compliant integration is commissioned.

Do not copy original tracking IDs, provider keys or antiforgery tokens. Do not deploy to `carfam.com`. Asset republication rights and current dealership facts need confirmation. Main-site hours/phones, return policy, historic community claims and questionable research specs remain flagged in the recon and Phase 0 plan.
