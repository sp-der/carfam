# Carfam reconstruction package

Give Claude this entire ZIP plus `CLAUDE_BUILD_PROMPT.md`. Claude should read `CLAUDE_REBUILD_HANDOFF.md` first. This is an audit/content/data/asset package; no replacement site was built or published.

## Verified capture totals

| Capture | Count |
| --- | ---: |
| Discovered/requested unique URLs | 431 |
| Successful HTTP source captures | 429 |
| Canonical/final URL groups | 427 |
| Inventory category pages | 272 |
| Vehicle records | 127 |
| Editorial research articles | 7 |
| Lead-form flows | 10 |
| Grouped HTML form definitions, including utility forms | 16 |
| Third-party services or hooks | 13 (11 confirmed, 2 source-only) |
| Downloaded assets | 146 |
| Inventory photo/placeholder URLs | 2961 |
| Downloaded demo vehicle photos | 36 across 9 vehicles |
| Desktop screenshots | 23 |
| Mobile screenshots | 0 |

## Read order

1. CLAUDE_REBUILD_HANDOFF.md and CLAUDE_BUILD_PROMPT.md
2. DESIGN_RECOMMENDATIONS.md and CONTENT_ISSUES.md
3. VEHICLE_DETAIL_TEMPLATE.md and FORMS_AND_INTEGRATIONS.md
4. CARFAM_SITE_AUDIT.md, THIRD_PARTY_SERVICES.md, MOBILE_AUDIT.md
5. data/inventory.json, dealership.json, navigation.json, research_pages.json, lead_flows.json, forms.json, inventory_filters.json, inventory_categories.json
6. asset_manifest.csv, data/demo_assets.json, screenshots, and source evidence as needed

`ROUTE_INDEX.md` links each captured route to its source evidence. `data/routes.json` contains the full page-by-page records; `canonical_groups.json` records aliases. `data/content_index.json` locates extracted body copy. `data/coverage.json` is the exact capture ledger.

## Findings and limits

Two public URLs were unavailable: `/pre-owned-exotic-cars` (404), and `/pre-owned-cars/detail/2022-Kia-Forte/1505080` (410). Their responses are preserved. A newly discovered vehicle offset the unavailable VDP, leaving 127 extracted accessible records. Inventory data can change during a crawl.

The source disagrees about return-policy mileage (200 vs 250), geographic wording, dealer phone, and hours. Staff is sparse and Our Customers is a photo gallery, not a sourced review feed. Some research specifications are questionable. Twenty-six listings use Coming Soon imagery. See CONTENT_ISSUES.md before displaying these claims.

Actual mobile viewport screenshots and usability inspection were unavailable. Only the initial public credit form fields and progression labels were inspected; later required fields were not traversed. No production credit/appraisal/contact/texting/account form was submitted. Maps were blocked by this browser's organization policy; that is not proof of a broken public embed.

All downloaded raster files retain original bytes/dimensions. Vehicle galleries not downloaded remain recorded as URLs. Assets are for private reference/demo; commercial republication rights are not established. Public map/client embed keys and ephemeral verification tokens are redacted from copied source. Do not reuse the original provider/analytics configuration in a demo.

## Demo boundary

Build functional local interactions and clearly label all submissions as demo-only. Do not activate remote leads, credit checks, appraisal offers, accounts, SMS/email, checkout, or tracking. Dealer access and approved terms are required for a later production integration.
