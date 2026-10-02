import type { InventoryFilters, SortOption } from "./filters";
import { compactFilters } from "./filters";
import { slugKey } from "./normalize";
import { salePriceCents } from "./pricing";
import {
  BODY_TYPE_LABELS,
  DRIVETRAIN_LABELS,
  FUEL_TYPE_LABELS,
  TRANSMISSION_LABELS,
  type Vehicle,
} from "./types";

/**
 * Pure inventory search over a vehicle list. The repository supplies the vehicles;
 * the public inventory page, Load More endpoint and chatbot all call this.
 */

export const PAGE_SIZE = 24;

/** Shopping visibility: published, and available or pending. Sold/archived/draft are excluded. */
export function isShoppable(v: Pick<Vehicle, "publication" | "status">): boolean {
  return v.publication === "published" && (v.status === "available" || v.status === "pending");
}

function eqi(a: string | null | undefined, b: string): boolean {
  return a != null && a.toLowerCase() === b.toLowerCase();
}

function haystack(v: Vehicle): string {
  return [
    v.year,
    v.make,
    v.model,
    v.trim,
    v.title,
    v.tagline,
    v.style,
    v.exteriorColor,
    v.interiorColor,
    v.stockNumber,
    v.vin,
    v.bodyType && BODY_TYPE_LABELS[v.bodyType],
    v.bodyType,
    v.fuelType && FUEL_TYPE_LABELS[v.fuelType],
    v.drivetrain && DRIVETRAIN_LABELS[v.drivetrain],
    v.drivetrain,
    v.transmission && TRANSMISSION_LABELS[v.transmission],
  ]
    .filter((x) => x != null && x !== "")
    .join(" ")
    .toLowerCase();
}

function tokenMatches(hay: string, token: string): boolean {
  if (hay.includes(token)) return true;
  // Plural tolerance: "hondas" → "honda", "lexuses" → "lexus".
  if (token.length > 4 && token.endsWith("es") && hay.includes(token.slice(0, -2))) return true;
  if (token.length > 3 && token.endsWith("s") && hay.includes(token.slice(0, -1))) return true;
  return false;
}

type Dimension =
  | "q"
  | "make"
  | "model"
  | "body"
  | "fuel"
  | "drivetrain"
  | "transmission"
  | "exteriorColor"
  | "interiorColor"
  | "year"
  | "price"
  | "mileage"
  | "hwyMpg";

/** Build a predicate, optionally ignoring one dimension (for facet counts). */
function predicate(filters: InventoryFilters, ignore?: Dimension): (v: Vehicle) => boolean {
  const f = filters;
  const tokens = f.q ? f.q.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const modelKeys = f.model?.map(slugKey);
  return (v) => {
    if (ignore !== "q" && tokens.length) {
      const hay = haystack(v);
      if (!tokens.every((t) => tokenMatches(hay, t))) return false;
    }
    if (ignore !== "make" && f.make?.length && !f.make.some((m) => eqi(v.make, m))) return false;
    if (ignore !== "model" && modelKeys?.length && !modelKeys.includes(slugKey(v.model))) return false;
    if (ignore !== "body" && f.body?.length && !(v.bodyType && f.body.includes(v.bodyType))) return false;
    if (ignore !== "fuel" && f.fuel?.length && !(v.fuelType && f.fuel.includes(v.fuelType))) return false;
    if (ignore !== "drivetrain" && f.drivetrain?.length && !(v.drivetrain && f.drivetrain.includes(v.drivetrain)))
      return false;
    if (
      ignore !== "transmission" &&
      f.transmission?.length &&
      !(v.transmission && f.transmission.includes(v.transmission))
    )
      return false;
    if (ignore !== "exteriorColor" && f.exteriorColor?.length && !f.exteriorColor.some((c) => eqi(v.exteriorColor, c)))
      return false;
    if (ignore !== "interiorColor" && f.interiorColor?.length && !f.interiorColor.some((c) => eqi(v.interiorColor, c)))
      return false;
    if (ignore !== "year") {
      if (f.yearMin != null && v.year < f.yearMin) return false;
      if (f.yearMax != null && v.year > f.yearMax) return false;
    }
    if (ignore !== "price") {
      const sale = salePriceCents(v.pricing);
      if (f.priceMin != null && sale < f.priceMin * 100) return false;
      if (f.priceMax != null && sale >= f.priceMax * 100) return false; // strictly under
    }
    if (ignore !== "mileage" && f.mileageMax != null && v.mileage > f.mileageMax) return false;
    if (ignore !== "hwyMpg" && f.hwyMpgMin != null && !(v.mpgHighway != null && v.mpgHighway >= f.hwyMpgMin))
      return false;
    return true;
  };
}

export function matchesFilters(v: Vehicle, filters: InventoryFilters): boolean {
  return predicate(filters)(v);
}

const collator = new Intl.Collator("en-US", { sensitivity: "base", numeric: true });

function recommendedCompare(a: Vehicle, b: Vehicle): number {
  // Featured first (by rank), then newest model year, then lowest sale price.
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.featured && b.featured && a.featuredRank !== b.featuredRank)
    return (a.featuredRank ?? Number.MAX_SAFE_INTEGER) - (b.featuredRank ?? Number.MAX_SAFE_INTEGER);
  if (a.year !== b.year) return b.year - a.year;
  return salePriceCents(a.pricing) - salePriceCents(b.pricing);
}

export function compareVehicles(sort: SortOption = "recommended"): (a: Vehicle, b: Vehicle) => number {
  const primary: (a: Vehicle, b: Vehicle) => number = {
    recommended: recommendedCompare,
    "price-asc": (a: Vehicle, b: Vehicle) => salePriceCents(a.pricing) - salePriceCents(b.pricing),
    "price-desc": (a: Vehicle, b: Vehicle) => salePriceCents(b.pricing) - salePriceCents(a.pricing),
    "year-desc": (a: Vehicle, b: Vehicle) => b.year - a.year,
    "year-asc": (a: Vehicle, b: Vehicle) => a.year - b.year,
    "mileage-asc": (a: Vehicle, b: Vehicle) => a.mileage - b.mileage,
    "mileage-desc": (a: Vehicle, b: Vehicle) => b.mileage - a.mileage,
    "make-asc": (a: Vehicle, b: Vehicle) => collator.compare(a.make, b.make),
    "make-desc": (a: Vehicle, b: Vehicle) => collator.compare(b.make, a.make),
    "model-asc": (a: Vehicle, b: Vehicle) => collator.compare(a.model, b.model),
    "model-desc": (a: Vehicle, b: Vehicle) => collator.compare(b.model, a.model),
  }[sort];
  // Deterministic tie-break so pagination is stable.
  return (a, b) => primary(a, b) || collator.compare(a.title, b.title) || collator.compare(a.id, b.id);
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface InventoryFacets {
  make: FacetOption[];
  model: FacetOption[];
  body: FacetOption[];
  fuel: FacetOption[];
  drivetrain: FacetOption[];
  transmission: FacetOption[];
  year: FacetOption[];
  exteriorColor: FacetOption[];
  interiorColor: FacetOption[];
  /** Vehicles in the current result with no recorded value (shown as "unknown", never guessed). */
  unknown: { body: number; fuel: number; hwyMpg: number };
  priceRangeCents: { min: number; max: number } | null;
}

function countBy(
  vehicles: Vehicle[],
  key: (v: Vehicle) => string | null,
  label: (value: string) => string = (x) => x,
): FacetOption[] {
  const counts = new Map<string, { value: string; count: number }>();
  for (const v of vehicles) {
    const value = key(v);
    if (value == null) continue;
    const k = value.toLowerCase();
    const entry = counts.get(k) ?? { value, count: 0 };
    entry.count += 1;
    counts.set(k, entry);
  }
  return [...counts.values()]
    .map(({ value, count }) => ({ value, label: label(value), count }))
    .sort((a, b) => collator.compare(a.label, b.label));
}

export interface SearchOptions {
  /** Default true: apply shopping visibility. Admin views pass false. */
  shoppingOnly?: boolean;
  pageSize?: number;
}

export interface SearchResult {
  filters: InventoryFilters;
  /** Vehicles for pages 1..page (Load More is cumulative). */
  vehicles: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: InventoryFacets;
}

export function searchInventory(
  allVehicles: readonly Vehicle[],
  rawFilters: InventoryFilters,
  options: SearchOptions = {},
): SearchResult {
  const filters = compactFilters(rawFilters);
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const pool = (options.shoppingOnly ?? true) ? allVehicles.filter(isShoppable) : [...allVehicles];

  const matches = pool.filter(predicate(filters)).sort(compareVehicles(filters.sort));
  const page = filters.page ?? 1;
  const visible = matches.slice(0, page * pageSize);

  const without = (dim: Dimension) => pool.filter(predicate(filters, dim));
  const makePool = without("make");
  const modelPool = without("model");

  const facets: InventoryFacets = {
    make: countBy(makePool, (v) => v.make),
    model: countBy(modelPool, (v) => v.model),
    body: countBy(without("body"), (v) => v.bodyType, (x) => BODY_TYPE_LABELS[x as keyof typeof BODY_TYPE_LABELS]),
    fuel: countBy(without("fuel"), (v) => v.fuelType, (x) => FUEL_TYPE_LABELS[x as keyof typeof FUEL_TYPE_LABELS]),
    drivetrain: countBy(
      without("drivetrain"),
      (v) => v.drivetrain,
      (x) => DRIVETRAIN_LABELS[x as keyof typeof DRIVETRAIN_LABELS],
    ),
    transmission: countBy(
      without("transmission"),
      (v) => v.transmission,
      (x) => TRANSMISSION_LABELS[x as keyof typeof TRANSMISSION_LABELS],
    ),
    year: countBy(without("year"), (v) => String(v.year)).sort((a, b) => Number(b.value) - Number(a.value)),
    exteriorColor: countBy(without("exteriorColor"), (v) => v.exteriorColor),
    interiorColor: countBy(without("interiorColor"), (v) => v.interiorColor),
    unknown: {
      body: matches.filter((v) => v.bodyType == null).length,
      fuel: matches.filter((v) => v.fuelType == null).length,
      hwyMpg: matches.filter((v) => v.mpgHighway == null).length,
    },
    priceRangeCents: pool.length
      ? pool.reduce(
          (acc, v) => {
            const p = salePriceCents(v.pricing);
            return { min: Math.min(acc.min, p), max: Math.max(acc.max, p) };
          },
          { min: Number.MAX_SAFE_INTEGER, max: 0 },
        )
      : null,
  };

  return {
    filters,
    vehicles: visible,
    total: matches.length,
    page,
    pageSize,
    hasMore: visible.length < matches.length,
    facets,
  };
}

/** Similar vehicles for detail pages and no-result suggestions: same body, then same make, nearest price. */
export function similarVehicles(all: readonly Vehicle[], target: Vehicle, limit = 4): Vehicle[] {
  const price = salePriceCents(target.pricing);
  return all
    .filter((v) => v.id !== target.id && isShoppable(v))
    .map((v) => ({
      v,
      score:
        (target.bodyType && v.bodyType === target.bodyType ? 0 : 2) +
        (eqi(v.make, target.make) ? 0 : 1) +
        Math.abs(salePriceCents(v.pricing) - price) / Math.max(price, 1),
    }))
    .sort((a, b) => a.score - b.score || collator.compare(a.v.id, b.v.id))
    .slice(0, limit)
    .map((x) => x.v);
}
