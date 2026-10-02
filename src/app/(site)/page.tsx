import Image from "next/image";
import Link from "next/link";
import { HeroSearch } from "@/components/home/hero-search";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getRepository } from "@/lib/data";
import { inventoryHref } from "@/lib/inventory/filters";
import { formatPrice } from "@/lib/inventory/pricing";
import { toVehicleCard } from "@/lib/inventory/public";
import type { BodyType } from "@/lib/inventory/types";
import { getFeaturedVehicles, searchPublicInventory } from "@/lib/services/inventory-service";
import {
  DEALER,
  formatPhone,
  HOURS_REVIEW_NOTE,
  SALES_HOURS,
  SNAPSHOT_DATE_LABEL,
  telHref,
} from "@/lib/site";

// Inventory edits must show immediately; never serve a cached homepage.
export const dynamic = "force-dynamic";

/** Body styles with captured cutout art, in display order (trucks prominent: large pickup stock). */
const LINEUP: { body: BodyType; label: string }[] = [
  { body: "suv", label: "SUVs" },
  { body: "pickup", label: "Trucks" },
  { body: "sedan", label: "Sedans" },
  { body: "passenger-van", label: "Minivans" },
  { body: "hatchback", label: "Hatchbacks" },
  { body: "coupe", label: "Coupes" },
];

const CUSTOMER_PHOTOS = [1, 2, 3, 4, 5, 6];

export default async function HomePage() {
  const repo = getRepository();
  const [all, featured] = await Promise.all([searchPublicInventory(repo, {}), getFeaturedVehicles(repo, 8)]);
  const bodyCount = new Map(all.facets.body.map((f) => [f.value, f.count]));
  const minPrice = all.facets.priceRangeCents ? formatPrice(all.facets.priceRangeCents.min) : null;

  return (
    <>
      {/* Hero: graphite stage, sentence search, body-style lineup */}
      <section className="on-dark relative isolate overflow-hidden bg-graphite text-paper" aria-labelledby="hero-title">
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-[radial-gradient(60%_100%_at_50%_100%,#2a2a2a_0%,transparent_70%)]"
        />
        <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:pt-24">
          <h1 id="hero-title" className="font-display max-w-4xl text-[2.5rem] leading-[1.02] sm:text-6xl lg:text-7xl">
            Used cars for every kind of drive.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fog">
            Carfam is a used car dealership on South Cactus Ave in Rialto. Browse {all.total} vehicles from the{" "}
            {SNAPSHOT_DATE_LABEL} snapshot{minPrice ? `, starting at ${minPrice}` : ""}: commuters, family SUVs and
            minivans, work trucks, sports cars, EVs and hybrids.
          </p>

          <div className="mt-10 lg:mt-14">
            <HeroSearch
              initialTotal={all.total}
              bodies={all.facets.body.map((f) => ({ value: f.value, label: f.label }))}
              makes={all.facets.make.map((f) => ({ value: f.value, label: f.label }))}
            />
          </div>

          <nav aria-label="Browse by body style" className="mt-14 lg:mt-20">
            <ul className="scroll-x -mx-4 flex snap-x gap-2 px-4 pb-6 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
              {LINEUP.map((item, i) => (
                <li
                  key={item.body}
                  className="w-[44%] shrink-0 snap-start motion-safe:animate-rise sm:w-auto"
                  style={{ animationDelay: `${150 + i * 70}ms` }}
                >
                  <Link
                    href={inventoryHref({ body: [item.body] })}
                    className="group flex flex-col rounded-md px-2 pb-3 pt-1 transition-colors hover:bg-graphite-2"
                  >
                    <Image
                      src={`/body-styles/${item.body}.webp`}
                      alt=""
                      width={960}
                      height={480}
                      sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 44vw"
                      className="aspect-[12/5] w-full object-cover object-bottom transition-transform duration-300 ease-out group-hover:-translate-y-1"
                    />
                    <span className="mt-1 flex items-baseline justify-between gap-2 border-t border-graphite-3 pt-2">
                      <span className="font-bold">{item.label}</span>
                      <span className="tabular text-sm text-fog">{bodyCount.get(item.body) ?? 0}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* Featured inventory */}
      <section className="bg-paper py-16 lg:py-24" aria-labelledby="featured-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="featured-title" className="font-display text-3xl sm:text-4xl">
                Picks from the lot
              </h2>
              <p className="mt-2 max-w-xl text-slate">
                A mix across body styles from the {SNAPSHOT_DATE_LABEL} snapshot. Prices shown are sale prices,
                including doc and smog fees.
              </p>
            </div>
            <Link
              href={inventoryHref({})}
              className="inline-flex min-h-11 items-center rounded-md border-2 border-ink px-4 font-bold hover:bg-ink hover:text-paper"
            >
              Browse all {all.total} vehicles
            </Link>
          </div>
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v, i) => (
              <li key={v.id} className={i >= 4 ? "hidden sm:block" : undefined}>
                <VehicleCard card={toVehicleCard(v)} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Financing and selling */}
      <section className="bg-mist py-16 lg:py-24" aria-label="Financing and selling your car">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2">
          <div className="on-dark flex flex-col rounded-md bg-graphite p-7 text-paper sm:p-10">
            <h2 className="font-display text-3xl">Financing, in English or Spanish</h2>
            <p className="mt-3 max-w-prose text-fog">
              Start the dealer finance application in the language you prefer. Capital One pre-qualification is a
              separate lender service with its own screens.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/finance-your-car"
                className="inline-flex min-h-12 items-center rounded-md bg-pink px-5 font-bold text-ink hover:bg-pink-soft"
              >
                Apply for financing
              </Link>
              <Link
                href="/solicitar-financiacion"
                lang="es"
                className="inline-flex min-h-12 items-center rounded-md border border-fog/50 px-5 font-semibold hover:border-paper"
              >
                Solicitar en español
              </Link>
            </div>
            <Link
              href="/capital-one-pre-qualify-then-shop"
              className="mt-5 self-start text-sm font-semibold text-cyan underline-offset-4 hover:underline"
            >
              Pre-qualify with Capital One
            </Link>
            <p className="mt-auto pt-8 text-xs text-fog">
              Demo screens only. No credit application is collected or sent.
            </p>
          </div>

          <div className="flex flex-col rounded-md bg-paper p-7 sm:p-10">
            <h2 className="font-display text-3xl">Sell or trade your car</h2>
            <p className="mt-3 max-w-prose text-slate">
              Start with your VIN, license plate, or year, make and model. Then add mileage, condition and a few photos
              if you have them.
            </p>
            <div className="mt-8">
              <Link
                href="/sell-my-car"
                className="inline-flex min-h-12 items-center rounded-md bg-ink px-5 font-bold text-paper hover:bg-graphite-3"
              >
                Start an appraisal
              </Link>
            </div>
            <p className="mt-auto pt-8 text-xs text-slate">
              Demo only. No valuation service is connected and nothing is sent.
            </p>
          </div>
        </div>
      </section>

      {/* Story and customer photography */}
      <section className="bg-paper py-16 lg:py-24" aria-labelledby="story-title">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="story-title" className="font-display text-3xl sm:text-4xl">
              A Rialto lot with something for everyone
            </h2>
            <div className="mt-5 max-w-prose space-y-4 text-lg leading-relaxed text-slate">
              <p>
                Carfam serves drivers across Rialto, San Bernardino and the Inland Empire. The lot is a real mix:
                first cars and daily commuters, family SUVs and minivans, work trucks, sports cars, EVs and hybrids.
              </p>
              <p>We take trade-ins and help shoppers find financing that fits.</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/about-us" className="inline-flex min-h-11 items-center font-bold text-cyan-ink hover:underline">
                About Carfam
              </Link>
              <Link
                href="/customer-gallery-at-carfam"
                className="inline-flex min-h-11 items-center font-bold text-cyan-ink hover:underline"
              >
                See our customers
              </Link>
            </div>
          </div>
          <figure>
            <ul className="grid grid-cols-3 gap-2">
              {CUSTOMER_PHOTOS.map((n) => (
                <li key={n}>
                  <Image
                    src={`/customers/${n}.webp`}
                    alt={`Carfam customer photo ${n}`}
                    width={250}
                    height={250}
                    sizes="(min-width: 1024px) 200px, 31vw"
                    className="aspect-square w-full rounded-[3px] object-cover"
                  />
                </li>
              ))}
            </ul>
            <figcaption className="mt-3 text-sm text-slate">
              From Carfam’s customer photo gallery. These are photos, not reviews.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Visit */}
      <section className="border-t border-line bg-mist py-16 lg:py-20" aria-labelledby="visit-title">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 id="visit-title" className="font-display text-3xl sm:text-4xl">
              Visit us in Rialto
            </h2>
            <address className="mt-6 space-y-4 text-lg not-italic">
              <p className="flex gap-3">
                <PinIcon className="mt-1 size-5 shrink-0 text-cyan-ink" />
                <span>
                  {DEALER.street}
                  <br />
                  {DEALER.city}, {DEALER.region} {DEALER.postalCode}
                </span>
              </p>
              <p className="flex gap-3">
                <PhoneIcon className="mt-1 size-5 shrink-0 text-cyan-ink" />
                <span>
                  Sales{" "}
                  <a href={telHref(DEALER.salesPhone)} className="font-semibold underline-offset-4 hover:underline">
                    {formatPhone(DEALER.salesPhone)}
                  </a>
                </span>
              </p>
              <p className="flex gap-3">
                <MailIcon className="mt-1 size-5 shrink-0 text-cyan-ink" />
                <a href={`mailto:${DEALER.email}`} className="font-semibold underline-offset-4 hover:underline">
                  {DEALER.email}
                </a>
              </p>
            </address>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={DEALER.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center rounded-md bg-pink px-5 font-bold text-ink hover:bg-pink-soft"
              >
                Get directions
              </a>
              <a
                href={telHref(DEALER.salesPhone)}
                className="inline-flex min-h-12 items-center rounded-md border-2 border-ink px-5 font-bold hover:bg-ink hover:text-paper"
              >
                Call sales
              </a>
            </div>
          </div>
          <div className="rounded-md bg-paper p-7 sm:p-9">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <ClockIcon className="size-5 text-cyan-ink" />
              Sales hours
            </h3>
            <dl className="mt-5 divide-y divide-line">
              {SALES_HOURS.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 py-3">
                  <dt>{h.days}</dt>
                  <dd className="tabular font-semibold">{h.hours}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-slate">
              Pacific time. {HOURS_REVIEW_NOTE}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

