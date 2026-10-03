import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readdirSync } from "node:fs";
import path from "node:path";
import { DemoForm } from "@/components/forms/demo-form";
import { FinanceCalculator } from "@/components/forms/finance-calculator";
import { getRepository } from "@/lib/data";
import { isShoppable } from "@/lib/inventory/search";
import { calculatorDisclosure, salePriceCents } from "@/lib/inventory/pricing";
import { GUIDES, PUBLIC_ROUTES, SITE_PAGES } from "@/lib/site-pages";
import {
  DEALER,
  HOURS_REVIEW_NOTE,
  SALES_HOURS,
  formatPhone,
  telHref,
} from "@/lib/site";
import { inventoryHref } from "@/lib/inventory/filters";

type Props = { params: Promise<{ path: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = `/${(await params).path.join("/")}`;
  const page = SITE_PAGES[route] ?? GUIDES.find((g) => g.path === route);
  return {
    title: page?.title ?? "Page not found",
    description: page?.intro,
    alternates: { canonical: route },
    robots: { index: false, follow: false },
  };
}
export default async function ContentPage({ params }: Props) {
  const route = `/${(await params).path.join("/")}`;
  const guide = GUIDES.find((g) => g.path === route);
  const page = SITE_PAGES[route] ?? guide;
  if (!page) notFound();
  const kind = "kind" in page ? page.kind : "guide";
  const calculatorVehicles = kind === "finance" ? (await getRepository().listVehicles()).filter(isShoppable).map((v) => ({ id: v.id, title: v.title, price: salePriceCents(v.pricing), disclosure: calculatorDisclosure(v.pricing) })) : [];
  return (
    <>
      <section className="on-dark bg-graphite py-14 text-paper sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Link href="/" className="text-sm text-fog hover:text-paper">
            Carfam / {kind === "guide" ? "Resources" : "Explore"}
          </Link>
          <p className="mt-8 text-sm font-bold uppercase tracking-widest text-cyan">
            Your road starts here
          </p>
          <h1 className="font-display mt-4 max-w-4xl text-4xl sm:text-6xl">
            {page.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fog">
            {page.intro}
          </p>
        </div>
      {kind === "finance" && <FinanceCalculator vehicles={calculatorVehicles} />}
    </section>
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {(kind === "contact" ||
          kind === "find-my-car" ||
          kind === "trade-appraisal") && (
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <DemoForm kind={kind} />
            <DealerPanel />
          </div>
        )}
        {(kind === "finance" ||
          kind === "provider" ||
          kind === "provider-es") && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-5">
              <h2 className="font-display text-2xl">
                {kind === "provider-es"
                  ? "Solo demostración"
                  : "Explore your next steps"}
              </h2>
              <p>
                Provider applications stay with the financing provider. This
                preview collects no date of birth, SSN, income, banking details
                or credit authorization.
              </p>
              <ol className="list-decimal space-y-3 pl-5">
                <li>
                  Choose a vehicle and review its complete listed sale price.
                </li>
                <li>Discuss your financing needs with the dealership.</li>
                <li>
                  Review eligibility, rates and terms with the actual provider.
                </li>
              </ol>
              <div className="rounded-xl bg-amber-bg p-5 text-amber">
                Integration unconfigured. No preapproval or lending decision is
                available. Later provider application steps were not inspected
                in the original audit.
              </div>
              <Link className="button-secondary" href="/contact-us">
                Ask a financing question
              </Link>
            </div>
            <div className="space-y-4">
              <Link className="page-card" href="/finance-your-car/pre-approved">
                <h2 className="font-display text-xl">
                  English application preview
                </h2>
                <p>RouteOne · Demo only</p>
              </Link>
              <Link className="page-card" href="/solicitar-financiacion">
                <h2 className="font-display text-xl">Solicitar financiación</h2>
                <p>RouteOne · Solo demostración</p>
              </Link>
              <Link
                className="page-card"
                href="/capital-one-pre-qualify-then-shop"
              >
                <h2 className="font-display text-xl">Capital One preview</h2>
                <p>Separate provider · Not connected</p>
              </Link>
            </div>
          </div>
        )}
        {kind === "about" && (
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-5 text-lg leading-relaxed">
              <h2 className="font-display text-3xl">A car for real life.</h2>
              <p>
                The captured Carfam site describes a local dealership focused on
                matching vehicles to everyday needs, budgets and Southern
                California journeys.
              </p>
              <p>
                Browse practical commuters, family SUVs, work trucks and more.
                Compare the details that matter to you, then start a
                conversation with the dealership.
              </p>
              <p className="rounded-lg bg-mist p-5 text-sm text-slate">
                Return-policy terms and delivery/inspection claims require
                dealer confirmation before production. This demo makes no
                unverified promise.
              </p>
              <Link className="button" href="/pre-owned-cars">
                Find your next vehicle
              </Link>
            </div>
            <DealerPanel />
          </div>
        )}
        {kind === "staff" && (
          <div className="page-card max-w-lg">
            <p className="text-sm text-slate">Captured staff listing</p>
            <h2 className="font-display mt-2 text-2xl">Magic Faouri</h2>
            <a
              className="mt-3 block text-cyan-ink underline"
              href="mailto:magic@carfam.com"
            >
              magic@carfam.com
            </a>
            <p className="mt-4 text-slate">
              Role, biography and a verified staff photograph were not provided.
              Additional team information is pending dealer approval.
            </p>
          </div>
        )}
        {kind === "customers" && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {readdirSync(path.join(process.cwd(), "public/customers"))
              .filter((f) => /\.(webp|jpg|png)$/.test(f))
              .map((file, i) => (
                <div
                  key={file}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg bg-mist"
                >
                  <Image
                    src={`/customers/${file}`}
                    alt={`Customer photograph from the captured Carfam gallery ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              ))}
          </div>
        )}
        {(kind === "resources" || kind === "sitemap") && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kind === "resources"
              ? GUIDES.map((g) => (
                  <Link key={g.path} href={g.path} className="page-card">
                    <p className="text-sm font-bold text-cyan-ink">
                      Buying guide
                    </p>
                    <h2 className="font-display mt-3 text-xl">{g.title}</h2>
                    <p className="mt-3 text-slate">{g.intro}</p>
                  </Link>
                ))
              : PUBLIC_ROUTES.map((href) => (
                  <Link key={href} href={href} className="page-card">
                    {SITE_PAGES[href]?.title ??
                      GUIDES.find((g) => g.path === href)?.title ??
                      (href === "/" ? "Home" : href)}
                  </Link>
                ))}
          </div>
        )}
        {guide && (
          <article className="mx-auto max-w-3xl space-y-8 text-lg leading-relaxed">
            <p className="text-sm font-semibold text-slate">
              Adapted from captured dealer content · Demo reference, not a
              current availability or specifications claim.
            </p>
            {guide.sections.map((section, i) => (
              <section key={section}>
                <h2 className="font-display mb-3 text-2xl">
                  {
                    [
                      "Start with your needs",
                      "Compare the details",
                      "Take the next step",
                    ][i]
                  }
                </h2>
                <p>{section}</p>
              </section>
            ))}
            <Link
              className="button"
              href={inventoryHref(guide.body ? { body: [guide.body] } : {})}
            >
              Browse matching inventory
            </Link>
            <Link className="ml-4 inline-block underline" href="/resources">
              All guides
            </Link>
          </article>
        )}
        {(kind === "community" ||
          kind === "careers" ||
          kind === "accessibility") && (
          <div className="max-w-3xl space-y-5">
            <p>
              {kind === "community"
                ? "Historic CHOC and charity references are recorded in the audit. They are not presented as current affiliations or endorsements."
                : kind === "careers"
                  ? "Use the demo contact form to explore how a careers inquiry would reach the dealership. Resume uploads and email delivery are disabled."
                  : "If you encounter a barrier, use the demo contact form to describe the page and issue. Keyboard navigation, readable contrast and reduced-motion support are part of this rebuild, but are not a legal compliance certification."}
            </p>
            <Link className="button" href="/contact-us">
              Contact the dealership
            </Link>
          </div>
        )}
        {kind === "privacy" && (
          <div className="max-w-3xl space-y-5">
            <h2 className="font-display text-2xl">
              Private demo data handling
            </h2>
            <p>
              Form requests are stored in a server-side JSON file for
              demonstration. Appraisal photos remain browser previews; only
              their count is saved. Saved vehicles and comparisons use this
              browser’s local storage.
            </p>
            <p>
              No production analytics, credit providers or messaging services
              are enabled. The demo admin has a role switcher, not
              authentication. Do not put real customer information here; use
              hosting-level protection for any shared preview.
            </p>
            <p>
              Production privacy notices, retention periods, consent and request
              handling need dealer/legal approval. The original dealership
              policy is reference material in the audit, not a claim that this
              demo implements every original practice.
            </p>
          </div>
        )}
        {kind === "account" && (
          <Link className="button" href="/saved">
            View saved vehicles
          </Link>
        )}
        {kind === "news" && (
          <a
            className="button"
            href="https://www.edmunds.com/car-news/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Edmunds news ↗
          </a>
        )}
      </section>
    </>
  );
}
function DealerPanel() {
  return (
    <aside className="rounded-xl bg-mist p-6 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-cyan-ink">
        Visit Carfam
      </p>
      <h2 className="font-display mt-4 text-2xl">Rialto, California</h2>
      <address className="mt-5 not-italic">
        {DEALER.street}
        <br />
        {DEALER.city}, {DEALER.region} {DEALER.postalCode}
      </address>
      <a className="mt-4 block font-bold" href={telHref(DEALER.salesPhone)}>
        {formatPhone(DEALER.salesPhone)}
      </a>
      <p className="mt-2">{DEALER.email}</p>
      <dl className="mt-6 space-y-3">
        {SALES_HOURS.map((h) => (
          <div key={h.days}>
            <dt className="font-semibold">{h.days}</dt>
            <dd>{h.hours}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate">{HOURS_REVIEW_NOTE}</p>
      <a
        className="button-secondary mt-6"
        href={DEALER.directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Get directions ↗
      </a>
    </aside>
  );
}
