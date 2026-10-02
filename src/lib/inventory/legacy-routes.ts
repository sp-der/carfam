import {
  INVENTORY_PATH,
  compactFilters,
  filtersFromSearchParams,
  inventoryHref,
  type InventoryFilters,
  type SortOption,
} from "./filters";
import { normalizeBodyType, normalizeFuelType, slugKey } from "./normalize";
import { FUEL_TYPES, vehicleDetailPath, type Vehicle } from "./types";

/**
 * Central parser for legacy Carfam URLs observed in the recon route ledger.
 * Category paths render in place (canonical → clean query URL), `/filter/…` paths and
 * legacy query keys redirect to the clean query form, matching the original site.
 */

/** Simple page aliases (query string preserved by the caller). */
export const LEGACY_PAGE_REDIRECTS: Readonly<Record<string, string>> = {
  "/inventory": INVENTORY_PATH,
  "/searchused.aspx": INVENTORY_PATH,
  "/contactus.aspx": "/contact-us",
};

/** Vehicle ids the original site itself returned 410 Gone for during capture. */
export const GONE_VEHICLE_IDS: ReadonlySet<string> = new Set(["1505080"]);

export interface LegacyContext {
  /** Makes present in the data store (any publication state). */
  knownMakes: readonly string[];
  /** Make/model pairs present in the data store. */
  knownModels: readonly { make: string; model: string }[];
}

export type InventoryRoute =
  | { kind: "inventory"; filters: InventoryFilters; canonical: string }
  | { kind: "redirect"; location: string }
  | { kind: "detail"; slug: string; id: string }
  | { kind: "not-found" };

const LEGACY_SORT_FIELDS: Record<string, string> = {
  internetprice: "price",
  price: "price",
  year: "year",
  make: "make",
  model: "model",
  mileage: "mileage",
};

/** "Year" + "desc" → "year-desc"; "InternetPrice-asc" → "price-asc"; EstimatedRange → undefined (no data). */
export function parseLegacySort(field: string | null, dir?: string | null): SortOption | undefined {
  if (!field) return undefined;
  let name = field;
  let direction = dir ?? undefined;
  const dash = field.lastIndexOf("-");
  if (!direction && dash > 0) {
    name = field.slice(0, dash);
    direction = field.slice(dash + 1);
  }
  const mapped = LEGACY_SORT_FIELDS[name.toLowerCase()];
  if (!mapped) return undefined;
  const d = (direction ?? "asc").toLowerCase() === "desc" ? "desc" : "asc";
  return `${mapped}-${d}` as SortOption;
}

/** "0-15000", "Under 10000", "Over 70000", "10000-20000" → whole-dollar bounds. */
export function parseLegacyPriceRange(raw: string | null): Pick<InventoryFilters, "priceMin" | "priceMax"> {
  if (!raw) return {};
  const value = raw.replace(/[$,\s]/g, "").toLowerCase();
  let m = /^under(\d+)$/.exec(value);
  if (m) return { priceMax: Number(m[1]) };
  m = /^over(\d+)$/.exec(value);
  if (m) return { priceMin: Number(m[1]) };
  m = /^(\d+)-(\d+)$/.exec(value);
  if (m) {
    const lo = Number(m[1]);
    const hi = Number(m[2]);
    if (hi <= lo) return {};
    return lo > 0 ? { priceMin: lo, priceMax: hi } : { priceMax: hi };
  }
  return {};
}

const LEGACY_QUERY_KEYS = ["bodytype", "pricerange", "dir", "year", "sortby"];

function canonicalMake(ctx: LegacyContext, raw: string): string | undefined {
  const key = slugKey(raw);
  return ctx.knownMakes.find((m) => slugKey(m) === key);
}

function canonicalModel(ctx: LegacyContext, make: string | undefined, raw: string): string {
  const key = slugKey(raw);
  const found = ctx.knownModels.find(
    (p) => slugKey(p.model) === key && (!make || slugKey(p.make) === slugKey(make)),
  );
  return found?.model ?? raw.replace(/-/g, " ");
}

/** Legacy key/value pairs (from `/filter/k/v/…` or legacy query strings) → filters. */
function filtersFromLegacyPairs(ctx: LegacyContext, pairs: [string, string][]): InventoryFilters {
  const f: InventoryFilters = {};
  let sortField: string | null = null;
  let sortDir: string | null = null;
  const get = (k: string) => pairs.filter(([key]) => key.toLowerCase() === k).map(([, v]) => v);

  const bodies = get("bodytype").map(normalizeBodyType).filter((b) => b != null);
  if (bodies.length) f.body = bodies;
  const fuels = get("fuel").map(normalizeFuelType).filter((x) => x != null);
  if (fuels.length) f.fuel = fuels;
  const makes = get("make").map((m) => canonicalMake(ctx, m) ?? m);
  if (makes.length) f.make = makes;
  const models = get("model").map((m) => canonicalModel(ctx, makes[0], m));
  if (models.length) f.model = models;
  const year = get("year").map(Number).find((y) => Number.isInteger(y) && y > 1900);
  if (year) {
    f.yearMin = year;
    f.yearMax = year;
  }
  const range = get("pricerange")[0];
  if (range) Object.assign(f, parseLegacyPriceRange(range));
  sortField = get("sort")[0] ?? get("sortby")[0] ?? null;
  sortDir = get("dir")[0] ?? null;
  const sort = parseLegacySort(sortField, sortDir);
  if (sort) f.sort = sort;
  return compactFilters(f);
}

type SearchParamsLike = URLSearchParams;

/** Clean sorts are lowercase kebab ("price-asc"); clean fuels are enum values. Anything else is legacy. */
function isLegacyValue(key: string, value: string): boolean {
  const k = key.toLowerCase();
  if (k === "sort") return !/^[a-z]+(-[a-z]+)?$/.test(value);
  if (k === "fuel") return !(FUEL_TYPES as readonly string[]).includes(value);
  return false;
}

function hasLegacyQuery(params: SearchParamsLike): boolean {
  return [...params.entries()].some(
    ([k, v]) => LEGACY_QUERY_KEYS.includes(k.toLowerCase()) || isLegacyValue(k, v),
  );
}

/**
 * Resolve `/pre-owned-cars/...` (segments after the base path) plus its query string.
 */
export function resolveInventoryRoute(
  segments: readonly string[],
  params: SearchParamsLike,
  ctx: LegacyContext,
): InventoryRoute {
  const segs = segments.map((s) => decodeURIComponent(s)).filter(Boolean);

  // Legacy query keys on any inventory URL → redirect to the clean form.
  if (segs.length === 0 && hasLegacyQuery(params)) {
    const legacy = filtersFromLegacyPairs(ctx, [...params.entries()]);
    const clean = filtersFromSearchParams(withoutLegacyKeys(params)).filters;
    return { kind: "redirect", location: inventoryHref({ ...clean, ...legacy }) };
  }

  if (segs.length === 0) {
    const { filters } = filtersFromSearchParams(params);
    return { kind: "inventory", filters, canonical: inventoryHref(filters) };
  }

  if (segs[0].toLowerCase() === "detail") {
    if (segs.length !== 3) return { kind: "not-found" };
    return { kind: "detail", slug: segs[1], id: segs[2] };
  }

  if (segs[0].toLowerCase() === "filter") {
    const rest = segs.slice(1);
    const pairs: [string, string][] = [];
    for (let i = 0; i < rest.length; i++) {
      const seg = rest[i];
      const eq = seg.indexOf("=");
      if (eq > 0) {
        pairs.push([seg.slice(0, eq), seg.slice(eq + 1)]);
      } else if (i + 1 < rest.length) {
        // Values compare by slug, so "Passenger-Van" and "Passenger Van" are equivalent.
        pairs.push([seg, rest[i + 1]]);
        i++;
      } else {
        return { kind: "not-found" };
      }
    }
    const filters = filtersFromLegacyPairs(ctx, pairs);
    if (Object.keys(filters).length === 0) return { kind: "not-found" };
    return { kind: "redirect", location: inventoryHref(filters) };
  }

  // Category paths: /{year}, /{make}, /{year}/{make}, /{year}/{make}/{model}
  const filters: InventoryFilters = {};
  let rest = segs;
  if (/^\d{4}$/.test(rest[0])) {
    filters.yearMin = Number(rest[0]);
    filters.yearMax = Number(rest[0]);
    rest = rest.slice(1);
  }
  if (rest.length > 2) return { kind: "not-found" };
  if (rest.length >= 1) {
    const make = canonicalMake(ctx, rest[0]);
    if (!make) return { kind: "not-found" };
    filters.make = [make];
  }
  if (rest.length === 2) {
    // Year is required before make/model in observed paths, but /{make}/{model} is harmless to accept.
    filters.model = [canonicalModel(ctx, filters.make?.[0], rest[1])];
  }
  // Clean query params may refine a category page (e.g. sort from the inventory UI).
  const extra = filtersFromSearchParams(params).filters;
  const merged = compactFilters({ ...extra, ...filters });
  return { kind: "inventory", filters: merged, canonical: inventoryHref(merged) };
}

function withoutLegacyKeys(params: SearchParamsLike): URLSearchParams {
  const next = new URLSearchParams();
  for (const [k, v] of params.entries()) {
    const lower = k.toLowerCase();
    if (LEGACY_QUERY_KEYS.includes(lower) || isLegacyValue(k, v)) continue;
    if (lower === "make" || lower === "model") continue; // re-derived by the legacy parser
    next.append(k, v);
  }
  return next;
}

export type VehicleRoute =
  | { kind: "ok"; vehicle: Vehicle }
  | { kind: "redirect"; location: string }
  /** Existed publicly but is sold, archived or unpublished → render tombstone with HTTP 410. */
  | { kind: "unavailable"; vehicle: Vehicle | null }
  | { kind: "not-found" };

/** Decide what a VDP URL should do. `vehicle` is the store lookup by route id (sourceId or id). */
export function resolveVehicleRoute(slug: string, id: string, vehicle: Vehicle | undefined): VehicleRoute {
  if (!vehicle) return GONE_VEHICLE_IDS.has(id) ? { kind: "unavailable", vehicle: null } : { kind: "not-found" };
  if (vehicle.publication === "draft" && vehicle.firstPublishedAt == null) return { kind: "not-found" };
  if (vehicle.publication !== "published" || vehicle.status === "sold") return { kind: "unavailable", vehicle };
  if (slug !== vehicle.slug) return { kind: "redirect", location: vehicleDetailPath(vehicle) };
  return { kind: "ok", vehicle };
}
