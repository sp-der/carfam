"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { CloseIcon, SearchIcon, SlidersIcon } from "@/components/icons";
import {
  describeFilters,
  filtersToSearchParams,
  inventoryHref,
  NARROWING_KEYS,
  removeChip,
  SORT_LABELS,
  SORT_OPTIONS,
  type InventoryFilters,
  type SortOption,
} from "@/lib/inventory/filters";
import type { InventoryFacets } from "@/lib/inventory/search";
import { FilterPanel } from "./filter-panel";
import { normalizeNext, useInventoryNav } from "./inventory-nav";

export function KeywordSearch() {
  const { filters, navigate } = useInventoryNav();
  return (
    <form
      role="search"
      // Re-mount when the URL's keyword changes (back/forward) so the field shows it.
      key={filters.q ?? ""}
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        navigate({ ...filters, q: q || undefined });
      }}
      className="relative flex-1"
    >
      <label htmlFor="inventory-q" className="sr-only">
        Search inventory
      </label>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate" />
      <input
        id="inventory-q"
        name="q"
        type="search"
        defaultValue={filters.q ?? ""}
        maxLength={100}
        placeholder="Search make, model, color, stock or VIN…"
        autoComplete="off"
        enterKeyHint="search"
        className="min-h-12 w-full rounded-md border border-line bg-paper pl-10 pr-24 text-base placeholder:text-slate/80"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 min-h-9 -translate-y-1/2 rounded-[5px] bg-ink px-4 text-sm font-bold text-paper hover:bg-graphite-3"
      >
        Search
      </button>
    </form>
  );
}

export function SortSelect() {
  const { filters, navigate } = useInventoryNav();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="inventory-sort" className="sr-only shrink-0 text-sm text-slate sm:not-sr-only">
        Sort by
      </label>
      <select
        id="inventory-sort"
        name="sort"
        value={filters.sort ?? "recommended"}
        onChange={(e) => navigate({ ...filters, sort: e.target.value as SortOption, page: undefined })}
        className="field-select min-h-11 rounded-md border border-line bg-paper pl-3 text-base"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * A real link (Cmd/Ctrl/middle-click open new tabs) whose plain clicks go through the inventory
 * transition, so controls update optimistically and results dim while loading.
 */
function FilterLink({
  next,
  className,
  children,
  ...rest
}: { next: InventoryFilters; className: string; children: ReactNode } & Omit<
  ComponentProps<typeof Link>,
  "href" | "onClick"
>) {
  const { navigate } = useInventoryNav();
  return (
    <Link
      {...rest}
      href={inventoryHref(normalizeNext(next))}
      scroll={false}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(next);
      }}
      className={className}
    >
      {children}
    </Link>
  );
}

export function FilterChips() {
  const { filters } = useInventoryNav();
  const chips = describeFilters(filters);
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="sr-only">Active filters</h2>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={`${chip.key}:${chip.value ?? ""}`}>
            <FilterLink
              next={removeChip(filters, chip)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cyan-ink/40 bg-cyan/10 py-1 pl-3 pr-2 text-sm font-semibold text-ink hover:border-cyan-ink hover:bg-cyan/20"
              aria-label={`Remove filter: ${chip.label}`}
            >
              {chip.label}
              <CloseIcon className="size-4 text-cyan-ink" />
            </FilterLink>
          </li>
        ))}
      </ul>
      <FilterLink
        next={filters.sort ? { sort: filters.sort } : {}}
        className="inline-flex min-h-9 items-center px-2 text-sm font-bold text-cyan-ink hover:underline"
      >
        Clear all
      </FilterLink>
    </div>
  );
}

function activeCount(filters: InventoryFilters) {
  return describeFilters(filters).filter((c) => c.key !== "q").length;
}

/**
 * Mobile filter sheet: changes are staged, the count and facets come from the shared search API,
 * and "Show N vehicles" applies them in one navigation.
 */
export function MobileFilters({ facets, total }: { facets: InventoryFacets; total: number }) {
  const { filters, navigate } = useInventoryNav();
  const ref = useRef<HTMLDialogElement>(null);
  const [staged, setStaged] = useState<InventoryFilters>(filters);
  const [preview, setPreview] = useState<{ query: string; total: number; facets: InventoryFacets } | null>(null);

  const query = filtersToSearchParams(normalizeNext(staged)).toString();
  const current = filtersToSearchParams(normalizeNext(filters)).toString();

  useEffect(() => {
    if (query === current) return;
    const controller = new AbortController();
    fetch(`/api/inventory/search?${query}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { total: number; facets: InventoryFacets }) =>
        setPreview({ query, total: data.total, facets: data.facets }),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [query, current]);

  const fresh = query === current ? { total, facets } : preview?.query === query ? preview : null;
  const n = activeCount(filters);

  const open = () => {
    setStaged(filters);
    ref.current?.showModal();
  };
  const apply = () => {
    ref.current?.close();
    navigate(staged);
  };
  const clearable = NARROWING_KEYS.filter((k) => k !== "q");

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-ink px-4 font-bold lg:hidden"
      >
        <SlidersIcon className="size-5" />
        Filters
        {n ? <span className="rounded-full bg-cyan-ink px-2 text-xs font-bold text-paper tabular">{n}</span> : null}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="filters-sheet-title"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
            <h2 id="filters-sheet-title" className="font-display text-xl">
              Filters
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
              aria-label="Close filters"
            >
              <CloseIcon className="size-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4">
            <FilterPanel
              idPrefix="sheet"
              filters={staged}
              facets={fresh?.facets ?? preview?.facets ?? facets}
              onChange={setStaged}
            />
          </div>
          <div className="flex shrink-0 gap-3 border-t border-line bg-paper px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={() => {
                const next: InventoryFilters = { ...staged };
                for (const k of clearable) delete next[k];
                setStaged(next);
              }}
              className="min-h-12 rounded-md border border-line px-4 font-bold"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              className="tabular min-h-12 flex-1 rounded-md bg-pink px-4 font-bold text-ink"
              aria-live="polite"
            >
              {fresh == null
                ? "Counting…"
                : fresh.total === 0
                  ? "See suggestions"
                  : `Show ${fresh.total} ${fresh.total === 1 ? "vehicle" : "vehicles"}`}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
