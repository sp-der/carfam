import Link from "next/link";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { inventoryHref } from "@/lib/inventory/filters";
import type { VehicleCard as Card } from "@/lib/inventory/public";
import type { Vehicle } from "@/lib/inventory/types";

/** Sold, archived or unpublished vehicle (or one the original site already returned 410 for). */
export function UnavailableVehicle({ vehicle, similar }: { vehicle: Vehicle | null; similar: Card[] }) {
  const browse = vehicle?.bodyType ? inventoryHref({ body: [vehicle.bodyType] }) : inventoryHref({});
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="text-sm font-semibold text-cyan-ink">No longer available</p>
      <h1 className="font-display mt-2 max-w-3xl text-3xl leading-tight text-balance sm:text-5xl">
        {vehicle ? `The ${vehicle.title} is no longer listed.` : "This vehicle is no longer listed."}
      </h1>
      <p className="mt-4 max-w-prose text-lg text-slate">
        It may have sold or been taken off the lot. Similar vehicles are below, or browse everything in stock.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={browse}
          className="inline-flex min-h-12 items-center rounded-md bg-pink px-5 font-bold text-ink hover:bg-pink-soft"
        >
          {vehicle?.bodyType ? "Browse similar body styles" : "Browse inventory"}
        </Link>
        <Link
          href="/find-my-car"
          className="inline-flex min-h-12 items-center rounded-md border border-line px-5 font-semibold hover:border-ink"
        >
          Use Find My Car
        </Link>
      </div>
      {similar.length ? (
        <section aria-labelledby="similar-title" className="pt-16">
          <h2 id="similar-title" className="font-display text-2xl sm:text-3xl">
            Similar vehicles
          </h2>
          <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((card) => (
              <li key={card.id}>
                <VehicleCard card={card} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
