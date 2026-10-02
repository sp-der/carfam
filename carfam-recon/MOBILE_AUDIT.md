# Mobile audit status

Actual narrow-viewport rendering and screenshots were not completed. The available cloud browser has a roughly 1348px document viewport and exposes no supported viewport resizing/emulation API; responsive keyboard shortcuts did not change document width. The `screenshots/mobile` folder deliberately contains no fabricated or cropped “mobile” screenshots.

Source inspection verifies that the original includes mobile-specific navigation/logo rules at the 767.98px breakpoint, separate contact/dealer-information panels, mobile search, a My Account route, responsive inventory images, and `.sms` controls. Those facts describe implementation in source, not tested usability. Overflow, touch target size, sticky behavior, and iframe form fit remain unverified.

## Required follow-up in Claude's browser during the build

Test homepage, inventory, a VDP, finance landing/application placeholder, contact, Find My Car, and appraisal at 375, 390, and 430px. Save real screenshots and record the actual viewport width. Test:

- menu open/close, focus trap/return, Escape, and long research menus;
- search and filters including result counts, applied chips, clear/reset, and zero results;
- one-column cards, image aspect ratios, pricing wrapping, and long model names;
- gallery swipe, keyboard fallback, thumbnail fit, and sticky CTA safe areas;
- input labels, validation, autofill, numeric keyboards, and consent readability;
- appraisal VIN/plate/manual branching and review state;
- no horizontal page overflow, readable 16px form input text, 44px touch targets;
- reduced motion, zoom to 200%, screen-reader order, and sticky controls that never cover content.

This remaining visual audit does not prevent building a private demo from the captured data, but it prevents calling the original-site audit fully complete.
