# About Carfam reference pages

Rebuilds the About category with dealership, contact, staff, community outreach, careers, accessibility assistance, and privacy pages. Desktop and mobile navigation use the existing native branch menu. Existing paths are retained.

Reference content comes from the supplied dealership/contact/community/careers screenshots and Privacy Policy - CARFAM.pdf. The PDF is copied byte for byte to public/policies/carfam-privacy-policy.pdf; its policy body is also rendered with a contents sidebar. Original brand assets are reused.

Careers is informational only: no application, resume upload, job postings or invented staff biographies. Contact retains the existing validated demo lead form and Subject selector; no email is transmitted. Hosted read-only mode may prevent saving requests, which must remain explicit rather than pretending a real message was sent.

The ADA route on the original site redirects to privacy. No approved ADA policy was supplied. The new page offers accessibility contact information and explicitly marks the statement as outstanding; it does not invent a compliance certification. The disputed return-policy mileage is omitted. Community copy distinguishes historic 2017–2018 recognition and original outreach references from current arrangements.

Validation: npm run typecheck, npm run lint, npm test (200 tests, 18 files), npm run build all pass. Six new page tests verify route highlighting, contact fields, careers without a form, outreach assets, ADA/privacy separation, complete privacy text, and the PDF SHA-256.

Live verification: Vercel deployment of commit 7caaa5bb6e7606d089c95ac908a14e5c60acd1e0 is READY. All seven About routes were visited through the page tabs. The About dropdown opens and Escape closes it; route changes close the menu. Careers has zero forms. All four community images loaded. Privacy includes Disclosure of Data and Sale Notice, the contents anchor changes the URL, and the hosted PDF returns HTTP 200/application/pdf with the exact supplied SHA-256. ADA remains a distinct assistance page pending approved wording. A synthetic contact submission correctly reports hosted read-only storage rather than claiming success. Local HTTP verification saves a contact request and finds it in the manager inbox. All 54 HTTP checks passed. Screenshot: screenshots/carfam-about-verified.jpg.
