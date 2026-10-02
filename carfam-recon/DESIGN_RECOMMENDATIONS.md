# Carfam redesign direction

These are recommendations, not claims about an implemented replacement.

## Recommended concept: Southern California Road Club

Retain the distinctive cyan/pink CarFam wordmark and approachable personality. Build a cinematic automotive interface around real inventory, with graphite framing and bright, spacious content surfaces. Carfam sells economy vehicles, family transport, work trucks, EVs, and premium models: the visual language must make all of them feel considered. Avoid a luxury-only promise.

Use cyan (#00aeef) for discovery and navigational accents, pink (#ef59a1) for the primary conversion action, white/off-white for readable vehicle and form content, and graphite (#161616 / #212121) for hero/footer framing. These accent values are observed in original CSS; new shades must be tested for contrast. Do not assume cyan or pink body text on white passes contrast requirements.

Typography: the original loads Open Sans and legacy icon fonts; replace icon-font glyphs with accessible SVG icons and use a strong contemporary sans-serif with a compact automotive display treatment. Use large editorial headlines, restrained uppercase labels, tabular prices, and readable 16px+ form text. Proposed spacing: 8px scale, 24–32px card gaps, 72–112px desktop section padding, 40–64px mobile section padding.

## Homepage

1. Compact contact strip, a readable wordmark, and a short main navigation.
2. Cinematic hero using a real dealership vehicle photo; editable HTML heading and primary Browse Inventory action. Keep one hero rather than forcing users to wait through a carousel. Supporting search supports make, body style, and budget.
3. Visual body-style strip using the captured cutout assets. Present Trucks prominently because the snapshot contains substantial pickup inventory.
4. Curated vehicles with consistent 4:3 image frames, mileage, year/make/model/trim, internet price, fees, and sale price. Do not show a fabricated monthly payment.
5. Side-by-side financing and sell-your-car panels with clear distinctions between dealer application and Capital One prequalification.
6. A short dealership story, delivery mention subject to confirmation, and authentic customer photography.
7. Contact/location card with hours, call, text, directions, and a consent-based map embed.
8. Footer resources, legal links, accessibility statement, and social links.

Remove the automatic appraisal popup from the demo. Its embedded geographic and contact information is inconsistent, and it interrupts the first shopping action. Keep its business offer in an ordinary section.

## Inventory

Use a three-column desktop grid and a one-column mobile grid. Desktop filters can be a left rail; mobile filters should be an accessible sheet with sticky Apply and Clear actions, a result count, and selected chips. Preserve all supported dimensions: body, year, make, model, price, exterior/interior color, condition, drivetrain, estimated range, fuel, highway MPG, transmission, mileage. Feature filtering is a possible enhancement, not verified as a main-site filter; it exists on AutoDriven.

Search and sort must operate on the complete local snapshot. Persist filter state in the demo URL; route aliases must continue to work. Show a genuine no-results state that offers Find My Car. Prefer explicit pagination or Load More with visible counts to an opaque infinite feed. Saves and comparisons can be local-only in the demo, with a clearly visible reset; production accounts require a separate implementation.

Vehicle cards: avoid the original large repeated location bar, heavy borders, noisy icon rails, and scattered hierarchy. Keep the actual pricing breakdown visible. Preserve watermarked images as originals; do not pretend clean originals exist. Use a consistent crop without cutting off the vehicle.

## Vehicle detail

A large gallery, a sticky desktop price/action panel, mileage/VIN/stock immediately available, concise highlights, scannable specs, packages, full description, history tools, and disclosures. Mobile needs a modest bottom action bar that does not cover forms or consent. Gallery keyboard controls, escape-to-close, swipe support, and an image count are required. Financial estimates should use explicit illustrative APR/down payment/term inputs, with a visible estimate label.

## Motion and performance

Use subtle opacity/translate reveals and 150–250ms hover transitions. Respect prefers-reduced-motion. Do not add continuous animated backgrounds, heavy WebGL, scroll hijacking, or autoplay audio. Eager-load only the hero/first vehicle image; lazy-load lower imagery and load lightbox originals on demand. Keep third-party scripts out of the private demo.

## Original-site findings

Desktop has a dense navigation, hidden overflow menu, white/light-grey body, pink CTA buttons, cyan rails, black footer, and photographic banner tiles. The hero has three images, including two with text baked into the bitmap. Initial popup covers the hero. VDP equipment is lengthy and uses icon-font symbols that appear as unrelated characters in accessibility text. Filter UI is initially collapsed even on desktop. Staff has only a placeholder portrait. Customer gallery is photos, not rated testimonials.

This is not a measured accessibility conformance audit. Keyboard, screen reader, contrast, and mobile checks remain required during the rebuild.
