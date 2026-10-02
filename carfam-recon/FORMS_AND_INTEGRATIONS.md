# Forms and conversion paths

No production submissions were made. `data/forms.json` stores extracted HTML inputs, labels, options, required attributes, validation hints, methods/actions, consent text, and source pages. Repeated VDP form definitions are grouped with all pages where they appeared. This is an input specification, not proof that email, CRM, or SMS delivery works.

## Contact

First/last name, email, phone, Subject (Donation Opportunities, Finance Department, Sales Department, Schedule a Test Drive), message. CTA: Send Message. Observed action `/ContactUs/Submit`. JS may add requiredness beyond the recorded HTML. Improve copy to dealership-specific language and preserve department routing.

## Find My Car

First/last name, email, phone; Year/Make/Model selectors; min/max price inputs and range slider; special requests. CTA: Submit Request. Action `/FindMyCar/Submit`. Source validation hints make year/make/model and price bounds required. Dependent selector APIs are not a licensed inventory feed. A demo can populate selectors from local data and allow a free-text desired vehicle when nothing matches.

## Appraisal

DealerSync hosts the original `/sell-my-car` flow, not a verified independent valuation API. Step 1 asks whether the shopper knows VIN; otherwise asks about plate and state; otherwise allows year/make/model/style. Confirmation fields include style, mileage, and condition (Fair, Good, Very Good, Excellent), with definitions. Step 2 contains vehicle photo/media upload controls in source. Step 3 asks first name, last name, email, mobile/primary phone, ZIP. Review shows vehicle/contact details and additional comments. Submit Request posts to `/sell-my-car/save`. Source includes success, saving, validation-error, and retry panels; these were not triggered by a real submission. The exact valuation calculation/provider behind the lookup is unknown. Do not promise an instant binding offer.

## Finance

Finance Department is a content/calculator landing page. English credit application embeds RouteOne at `https://www.routeone.net/digital-retail-ui/?dealerId=SJ8MW&locale=en_US`; Spanish embeds the same dealer with `locale=es_MX`.

Observed RouteOne progression: Personal Info → Address Info → Income Info → Vehicle Info → Review. Only the initial step was inspected: required first name, last name, email, home phone, date of birth; optional cellular phone and salesperson; Add Reference; Add Co-Applicant; individual-credit statement; state-specific California privacy notice and RouteOne privacy links. Later-step fields and final credit authorization were not entered or assumed.

Capital One prequalification is a separate embedded provider experience. The rendered initial screen asks first/last name, email, confirm email, phone, optional co-applicant. It has sign-in/application-lookup options and disabled Agree & Continue before data is entered. Its consent covers sharing supplied data with Capital One/dealers/connected parties and communications, electronic disclosures, and privacy policies. Do not copy the site's public client token into a new project or imply a real lender connection.

Demo finance pages should preserve the educational intent, language choice, and provider identity as integration notes. Show a local provider placeholder and an illustrative calculator. Do not collect SSNs, DOB, income, or identity documents for a presentation demo.

## VDP inquiries

Schedule Test Drive / Best Price: first name, last name, phone, email. Ask Question adds subject/message. Text Link to Phone asks name and phone and has its own `/Widget/SaveToPhone` action. All need vehicle context. See `VEHICLE_DETAIL_TEMPLATE.md`.

## Other conversions

- Staff: Magic Faouri email link, with source modal markup to inspect; no role or bio asserted.
- Careers: public content/CTA; inspect its captured page before assuming a resume-upload form exists.
- Text Us: native `sms:9092517182` link, distinct from main sales phone.
- Saves/account: `/account/login`, possible linked registration/recovery pages in route inventory. Public interfaces only; no sign-in attempted.
- Search: repeated header/mobile GET search forms are recorded in individual route data, excluded from lead-form count.
- Calculator: local calculation, not a lead submission; retained separately in form definitions with its purpose labeled.
- Accessibility menu: DealerSync-provided controls, not a substitute for accessible implementation.

## Consent

Dealer forms state that providing contact details authorizes dealer/agent communication; phone may receive calls/texts including automation; standard rates may apply; opt-out is available; consent is not a purchase condition. Preserve the captured text as reference and require dealer/legal approval for production. Do not casually reuse Capital One or RouteOne authorizations for a local dealer contact form.

## Demo behavior

Every submission is prevented locally, validates inputs, and displays “Demo only—nothing was sent.” No remote POST, live credit embed, appraisal submission, texting, real account registration, resume delivery, or email is activated. Production requires dealer-approved endpoint contracts, recipients, spam controls, privacy retention, consent, and integration credentials. Server-side validation and rate limiting belong to that later phase.
