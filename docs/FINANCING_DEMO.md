# Financing pages

The Finance menu now exposes the five captured routes on desktop and mobile. Each has distinct content: department overview and calculator, English dealer application walkthrough, Spanish walkthrough, separate Capital One educational preview, and bad-credit financing questions. The original financing photo and Capital One logo are reused without a runtime image optimizer.

RouteOne walkthroughs explain the five observed stage labels. They intentionally do not reconstruct uninspected provider fields. Only an optional demo inventory vehicle can be selected. Back, next, review, finish and restart remain local to the component; there is no form submission, persistence, provider request, credit authorization or approval result. Spanish walkthrough copy is translated. Capital One is an explicit unconnected provider preview with inventory navigation, not a simulated eligibility check.

The department and bad-credit calculators use the shared `estimateMonthlyPayment` pricing function, fee-inclusive inventory sale prices, shopper-selected illustrative APR and the existing vehicle disclosure. The vehicle-detail payment estimator is unchanged. No pricing or filter schema changed.

Validation: typecheck and lint passed; 190 unit tests in 16 files passed; production build passed. Added six tests covering all routes, language, shared pricing, provider separation and absence of sensitive/provider fields. Hosted browser verification is recorded separately after deployment.

Production lender integrations remain disabled per SPEC.md demo mode. Connecting a live RouteOne/Capital One application requires separate authorization and verified provider configuration; no integration was activated as part of this change.

## Hosted verification

Verified https://carfam.vercel.app against published code commit `6a380a0cabb606d02e71d2956a015c83f13aa2e8` (Vercel deployment READY). Desktop Finance dropdown opens and exposes all five paths. English walkthrough advances to vehicle selection, retains the selected 2021 Toyota RAV4 on review/completion, then restarts. Spanish walkthrough supports back/next and finishes without a selection; both display explicit no-submission/no-credit-check/no-approval completion messages. Capital One renders its separate provider preview. Bad-credit content renders its dedicated conversation section; calculator shows $336/month for $20,134 at a synthetic 0% APR over 60 months with doc/smog disclosure. Returned to the financing department overview. Mobile navigation was implemented but no mobile viewport verification was performed.

The production HTTP verification script also passed all 54 checks, including all five financing routes and existing inventory/admin/chat/form boundaries. Screenshot: `screenshots/carfam-financing-verified.jpg`.


## Owner reference updates

Bad-credit content now includes the supplied original banner and three adapted sections: local auto-loan assistance and five credit concerns, finance-team discussion topics, and in-person/online next steps. The verified Rialto address replaces stale Bloomington location copy. Claims about guaranteed financing, specific lender relationships and credit-review services are not added without verification. Calls, directions, inventory browsing and both language walkthroughs are linked.

The finance calculator now accepts an inventory vehicle or a manually entered starting amount including doc/smog fees. Down payment and trade-in are subtracted once. Score-band buttons select explicitly historical example APRs from the reference; they are not lender offers or an eligibility model. The original reference omitted 521–579, so the first illustrative band is Below 580. APR remains editable; changing it clears the selected band. Term buttons and input changes update the estimate instantly. All state stays local to the component; no credit check, storage or provider request occurs. Tests: 194 passed in 17 files; typecheck, lint and production build passed. Hosted verification follows publication.

Verified the reference updates on the public demo at code commit `c478f46ac966fd0d90ccaf1b408d7fb92e8dd401` (Vercel READY). Manual $20,000 starting amount, $2,000 down and $3,000 trade produces $15,000 principal and $282/month at historical example 4.9% APR over 60 months. Entering 0% clears the score-band selection and gives $250/month; choosing 36 months gives $417/month. Negative APR shows the shared validation error. Bad-credit headings and the original banner were verified in the browser; banner loaded at natural width 2377. All 54 HTTP checks passed. Screenshot: `screenshots/carfam-payment-calculator-verified.jpg`. Mobile viewport checks remain pending.
