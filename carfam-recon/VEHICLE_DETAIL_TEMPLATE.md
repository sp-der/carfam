# Vehicle detail reconstruction specification

## Evidence

The public vehicle HTML is captured for every inspected VDP in `data/routes.json`; the extracted vehicle records are in `data/inventory.json`. Browser references include Acura RDX, Tesla Model X, GMC Sierra 1500, and Lexus RC 350. Vehicle-specific records may omit components when data is absent.

## Observed original architecture

- In-page navigation: Overview, History, Features, Description, Financing, Specs, Similar. A Similar tab is present in source; its populated recommendations are not assumed.
- H1 year/make/model/trim, followed by a vehicle tagline. A tagline can be a paint color or an option package and is not necessarily the trim.
- Gallery: main image, carousel arrows, Photos count, and exterior/media pane. Acura has 29 observed photo URLs.
- History & Pricing Tools: CARFAX, Capital One prequalification, and Monroney window sticker when available.
- Standard features: exterior/interior color, drivetrain, engine, horsepower, torque, transmission, style.
- Optional Highlights and Included Packages & Options; option name, original MSRP, total added value. Do not equate original option MSRP with present vehicle value.
- Vehicle description, often several paragraphs.
- Estimated Payment Calculator: loan amount, estimated payment, credit-score APR presets, term choices, down payment, trade value, Contact Dealer and Get Approved links.
- Specifications tabs: Exterior, Interior, Safety, with multiple rows of equipment. Keep the full data available in an expandable presentation.
- Disclaimer and dealer location/contact information.
- Floating Shopping Tools panel: save, share, Schedule a Test Drive, Ask a Question, Text Link to Phone, Get Approved, Get Our Best Price.
- Sidebar price: internet price, doc fee, smog fee, sale price. Mileage, highway/city MPG, stock number, VIN follow.

## Vehicle model

Use `id` as the stable demo key and `vin` as a displayed identifier. The dataset contains title, year, make, model, trim, stock_number, vin, mileage, exterior/interior colors, internet_price, doc_fee, smog_fee, sale_price, currency, MPG, drivetrain, transmission, engine, horsepower, torque, style, description, packages text, grouped equipment, image_urls, history/sticker URLs, snapshot timestamp, and source references. `null` means unavailable. Do not derive fuel or body style from a guess; use confirmed category membership or explicit vehicle data. Image URL lists preserve original source files without resize/recompression query strings.

Cards and VDPs must use a single pricing function. For observed records, the advertised sale price includes the listed doc/smog fees; it is not a complete out-the-door quote. Additional taxes/registration/finance charges may apply. Do not silently replace the captured disclaimer with a legal conclusion.

## Inquiry forms observed

| Form | Inputs | Original action |
| --- | --- | --- |
| Schedule a Test Drive | First name, last name, phone, email | `/ContactUs/Submit` |
| Get Our Best Price | First name, last name, phone, email | `/ContactUs/Submit` |
| Ask a Question | First name, last name, phone, email, subject, comments | `/ContactUs/Submit` |
| Text Link to Phone | Name and mobile number | `/Widget/SaveToPhone` |

The original schedule form does not visibly ask for appointment date/time. Adding that is a recommendation and must not imply a confirmed appointment without dealer scheduling integration. Original forms include vehicle context as hidden fields; use the displayed vehicle id/title in the demo state instead of copying antiforgery tokens.

All demo forms remain local and explicitly show “Demo only—nothing was sent.” Do not submit requests to the original endpoints. Do not embed live credit applications or activate texting.

## Calculator

Observed APR presets: 20.90%, 18.90%, 11.90%, 5.90%, 4.90%; terms: 24, 36, 48, 60, 72 months. These are original display values, not current lender offers. For the rebuilt demo allow user-selected illustrative APR, never label it a quote or guarantee. Monthly amortization should handle zero APR, invalid values, down payment exceeding price, and zero principal. Default values must be visibly identified as illustrative.

## Recommended component boundaries

`VehicleHero`, `PhotoGallery`, `VehiclePriceBreakdown`, `ShoppingActions`, `VehicleFacts`, `HistoryTools`, `VehicleHighlights`, `OptionPackages`, `PaymentEstimator`, `EquipmentTabs`, `VehicleInquiryModal`, `DealerLocation`, `SimilarVehicles`, `VehicleDisclosures`.

## Data-quality examples

Acura RDX includes the same Majestic Black Pearl $400 package twice, totaling $800; flag for dealer review rather than silently asserting both are legitimate distinct options. CARFAX last reported mileage and current listing mileage can differ; retain their source labels. Do not fabricate a warranty, inspection certificate, accident history, available appointment, or lender approval.
