"use client";

import type { InventoryFacets } from "@/lib/inventory/search";
import { FilterPanel } from "./filter-panel";
import { useInventoryNav } from "./inventory-nav";

/** Desktop left rail: every change applies immediately via the URL. */
export function DesktopFilters({ facets }: { facets: InventoryFacets }) {
  const { filters, navigate } = useInventoryNav();
  return (
    <section aria-labelledby="filters-title">
      <h2 id="filters-title" className="font-display text-xl">
        Filters
      </h2>
      <div className="mt-2">
        <FilterPanel idPrefix="rail" filters={filters} facets={facets} onChange={navigate} />
      </div>
    </section>
  );
}
