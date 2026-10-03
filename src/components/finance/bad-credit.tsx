import Image from "next/image";
import Link from "next/link";
import { DEALER, formatPhone, telHref } from "@/lib/site";

const CREDIT_CONCERNS = [
  "Multiple credit report inquiries",
  "Bankruptcy filings",
  "Foreclosures",
  "High debt-to-income ratios",
  "Repossessions",
];
const SUPPORT = [
  {
    title: "Understand the credit review",
    body: "Ask how the lender reviews credit information and what authorization its application requires. This demo does not access your credit report.",
  },
  {
    title: "Find a vehicle that fits",
    body: "Compare used cars, SUVs and trucks, and review the complete listed sale price before exploring financing.",
    href: "/pre-owned-cars",
    label: "Shop used vehicles",
  },
  {
    title: "Explore a down payment",
    body: "Use the illustrative calculator to see how a down payment or trade-in could change the amount financed.",
    href: "#payment-calculator",
    label: "Estimate a payment",
  },
  {
    title: "Talk through the loan terms",
    body: "Ask our finance team about the provider process, then confirm the APR, term, total payments and fees with the actual lender.",
  },
];

/** Adapted from the owner's original-page screenshots; provider claims stay qualified. */
export function BadCredit() {
  return (
    <div className="space-y-12 sm:space-y-16">
      <Image
        unoptimized
        src="/brand/bad-credit-financing.jpg"
        alt="Bad credit — we can help."
        width={2377}
        height={773}
        sizes="(max-width: 1280px) 100vw, 1280px"
        className="h-auto w-full rounded-2xl"
      />
      <section className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-ink">
            Bad credit financing
          </p>
          <h2 className="font-display text-3xl sm:text-4xl">
            Contact Carfam near San Bernardino for auto loan assistance.
          </h2>
          <p className="leading-relaxed text-slate">
            Your credit can change over time. If you have questions about buying
            a used car after credit challenges, start a conversation with our{" "}
            <Link href="/finance-your-car" className="text-cyan-ink underline">
              finance department
            </Link>
            . Tell the team what you need from your next vehicle and ask about
            the financing process.
          </p>
          <p className="leading-relaxed text-slate">
            Shopping from Bloomington, San Bernardino, Riverside or Fontana?
            Visit Carfam in {DEALER.city} to discuss your next steps. Approval,
            rates and terms depend on the lender; nothing is guaranteed.
          </p>
          <p className="leading-relaxed text-slate">
            This demo does not collect credit information or submit an
            application. Share private financial details only through the actual
            provider’s authorized process.
          </p>
        </div>
        <aside className="rounded-2xl bg-mist p-6 sm:p-8" aria-label="Credit concerns">
          <h3 className="font-display text-2xl">Start where you are.</h3>
          <p className="mt-3 leading-relaxed text-slate">
            Ask the finance team about the application process if your credit
            history includes:
          </p>
          <ul className="mt-5 space-y-3">
            {CREDIT_CONCERNS.map((concern) => (
              <li key={concern} className="flex gap-3 text-slate">
                <span aria-hidden="true" className="font-bold text-cyan-ink">→</span>
                {concern}
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-slate">
            A conversation can clarify the next steps. It is not a promise of
            financing or a credit decision.
          </p>
        </aside>
      </section>
      <section>
        <h2 className="font-display text-3xl sm:text-4xl">
          Why visit Carfam for bad credit car loans?
        </h2>
        <p className="mt-5 max-w-3xl leading-relaxed text-slate">
          Come with your questions. Use the conversation to understand the
          process, explore vehicles and compare the numbers before making a
          decision.
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {SUPPORT.map((item, index) => (
            <div key={item.title} className="rounded-xl border border-line p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-ink">
                0{index + 1} / Your next step
              </p>
              <h3 className="font-display mt-4 text-2xl">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-slate">{item.body}</p>
              {item.href && (
                <Link href={item.href} className="mt-5 inline-flex min-h-11 items-center font-bold text-cyan-ink underline">
                  {item.label} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-line p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-ink">
          In person or online
        </p>
        <h2 className="font-display mt-3 text-3xl sm:text-4xl">
          Explore financing at the dealership or online.
        </h2>
        <div className="mt-7 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-xl">Visit our finance team.</h3>
            <p className="mt-3 leading-relaxed text-slate">
              Make your way over from Fontana or nearby to discuss used-car
              financing. Call first to ask your questions and plan your visit.
            </p>
            <p className="mt-4 text-sm font-semibold">
              {DEALER.street} · {DEALER.city}, {DEALER.region} {DEALER.postalCode}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={telHref(DEALER.salesPhone)} className="button">
                Call {formatPhone(DEALER.salesPhone)}
              </a>
              <a href={DEALER.directionsUrl} target="_blank" rel="noopener noreferrer" className="button-secondary">
                Get directions
              </a>
            </div>
          </div>
          <div className="rounded-xl bg-mist p-5 sm:p-6">
            <h3 className="font-display text-xl">Explore the online application steps.</h3>
            <p className="mt-3 leading-relaxed text-slate">
              Preview the dealer financing process in English or Spanish.
              The walkthrough explains the stages without requesting personal
              information. No application is sent and no credit check occurs.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/finance-your-car/pre-approved" className="button">
                English walkthrough →
              </Link>
              <Link href="/solicitar-financiacion" className="button-secondary" lang="es">
                En español
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
