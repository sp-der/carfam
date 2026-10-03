# About Carfam reference pages

Rebuilds the About category with dealership, contact, staff, community outreach, careers, accessibility assistance, and privacy pages. Desktop and mobile navigation use the existing native branch menu. Existing paths are retained.

Reference content comes from the supplied dealership/contact/community/careers screenshots and Privacy Policy - CARFAM.pdf. The PDF is copied byte for byte to public/policies/carfam-privacy-policy.pdf; its policy body is also rendered with a contents sidebar. Original brand assets are reused.

Careers is informational only: no application, resume upload, job postings or invented staff biographies. Contact retains the existing validated demo lead form and Subject selector; no email is transmitted. Hosted read-only mode may prevent saving requests, which must remain explicit rather than pretending a real message was sent.

The ADA route on the original site redirects to privacy. No approved ADA policy was supplied. The new page offers accessibility contact information and explicitly marks the statement as outstanding; it does not invent a compliance certification. The disputed return-policy mileage is omitted. Community copy distinguishes historic 2017–2018 recognition and original outreach references from current arrangements.

Validation: npm run typecheck, npm run lint, npm test (200 tests, 18 files), npm run build all pass. Six new page tests verify route highlighting, contact fields, careers without a form, outreach assets, ADA/privacy separation, complete privacy text, and the PDF SHA-256.
