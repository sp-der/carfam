# Carfam public-site reconstruction audit

Captured October 2, 2026 UTC. See `data/crawl_summary.json` for exact start/end timestamps and `data/coverage.json` for verified final counts. This package is for a private redesign demo, not a migration of authenticated dealer systems.

## Method and coverage

Discovery used the homepage, navigation, footer, robots.txt, XML sitemap, contextual article links, public account links, visual sitemap, manufacturer/year/model categories, and vehicle links. All discovered safe internal page URLs were requested in a bounded public GET crawl. Form submission/save/compare actions were excluded from the crawl, and no consumer identity was entered. Query grids and guessed endpoints were not probed. `/inventory` was explicitly requested by the brief and resolves to the same inventory function as the primary `/pre-owned-cars` route.

There are 431 discovered/requested URLs, including aliases and filtered pages. HTTP 200 source capture is not the same as full interactive testing. Source extraction covers 429 successful responses. Two unavailable routes are listed below. `ROUTE_INDEX.md` is a human-readable index; `data/routes.json` is the detailed ledger with per-page headings, metadata, CTAs, forms, links, assets, scripts, frames, timestamps, final URLs, and evidence paths. Canonical grouping is separate so filtered aliases are not misrepresented as unique editorial pages.

The sitemap initially listed 404 URLs: 127 VDPs, 252 inventory-category URLs, and 25 other pages. Link traversal added 27 routes, including legacy contact/search aliases, password recovery, visual sitemap, filter combinations, and an additional vehicle. One initial VDP returned Gone; 127 accessible vehicle records were ultimately captured.

## Existing navigation

Inventory: Pre-Owned Vehicles, Vehicles Under 15K, Find My Car. Finance: Finance Department, Apply For Financing, Solicitar Financiación, Capital One, Bad Credit Financing. Direct Sell My Car. About: About, Contact, Staff, Community, Careers, ADA. Research: seven editorial articles plus five “Best Used [Make]” links which are inventory make filters. Our Customers is direct. Shop From Home appears in overflow and goes to AutoDriven. Account sign-in/register controls are present in source. Footer has brand shortcuts, location, sales phone, social links, careers, privacy policy, privacy rights, disclaimer, and DealerSync credit.

`data/navigation.json` preserves labels and destinations. Header search targets inventory. SMS text link uses a separate number. Google Translate appears after loading. DealerSync accessibility menu floats on the page.

## Homepage exact reconstruction map

| Order | Original component | Text/behavior | Asset / destination |
| --- | --- | --- | --- |
| 1 | Utility contact strip | Sales phone, address; hours/contact panels in source; loaded language selector | tel and Google directions links |
| 2 | Header | CarFam wordmark, desktop nav, search, overflow menu | logo and original nav data |
| 3 | Three-image hero | Plain woman/dog in car photo; “Welcome to CarFAM” bitmap; “We Buy Your Car Even If You Don’t Buy Ours” bitmap | all three originals in assets/homepage |
| 4 | Body-type browse | Quality Used Cars For Sale, welcome paragraph, six cutout vehicle choices | Sedan, Coupe, SUV, Pickup, Hatchback, Passenger-Van filters |
| 5 | Four photographic CTA tiles | Quality Used Cars / Financing / Online Appraisal / Meet Our Sales Team | inventory, English application, sell, staff |
| 6 | Wide shopping section | Shop CarFam Online paragraph and View Inventory CTA | background photography and inventory link |
| 7 | Dealer intro | H1 Used Cars In Rialto, CA, two-paragraph introduction, Read About Us | about link |
| 8 | Visit/location card | Address, sales phone, Mon–Sat/Sun hours, map | location data and map iframe |
| 9 | Footer | Brand Index, Locate Us, Follow Us, Dealer Info, legal/disclaimer/DealerSync | original links |
| Floating | Accessibility / Text Us / appraisal popup | Initial appraisal offer popup links Contact Us; has inconsistent embedded address/phone | captured popup image and initial screenshot |

The homepage H1 appears below several earlier H2/H3 sections. The hero captions are partly baked into images and the plain first slide is only a photo. Preserve the original files but use editable semantic text in the redesign. Full-page initial capture includes the popup and some unloaded lazy imagery; the clean viewport screenshot provides an additional reference and are not claims that all initial blank areas are site failures.

## Inventory system

The primary inventory initially displayed 127 vehicles and 15 cards. Load More progressively adds cards rather than presenting numbered pagination. List and multi-column grid controls are available. Filter pane begins collapsed even on the desktop reference. Body/year/make/model/price/exterior color are primary; condition/drivetrain/estimated range/fuel/highway MPG/interior color/transmission/mileage are advanced. Original sort values are stored exactly in `data/inventory_filters.json`.

Budget/body routes can become query strings after redirect (for example the supplied Under 15K link becomes `?pricerange=0-15000`); source category aliases include `/pre-owned-cars/{make}`, year/make/model paths, and `/filter/...` combinations. The route ledger records observed final URLs. Do not treat those as independent inventories.

Cards include title/tagline, stock, photo, internet price, $85 doc fee, $50 smog fee, sale price, mileage, selected feature icons, CARFAX, like/save, compare, top features, and repeated address bars. VIN exists in public card microdata and VDP. Logged-out save actions prompt account login. Feature display varies by vehicle and may show equipment instead of drivetrain/fuel. `inventory.json` was assembled from accessible detail pages and category evidence, not five manually chosen cars.

The 127 vehicle records have source timestamps, pricing, VIN/stock/mileage, specs, full description, equipment, packages, and gallery references where available. Some vehicles use Coming Soon imagery; placeholder information must be labeled. Photo library URLs are preserved while selected vehicle galleries are downloaded. This is not a live feed, and the external AutoDriven inventory rendered 128 vehicles during inspection.

## Vehicle detail

See `VEHICLE_DETAIL_TEMPLATE.md`. Browser checks covered Acura RDX (SUV), Tesla Model X (EV), GMC Sierra (pickup), and Lexus RC (coupe); captured HTML covers all accessible VDPs. The original has gallery/history/facts/packages/description/calculator/equipment/disclosures and a floating action panel. Modal fields exist in source and the test-drive modal was inspected without submission. No guarantee of email or CRM delivery is asserted. Similar tab exists but a populated similar-vehicle service is not verified. Warranty details are not invented.

## Financing and appraisal

RouteOne English and Spanish applications loaded. Only initial personal-information fields and five progression labels are verified; later steps require identity/income data and were not advanced. Capital One initial form loaded, including consent and provider/dealer help information. The finance landing page has an illustrative calculator. Bad-credit and financing metadata claims require dealer review.

Appraisal is a three-step DealerSync wizard plus review. VIN → plate/state → manual year/make/model/style branches are present. Mileage, condition definitions, upload controls, contact information, comments, review, and success/error panels are visible in source. Only the initial no-VIN branch was interacted with. No VIN/plate lookup, upload, offer calculation, or submission was performed. Source success panels are documented as source, not as experienced outcomes.

## Dealership/company content

About contains a dealership story, local-area copy, inspection/delivery claims, and a disputed return policy. Contact has a department dropdown and generic introductory language. Staff contains only Magic Faouri with blank role and Coming Soon image. Careers directs to Contact; no distinct job application/upload was observed. Community page mentions CHOC and Wheels for Wishes and cites dated 2017/2018 recognition—reconfirm partnerships and rewrite dated claims. ADA metadata is mislabeled. Privacy Policy and California Privacy Rights are captured for review, not legal approval.

## Customers and resources

Our Customers is a dealer-hosted customer photo gallery. Photos have sparse/empty alt text and no extracted verified ratings or quoted reviews. The original claim about a no-questions-asked return policy conflicts with About. Customer photos are downloaded as private references; commercial reuse permission is unverified.

Seven editorial research pages are captured in `research_pages.json`: buying warning signs, best used cars, coupes, SUVs, trucks, EV home charging, and the local used-car dealership guide. Manufacturer “Best Used” links are filters. `/news` contains five outbound Edmunds headlines, not Carfam-owned full articles. Older SUV specifications and grammar need review; newer EV and local-buyer topics give a useful Resources structure. Article metadata, headings, images, links/CTAs, structured data, and source text paths are recorded. No publication date is invented.

## Unavailable pages and browser limits

- `/pre-owned-exotic-cars`: HTTP 404; discovered contextual link, not an invented category.
- `/pre-owned-cars/detail/2022-Kia-Forte/1505080`: HTTP 410 Gone.
- Maps: cloud-browser organization policy blocked embed viewing; source/map URLs still captured.
- Mobile: no actual narrow-viewport screenshots or visual audit. Source responsive rules were inspected; see `MOBILE_AUDIT.md`.
- Credit/appraisal later steps and final confirmation: not traversed with applicant data.
- Private inventory API, CRM recipients, licensed provider credentials, valuation engine, production form delivery, and authenticated accounts: unknown and outside this audit.

## Priorities

1. Make vehicle search, pricing, gallery, and inquiry actions immediately clear.
2. Resolve policy/phone/hours and technical-content conflicts before production.
3. Preserve legacy route entry points with cleaner navigation and data-driven inventory.
4. Use authentic imagery and customer photography; never create false social proof.
5. Finish mobile/keyboard verification during demo implementation.
6. Keep finance/CRM/texting/checkout behind disabled demo boundaries until dealer-approved integration work.
