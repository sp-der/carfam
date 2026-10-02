import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { DocIcon, ExternalIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { CompareButton, SaveButton } from "@/components/shopping/shopping-buttons";
import { EquipmentTabs } from "@/components/vehicle-detail/equipment-tabs";
import { InquiryButton, InquiryProvider } from "@/components/vehicle-detail/inquiry";
import { PaymentEstimator } from "@/components/vehicle-detail/payment-estimator";
import { PhotoGallery } from "@/components/vehicle-detail/photo-gallery";
import { ShareButton } from "@/components/vehicle-detail/share-button";
import { formatMiles, VehicleCard } from "@/components/vehicles/vehicle-card";
import { getRepository } from "@/lib/data";
import { inventoryHref } from "@/lib/inventory/filters";
import {
  calculatorDisclosure,
  formatPrice,
  priceBreakdown,
  SALE_PRICE_NOTE,
} from "@/lib/inventory/pricing";
import { publicPackages, toVehicleCard, vehicleSpecs } from "@/lib/inventory/public";
import {
  DRIVETRAIN_LABELS,
  TRANSMISSION_LABELS,
  vehicleDetailPath,
  vehicleRouteId,
  type Vehicle,
} from "@/lib/inventory/types";
import { resolvePublicVehicle } from "@/lib/services/inventory-service";
import {
  DEALER,
  formatPhone,
  HOURS_REVIEW_NOTE,
  SALES_HOURS,
  SNAPSHOT_DATE_LABEL,
  SNAPSHOT_NOTICE,
  telHref,
} from "@/lib/site";
import { UnavailableVehicle } from "./unavailable";

export const dynamic = "force-dynamic";

type Props = PageProps<"/pre-owned-cars/detail/[slug]/[id]">;

const load = cache(async (slug: string, id: string) =>
  resolvePublicVehicle(getRepository(), decodeURIComponent(slug), decodeURIComponent(id)),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const { route } = await load(slug, id);
  if (route.kind === "ok") {
    const v = route.vehicle;
    const sale = formatPrice(priceBreakdown(v.pricing).salePriceCents);
    return {
      title: `${v.title} for ${sale}`,
      description: `${v.title}, ${formatMiles(v.mileage)}, sale price ${sale} including doc and smog fees. Carfam, Rialto, CA. ${SNAPSHOT_NOTICE}`,
      alternates: { canonical: vehicleDetailPath(v) },
    };
  }
  if (route.kind === "unavailable") return { title: "Vehicle no longer available" };
  return {};
}

/** Vehicle + Offer structured data from actual stored values only. */
function jsonLd(v: Vehicle, salePriceCents: number) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: v.title,
    vehicleIdentificationNumber: v.vin,
    sku: v.stockNumber,
    brand: { "@type": "Brand", name: v.make },
    model: v.model,
    vehicleModelDate: String(v.year),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: v.mileage, unitCode: "SMI" },
    ...(v.exteriorColor ? { color: v.exteriorColor } : {}),
    ...(v.images[0] ? { image: v.images.map((i) => i.src) } : {}),
    offers: {
      "@type": "Offer",
      price: (salePriceCents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: v.status === "pending" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
      seller: { "@type": "AutoDealer", name: DEALER.legalName },
    },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "description", label: "Description" },
  { id: "history", label: "History" },
  { id: "payments", label: "Payments" },
  { id: "specs", label: "Specs" },
  { id: "similar", label: "Similar" },
] as const;

export default async function VehicleDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const { route, similar } = await load(slug, id);
  if (route.kind === "redirect") permanentRedirect(route.location);
  if (route.kind === "not-found") notFound();
  if (route.kind === "unavailable") {
    return <UnavailableVehicle vehicle={route.vehicle} similar={similar.map(toVehicleCard)} />;
  }

  const v = route.vehicle;
  const routeId = vehicleRouteId(v);
  const path = vehicleDetailPath(v);
  const breakdown = priceBreakdown(v.pricing);
  const sale = formatPrice(breakdown.salePriceCents);
  const packages = publicPackages(v);
  const specs = vehicleSpecs(v);
  const windowSticker = v.documents.find((d) => d.kind === "window-sticker");
  const carfax = v.documents.find((d) => d.kind === "carfax");
  const hasFeatures = v.highlights.length > 0 || packages.length > 0;
  const sections = SECTIONS.filter((s) => (s.id === "features" ? hasFeatures : s.id === "description" ? !!v.description : s.id === "similar" ? similar.length > 0 : true));

  const keyFacts = [
    { label: "Mileage", value: formatMiles(v.mileage) },
    {
      label: "MPG",
      value: v.mpgCity != null || v.mpgHighway != null ? `${v.mpgCity ?? "–"} city / ${v.mpgHighway ?? "–"} hwy` : "Not listed",
    },
    { label: "Drivetrain", value: v.drivetrain ? DRIVETRAIN_LABELS[v.drivetrain] : "Not listed" },
    { label: "Transmission", value: v.transmission ? TRANSMISSION_LABELS[v.transmission] : "Not listed" },
  ];

  return (
    <InquiryProvider vehicleId={routeId} title={v.title} sourcePath={path}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(v, breakdown.salePriceCents) }} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16 lg:pt-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate">
          <ol className="flex flex-wrap gap-x-2 gap-y-1">
            <li>
              <Link href="/" className="hover:text-ink hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={inventoryHref({})} className="hover:text-ink hover:underline">
                Inventory
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={inventoryHref({ make: [v.make] })} className="hover:text-ink hover:underline">
                {v.make}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink">
              {v.year} {v.model}
            </li>
          </ol>
        </nav>

        <header className="mt-4">
          {v.status === "pending" ? (
            <p className="mb-2 inline-block rounded-sm bg-amber-bg px-2 py-1 text-sm font-bold text-amber">
              Sale pending
            </p>
          ) : null}
          <h1 className="font-display text-3xl leading-[1.08] text-balance sm:text-5xl">
            {v.year} {v.make} {v.model}
            {v.trim ? <span className="block text-xl font-bold text-slate sm:text-2xl">{v.trim}</span> : null}
          </h1>
          {v.tagline ? <p className="mt-2 text-sm font-semibold text-slate">{v.tagline}</p> : null}
        </header>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12">
          <div className="min-w-0">
            <PhotoGallery photos={v.images.map(({ src, alt }) => ({ src, alt }))} title={v.title} />

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
              {keyFacts.map((f) => (
                <div key={f.label} className="bg-paper p-4">
                  <dt className="text-sm text-slate">{f.label}</dt>
                  <dd className="mt-1 font-bold tabular">{f.value}</dd>
                </div>
              ))}
            </dl>

            <nav aria-label="On this page" className="scroll-x mt-8 border-b border-line">
              <ul className="flex gap-1 whitespace-nowrap">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-slate hover:text-ink"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <section id="overview" aria-labelledby="overview-title" className="pt-10">
              <h2 id="overview-title" className="font-display text-2xl">
                Overview
              </h2>
              <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                {[...specs, { label: "Stock number", value: v.stockNumber }, { label: "VIN", value: v.vin }].map(
                  (row) => (
                    <div key={row.label} className="flex justify-between gap-4 border-b border-line py-3">
                      <dt className="text-slate">{row.label}</dt>
                      <dd
                        className={`text-right font-semibold ${row.value == null ? "font-normal text-slate" : ""} ${row.label === "VIN" ? "break-all tabular" : ""}`}
                      >
                        {row.value ?? "Not listed"}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            </section>

            {hasFeatures ? (
              <section id="features" aria-labelledby="features-title" className="pt-12">
                <h2 id="features-title" className="font-display text-2xl">
                  Features
                </h2>
                {v.highlights.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {v.highlights.map((h) => (
                      <li key={h} className="rounded-full bg-mist px-3 py-1.5 text-sm font-semibold">
                        {h}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {packages.length ? (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold">Packages and options</h3>
                    <table className="mt-3 w-full text-left text-[0.9375rem]">
                      <thead>
                        <tr className="border-b border-line text-sm text-slate">
                          <th scope="col" className="py-2 pr-4 font-semibold">
                            Option
                          </th>
                          <th scope="col" className="py-2 text-right font-semibold">
                            Original MSRP
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {packages.map((p) => (
                          <tr key={`${p.name}-${p.msrpLabel}`} className="border-b border-line">
                            <td className="py-2.5 pr-4">{p.name}</td>
                            <td className="py-2.5 text-right tabular">
                              {p.included ? "Included" : (p.msrpLabel ?? "Not listed")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs text-slate">
                      Original option MSRP when new, as listed by the dealer. Not a measure of current value.
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {v.description ? (
              <section id="description" aria-labelledby="description-title" className="pt-12">
                <h2 id="description-title" className="font-display text-2xl">
                  From the dealer
                </h2>
                <div className="mt-4 max-w-prose space-y-4 leading-relaxed text-ink/90">
                  {v.description.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            ) : null}

            <section id="history" aria-labelledby="history-title" className="pt-12">
              <h2 id="history-title" className="font-display text-2xl">
                History and documents
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                <li className="rounded-md border border-line p-4">
                  <p className="flex items-center gap-2 font-bold">
                    <DocIcon className="size-5 text-cyan-ink" />
                    Window sticker
                  </p>
                  {windowSticker ? (
                    <a
                      href={windowSticker.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-cyan-ink hover:underline"
                    >
                      View window sticker
                      <ExternalIcon className="size-4" />
                      <span className="sr-only">(opens an external site)</span>
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-slate">Not available for this vehicle.</p>
                  )}
                </li>
                <li className="rounded-md border border-line p-4">
                  <p className="flex items-center gap-2 font-bold">
                    <DocIcon className="size-5 text-cyan-ink" />
                    Vehicle history report
                  </p>
                  {carfax ? (
                    <a
                      href={carfax.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-cyan-ink hover:underline"
                    >
                      View history report
                      <ExternalIcon className="size-4" />
                      <span className="sr-only">(opens an external site)</span>
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-slate">
                      No report link was captured. Ask us for one before you buy.
                    </p>
                  )}
                </li>
              </ul>
              <p className="mt-3 text-sm text-slate">
                History details in the dealer description haven’t been checked against a report.
              </p>
            </section>

            <section id="payments" aria-labelledby="payments-title" className="pt-12">
              <h2 id="payments-title" className="font-display text-2xl">
                Estimate a payment
              </h2>
              <div className="mt-4">
                <PaymentEstimator
                  salePriceCents={breakdown.salePriceCents}
                  disclosure={calculatorDisclosure(v.pricing)}
                />
              </div>
            </section>

            <section id="specs" aria-labelledby="specs-title" className="pt-12">
              <h2 id="specs-title" className="font-display text-2xl">
                Equipment
              </h2>
              <div className="mt-4">
                <EquipmentTabs equipment={v.equipment} />
              </div>
            </section>

            <section aria-labelledby="disclosures-title" className="mt-12 rounded-md bg-mist p-5 text-sm text-slate">
              <h2 id="disclosures-title" className="font-bold text-ink">
                Disclosures
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Sale price: {SALE_PRICE_NOTE} It is not an out-the-door total.</li>
                <li>
                  Vehicle details, photos and prices come from a demo snapshot captured {SNAPSHOT_DATE_LABEL}. Confirm
                  availability, equipment and price with the dealer.
                </li>
                <li>Payment estimates are illustrative and are not an offer of credit.</li>
              </ul>
            </section>
          </div>

          {/* Price and actions: sticky on desktop */}
          <aside aria-label="Price and contact" className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-md border border-line p-5 sm:p-6">
              <p className="text-sm font-semibold text-slate">Sale price</p>
              <p className="font-display text-4xl tabular">{sale}</p>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[0.9375rem]">
                {breakdown.lines.map((line) => (
                  <div key={line.label} className="flex justify-between gap-4">
                    <dt className="text-slate">{line.label}</dt>
                    <dd className="tabular">{formatPrice(line.cents)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-line pt-2 font-bold">
                  <dt>Sale price</dt>
                  <dd className="tabular">{sale}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate">{SALE_PRICE_NOTE}</p>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-slate">Mileage</dt>
                  <dd className="font-semibold tabular">{formatMiles(v.mileage)}</dd>
                </div>
                <div>
                  <dt className="text-slate">Stock</dt>
                  <dd className="font-semibold tabular" translate="no">
                    {v.stockNumber}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate">VIN</dt>
                  <dd className="font-semibold break-all tabular" translate="no">
                    {v.vin}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 grid gap-2">
                <InquiryButton kind="test-drive" />
                <div className="grid grid-cols-2 gap-2">
                  <InquiryButton kind="question" variant="secondary" className="text-sm" />
                  <InquiryButton kind="best-price" variant="secondary" className="text-sm" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <SaveButton routeId={routeId} title={v.title} variant="full" />
                <CompareButton routeId={routeId} title={v.title} variant="full" />
                <ShareButton title={v.title} />
              </div>
            </div>

            <div className="mt-4 rounded-md bg-mist p-5 text-sm">
              <p className="font-bold">Carfam, Rialto</p>
              <p className="mt-2 flex gap-2">
                <PinIcon className="mt-0.5 size-4 shrink-0 text-cyan-ink" />
                <a href={DEALER.directionsUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {DEALER.street}, {DEALER.city}, {DEALER.region} {DEALER.postalCode}
                </a>
              </p>
              <p className="mt-1 flex gap-2">
                <PhoneIcon className="mt-0.5 size-4 shrink-0 text-cyan-ink" />
                <a href={telHref(DEALER.salesPhone)} className="font-semibold hover:underline">
                  Sales {formatPhone(DEALER.salesPhone)}
                </a>
              </p>
              <dl className="mt-3 space-y-0.5 text-slate">
                {SALES_HOURS.map((h) => (
                  <div key={h.days} className="flex justify-between gap-3">
                    <dt>{h.days}</dt>
                    <dd className="tabular">{h.hours}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-slate">{HOURS_REVIEW_NOTE}</p>
            </div>
          </aside>
        </div>

        {similar.length ? (
          <section id="similar" aria-labelledby="similar-title" className="pt-16">
            <h2 id="similar-title" className="font-display text-2xl sm:text-3xl">
              Similar vehicles
            </h2>
            <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((s) => (
                <li key={s.id}>
                  <VehicleCard card={toVehicleCard(s)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Mobile action bar; the page has bottom padding so it never covers content. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate">Sale price, incl. doc + smog</p>
            <p className="font-display text-xl leading-tight tabular">{sale}</p>
          </div>
          <InquiryButton kind="test-drive" className="text-sm" />
        </div>
      </div>
    </InquiryProvider>
  );
}
