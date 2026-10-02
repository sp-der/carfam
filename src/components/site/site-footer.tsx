import Image from "next/image";
import Link from "next/link";
import { inventoryHref } from "@/lib/inventory/filters";
import { DEALER, formatPhone, HOURS_REVIEW_NOTE, SALES_HOURS, SNAPSHOT_NOTICE, telHref } from "@/lib/site";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Shop",
    links: [
      { label: "All inventory", href: inventoryHref({}) },
      { label: "SUVs", href: inventoryHref({ body: ["suv"] }) },
      { label: "Trucks", href: inventoryHref({ body: ["pickup"] }) },
      { label: "Sedans", href: inventoryHref({ body: ["sedan"] }) },
      { label: "EVs and hybrids", href: inventoryHref({ fuel: ["electric", "hybrid", "plug-in-hybrid"] }) },
      { label: "Under $15,000", href: inventoryHref({ priceMax: 15000 }) },
      { label: "Saved vehicles", href: "/saved" },
      { label: "Compare", href: "/compare" },
    ],
  },
  {
    // The original "Research" menu linked these makes to inventory filters; they are not articles.
    heading: "Shop by make",
    links: ["BMW", "Jeep", "Lexus", "Nissan", "Toyota"].map((make) => ({
      label: make,
      href: `/pre-owned-cars/${make.toLowerCase()}`,
    })),
  },
  {
    heading: "Buy and sell",
    links: [
      { label: "Finance your car", href: "/finance-your-car" },
      { label: "Solicitar financiación", href: "/solicitar-financiacion" },
      { label: "Capital One pre-qualify", href: "/capital-one-pre-qualify-then-shop" },
      { label: "Sell your car", href: "/sell-my-car" },
      { label: "Find my car", href: "/find-my-car" },
      { label: "Resources", href: "/resources" },
    ],
  },
  {
    heading: "Dealership",
    links: [
      { label: "About us", href: "/about-us" },
      { label: "Our customers", href: "/customer-gallery-at-carfam" },
      { label: "Meet our team", href: "/meet-our-team" },
      { label: "Community", href: "/used-car-dealer-serving-the-community-in-rialto" },
      { label: "Careers", href: "/careers" },
      { label: "Contact us", href: "/contact-us" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="on-dark mt-auto bg-graphite text-fog">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Image src="/brand/carfam-logo.png" alt="Carfam" width={351} height={66} className="h-auto w-40" />
            <address className="mt-6 space-y-1 text-sm not-italic leading-relaxed">
              <p className="text-paper">
                {DEALER.street}
                <br />
                {DEALER.city}, {DEALER.region} {DEALER.postalCode}
              </p>
              <p>
                Sales{" "}
                <a className="text-paper underline-offset-4 hover:underline" href={telHref(DEALER.salesPhone)}>
                  {formatPhone(DEALER.salesPhone)}
                </a>
              </p>
              <p>
                <a className="text-paper underline-offset-4 hover:underline" href={`mailto:${DEALER.email}`}>
                  {DEALER.email}
                </a>
              </p>
            </address>
            <dl className="mt-5 grid max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {SALES_HOURS.map((h) => (
                <div key={h.days} className="contents">
                  <dt>{h.days}</dt>
                  <dd className="tabular text-paper">{h.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs">{HOURS_REVIEW_NOTE}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h2 className="text-sm font-bold text-paper">{col.heading}</h2>
                <ul className="mt-3 space-y-0.5 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="inline-flex min-h-9 items-center hover:text-paper">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-graphite-3 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li>
              <Link href="/privacy-policy" className="hover:text-paper">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/privacy-rights" className="hover:text-paper">
                Privacy rights
              </Link>
            </li>
            <li>
              <Link href="/ada-policy-statement" className="hover:text-paper">
                Accessibility statement
              </Link>
            </li>
            {DEALER.social.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-paper">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="max-w-md sm:text-right">
            Private demo of a redesigned Carfam site. {SNAPSHOT_NOTICE} Demo forms send nothing.
          </p>
        </div>
      </div>
    </footer>
  );
}
