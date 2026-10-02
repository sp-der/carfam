import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { DesktopFilters } from "@/components/inventory/desktop-filters";
import { InventoryNavProvider, PendingRegion } from "@/components/inventory/inventory-nav";
import { FilterChips, KeywordSearch, MobileFilters, SortSelect } from "@/components/inventory/inventory-toolbar";
import { CompareTray } from "@/components/shopping/compare-tray";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { getRepository } from "@/lib/data";
import { describeFilters, inventoryHref, type InventoryFilters } from "@/lib/inventory/filters";
import { inventoryHeading } from "@/lib/inventory/headings";
import { toVehicleCard } from "@/lib/inventory/public";
import {
  resolvePublicInventoryRoute,
  searchPublicInventory,
  suggestPublicRelaxations,
} from "@/lib/services/inventory-service";
import { SNAPSHOT_NOTICE } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = PageProps<"/pre-owned-cars/[[...segments]]">;

function toSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    for (const v of Array.isArray(value) ? value : value != null ? [value] : []) params.append(key, v);
  }
  return params;
}

/** One resolution per request, shared by metadata and the page. */
const resolve = cache(async (segmentsKey: string, query: string) => {
  const segments = segmentsKey ? segmentsKey.split("/") : [];
  return resolvePublicInventoryRoute(getRepository(), segments, new URLSearchParams(query));
});

async function routeFor({ params, searchParams }: Props) {
  const { segments = [] } = await params;
  const query = toSearchParams(await searchParams).toString();
  return resolve(segments.join("/"), query);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const route = await routeFor(props);
  if (route.kind !== "inventory") return {};
  const chips = describeFilters(route.filters).filter((c) => !["make", "model", "body"].includes(c.key));
  const heading = inventoryHeading(route.filters);
  return {
    title: chips.length ? `${heading}: ${chips.map((c) => c.label).join(", ")}` : `${heading} in Rialto, CA`,
    description: `Browse ${heading.toLowerCase()} at Carfam in Rialto, CA. ${SNAPSHOT_NOTICE}`,
    alternates: { canonical: route.canonical },
  };
}

export default async function InventoryPage(props: Props) {
  const route = await routeFor(props);
  if (route.kind === "redirect") permanentRedirect(route.location);
  if (route.kind !== "inventory") notFound();

  const repo = getRepository();
  const filters: InventoryFilters = route.filters;
  const result = await searchPublicInventory(repo, filters);
  const relaxations = result.total === 0 ? await suggestPublicRelaxations(repo, filters) : [];
  const cards = result.vehicles.map(toVehicleCard);
  const shown = cards.length;

  return (
    <InventoryNavProvider filters={filters}>
      <div className="border-b border-line bg-mist">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:pt-12">
          <nav aria-label="Breadcrumb" className="text-sm text-slate">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link href="/" className="hover:text-ink hover:underline">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-ink">
                Inventory
              </li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl leading-tight text-balance sm:text-5xl">
            {inventoryHeading(filters)}
          </h1>
          <p className="mt-2 text-sm text-slate">{SNAPSHOT_NOTICE}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <KeywordSearch />
            <div className="flex items-center justify-between gap-3">
              <MobileFilters facets={result.facets} total={result.total} />
              <SortSelect />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[17rem_1fr] lg:py-10">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">
            <DesktopFilters facets={result.facets} />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold tabular" aria-live="polite" aria-atomic="true">
              {result.total === 0
                ? "No vehicles match"
                : `${result.total} ${result.total === 1 ? "vehicle" : "vehicles"}`}
              {result.total > shown ? <span className="font-normal text-slate">, showing {shown}</span> : null}
            </p>
            <p className="text-xs text-slate">Prices are sale prices, including doc and smog fees.</p>
          </div>
          <div className="mt-3">
            <FilterChips />
          </div>

          <PendingRegion className="mt-6">
            {result.total === 0 ? (
              <NoResults relaxations={relaxations} />
            ) : (
              <>
                <h2 className="sr-only">Results</h2>
                <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map((card, i) => (
                    // Load More can grow this past 100 cards: cards beyond the first page skip
                    // rendering work while off-screen.
                    <li
                      key={card.id}
                      className={
                        i >= result.pageSize
                          ? "[contain-intrinsic-block-size:auto_26rem] [content-visibility:auto]"
                          : undefined
                      }
                    >
                      <VehicleCard card={card} priority={i < 2} />
                    </li>
                  ))}
                </ul>
                {result.hasMore ? (
                  <div className="mt-12 flex flex-col items-center gap-2">
                    <Link
                      href={inventoryHref({ ...filters, page: result.page + 1 })}
                      scroll={false}
                      className="inline-flex min-h-12 items-center rounded-md border-2 border-ink px-6 font-bold hover:bg-ink hover:text-paper"
                    >
                      Show {Math.min(result.pageSize, result.total - shown)} more
                    </Link>
                    <p className="text-sm text-slate tabular">
                      Showing {shown} of {result.total}
                    </p>
                  </div>
                ) : result.total > result.pageSize ? (
                  <p className="mt-12 text-center text-sm text-slate tabular">
                    Showing all {result.total} vehicles
                  </p>
                ) : null}
              </>
            )}
          </PendingRegion>
        </div>
      </div>
      <CompareTray />
    </InventoryNavProvider>
  );
}

function NoResults({
  relaxations,
}: {
  relaxations: Awaited<ReturnType<typeof suggestPublicRelaxations>>;
}) {
  return (
    <div className="rounded-md border border-line p-6 sm:p-8">
      <h2 className="font-display text-2xl">Nothing matches all of these filters.</h2>
      <p className="mt-2 max-w-prose text-slate">
        {relaxations.length
          ? "Removing one filter would bring back some vehicles. Your budget is only changed if you choose to."
          : "Try clearing filters, or use Find My Car to describe the vehicle you want."}
      </p>
      {relaxations.length ? (
        <ul className="mt-5 space-y-2">
          {relaxations.slice(0, 5).map((r) => (
            <li key={`${r.chip.key}:${r.chip.value ?? ""}`}>
              <Link
                href={inventoryHref(r.filters)}
                scroll={false}
                className="inline-flex min-h-11 flex-wrap items-center gap-x-2 rounded-md border border-line px-4 py-2 hover:border-ink"
              >
                <span>
                  Remove <span className="font-bold">{r.chip.label}</span>
                </span>
                <span className="text-sm text-slate tabular">
                  {r.count} {r.count === 1 ? "vehicle" : "vehicles"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/find-my-car"
          className="inline-flex min-h-12 items-center rounded-md bg-pink px-5 font-bold text-ink hover:bg-pink-soft"
        >
          Use Find My Car
        </Link>
        <Link
          href={inventoryHref({})}
          className="inline-flex min-h-12 items-center rounded-md border border-line px-5 font-semibold hover:border-ink"
        >
          Clear all filters
        </Link>
      </div>
    </div>
  );
}
