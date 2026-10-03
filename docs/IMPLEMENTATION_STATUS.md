# Implementation status — October 3, 2026

The owner authorized publishing to `main` and proceeding through the remaining phases, overriding the earlier branch-only/per-phase stop instructions. The approved demo architecture and pricing, photo and filter rules remain unchanged.

## Delivery

- Phases 0–2: existing import, data layer and public shopping experience retained, including the eight approved featured vehicles.
- Phase 3: public supporting routes, original research aliases, contact/Find My Car lead forms, appraisal preview/review flow, financing calculator and explicitly labelled lender/account placeholders.
- Phase 4: demo role switcher, persistent inventory creation/editing/status/publication/featured ordering, photo upload/reordering/removal, lead assignment/status/notes and owner-only confirmed reset. Read-only storage disables mutations.
- Phase 5: shopping assistant uses the existing filter/search service and controlled navigation tools. Deterministic fallback works without credentials; an optional Anthropic adapter extracts validated tools rather than publishing model prose. Draft FAQs cannot be presented as approved dealership facts.
- Phase 6: README, configuration example, unit/API verification and executable browser suite delivered. Browser execution, mobile visual review and screenshots remain outstanding.

## Actual verification

`npm run typecheck` and `npm run lint` exited successfully. `npm test` reported:

```text
Test Files  12 passed (12)
Tests       172 passed (172)
```

`npm run build` reported:

```text
✓ Compiled successfully
✓ Generating static pages using 8 workers (12/12)
```

`CARFAM_START_SERVER=1 npm run verify:http` ran the production server against an isolated, gitignored JSON datastore and reported:

```text
HTTP verification complete: 54 checks passed. Sample lead and archived test vehicle retained locally.
```

These checks cover public routes/404/noindex, demo permissions, contact persistence and lead assignment, live inventory changes reflected in assistant searches, strict budgets, draft FAQ restrictions and serving all generated upload photo variants. They are not browser tests.

The cloud browser refused `http://localhost:3000` with `ERR_BLOCKED_BY_CLIENT`. No alternate browser access was used to bypass that restriction. The new Playwright suite has not run here and no new screenshots were captured. Earlier handoff browser results do not verify the new work.

## Remaining before sign-off

1. Run `npx playwright install chromium` and `npm run test:browser` on an environment permitting local browser access. Review desktop and 375/390/430px screenshots, navigation, accessibility and interactions; fix any failures before calling Phase 6 complete.
2. Configure an approved `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` to test the optional live provider. No paid model call was made here. Per-process rate/cost guards are demo safeguards, not durable production billing controls.
3. Confirm dealership facts, research claims, legal wording and asset rights flagged in the recon/Phase 0 plan. Draft FAQs remain unapproved.

## Intentionally deferred, not production-ready

The approved Demo mode explicitly excludes login/authentication, MFA/RLS, production financing applications, content/settings tools and audit history. `/admin` is an unauthenticated demonstration: the role selector is not security. Never collect real credit or sensitive personal information in this build. No lender submissions or emails are sent; account/lender screens are labelled placeholders.

Storage is a single-process JSON file, not a multi-instance production database. Uploaded inventory photos live under `.data/photo-uploads` (or `CARFAM_UPLOAD_DIR`) with metadata-stripped originals and pre-generated 480/960 WebP files. Appraisal photos stay browser-only. Protect shared previews at the hosting layer; noindex is not access control. No hosted deployment was requested or performed.
