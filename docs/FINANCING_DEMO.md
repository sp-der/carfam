# Financing pages

The Finance menu now exposes the five captured routes on desktop and mobile. Each has distinct content: department overview and calculator, English dealer application walkthrough, Spanish walkthrough, separate Capital One educational preview, and bad-credit financing questions. The original financing photo and Capital One logo are reused without a runtime image optimizer.

RouteOne walkthroughs explain the five observed stage labels. They intentionally do not reconstruct uninspected provider fields. Only an optional demo inventory vehicle can be selected. Back, next, review, finish and restart remain local to the component; there is no form submission, persistence, provider request, credit authorization or approval result. Spanish walkthrough copy is translated. Capital One is an explicit unconnected provider preview with inventory navigation, not a simulated eligibility check.

The department and bad-credit pages reuse the shared payment estimator, including sale-price doc/smog fees, shopper-specified illustrative APR and the existing disclosure. No pricing or filter schema changed.

Validation: typecheck and lint passed; 190 unit tests in 16 files passed; production build passed. Added six tests covering all routes, language, shared pricing, provider separation and absence of sensitive/provider fields. Hosted browser verification is recorded separately after deployment.

Production lender integrations remain disabled per SPEC.md demo mode. Connecting a live RouteOne/Capital One application requires separate authorization and verified provider configuration; no integration was activated as part of this change.

## Hosted verification

Verified https://carfam.vercel.app against published code commit `6a380a0cabb606d02e71d2956a015c83f13aa2e8` (Vercel deployment READY). Desktop Finance dropdown opens and exposes all five paths. English walkthrough advances to vehicle selection, retains the selected 2021 Toyota RAV4 on review/completion, then restarts. Spanish walkthrough supports back/next and finishes without a selection; both display explicit no-submission/no-credit-check/no-approval completion messages. Capital One renders its separate provider preview. Bad-credit content renders its dedicated conversation section; calculator shows $336/month for $20,134 at a synthetic 0% APR over 60 months with doc/smog disclosure. Returned to the financing department overview. Mobile navigation was implemented but no mobile viewport verification was performed.

The production HTTP verification script also passed all 54 checks, including all five financing routes and existing inventory/admin/chat/form boundaries. Screenshot: `screenshots/carfam-financing-verified.jpg`.
