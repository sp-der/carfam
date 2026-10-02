import { z } from "zod";
import {
  BODY_TYPES,
  BODY_TYPE_LABELS,
  DRIVETRAINS,
  DRIVETRAIN_LABELS,
  FUEL_TYPES,
  FUEL_TYPE_LABELS,
  TRANSMISSIONS,
  TRANSMISSION_LABELS,
} from "./types";
import { formatPrice } from "./pricing";

/**
 * Shared, validated inventory filter schema. Used by the inventory page URL, legacy-route
 * parser, search service and chatbot tools. Prices are whole dollars on the sale price;
 * `priceMax` is exclusive ("under $15k" → salePrice < 15000).
 */

export const SORT_OPTIONS = [
  "recommended",
  "price-asc",
  "price-desc",
  "year-desc",
  "year-asc",
  "mileage-asc",
  "mileage-desc",
  "make-asc",
  "make-desc",
  "model-asc",
  "model-desc",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  "price-asc": "Lowest price",
  "price-desc": "Highest price",
  "year-desc": "Newest year",
  "year-asc": "Oldest year",
  "mileage-asc": "Lowest mileage",
  "mileage-desc": "Highest mileage",
  "make-asc": "Make (A–Z)",
  "make-desc": "Make (Z–A)",
  "model-asc": "Model (A–Z)",
  "model-desc": "Model (Z–A)",
};

const MAX_LIST = 30;
const text = z.string().trim().min(1).max(80);
const year = z.number().int().min(1900).max(2100);
const dollars = z.number().int().min(0).max(10_000_000);

export const inventoryFiltersSchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    make: z.array(text).max(MAX_LIST).optional(),
    model: z.array(text).max(MAX_LIST).optional(),
    body: z.array(z.enum(BODY_TYPES)).max(BODY_TYPES.length).optional(),
    fuel: z.array(z.enum(FUEL_TYPES)).max(FUEL_TYPES.length).optional(),
    drivetrain: z.array(z.enum(DRIVETRAINS)).max(DRIVETRAINS.length).optional(),
    transmission: z.array(z.enum(TRANSMISSIONS)).max(TRANSMISSIONS.length).optional(),
    exteriorColor: z.array(text).max(MAX_LIST).optional(),
    interiorColor: z.array(text).max(MAX_LIST).optional(),
    yearMin: year.optional(),
    yearMax: year.optional(),
    priceMin: dollars.optional(),
    priceMax: dollars.optional(),
    mileageMax: z.number().int().min(0).max(1_000_000).optional(),
    hwyMpgMin: z.number().int().min(0).max(200).optional(),
    sort: z.enum(SORT_OPTIONS).optional(),
    page: z.number().int().min(1).max(100).optional(),
  })
  .strict()
  .refine((f) => f.yearMin == null || f.yearMax == null || f.yearMin <= f.yearMax, {
    message: "yearMin must be ≤ yearMax",
    path: ["yearMin"],
  })
  .refine((f) => f.priceMin == null || f.priceMax == null || f.priceMin < f.priceMax, {
    message: "priceMin must be < priceMax",
    path: ["priceMin"],
  });

export type InventoryFilters = z.infer<typeof inventoryFiltersSchema>;
export type FilterKey = keyof InventoryFilters;

const LIST_KEYS = [
  "make",
  "model",
  "body",
  "fuel",
  "drivetrain",
  "transmission",
  "exteriorColor",
  "interiorColor",
] as const satisfies readonly FilterKey[];
const NUMBER_KEYS = [
  "yearMin",
  "yearMax",
  "priceMin",
  "priceMax",
  "mileageMax",
  "hwyMpgMin",
  "page",
] as const satisfies readonly FilterKey[];
type ListKey = (typeof LIST_KEYS)[number];

/** Keys that narrow results (excludes sort/page). */
export const NARROWING_KEYS: readonly FilterKey[] = ["q", ...LIST_KEYS, ...NUMBER_KEYS.filter((k) => k !== "page")];

/** Remove empty values and dedupe lists so equal filters serialize identically. */
export function compactFilters(filters: InventoryFilters): InventoryFilters {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value)) {
      const seen = new Set<string>();
      const deduped = value.filter((v: string) => {
        const k = v.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (deduped.length === 0) continue;
      out[key] = deduped;
      continue;
    }
    out[key] = value;
  }
  if (out.sort === "recommended") delete out.sort;
  if (out.page === 1) delete out.page;
  return out as InventoryFilters;
}

export type ParseResult =
  | { ok: true; filters: InventoryFilters }
  | { ok: false; error: string; issues: z.core.$ZodIssue[] };

export function validateFilters(input: unknown): ParseResult {
  const parsed = inventoryFiltersSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: z.prettifyError(parsed.error), issues: parsed.error.issues };
  }
  return { ok: true, filters: compactFilters(parsed.data) };
}

type SearchParamsLike = { getAll(name: string): string[]; get(name: string): string | null };

/**
 * Parse clean inventory URL params (`?make=Honda&body=suv&priceMax=15000`).
 * Invalid individual values are dropped rather than failing the page; `dropped` lists them.
 */
export function filtersFromSearchParams(params: SearchParamsLike): {
  filters: InventoryFilters;
  dropped: string[];
} {
  const raw: Record<string, unknown> = {};
  const dropped: string[] = [];

  const q = params.get("q");
  if (q) raw.q = q.slice(0, 100);

  for (const key of LIST_KEYS) {
    const values = params
      .getAll(key)
      .flatMap((v) => v.split(","))
      .map((v) => v.trim())
      .filter(Boolean);
    if (values.length) raw[key] = values;
  }
  for (const key of NUMBER_KEYS) {
    const value = params.get(key);
    if (value == null || value === "") continue;
    const n = Number(value.replace(/[$,_\s]/g, ""));
    if (Number.isInteger(n)) raw[key] = n;
    else dropped.push(key);
  }
  const sort = params.get("sort");
  if (sort) raw.sort = sort;

  // Validate field by field so one bad value doesn't discard the rest.
  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const single = inventoryFiltersSchema.safeParse({ [key]: value });
    if (single.success) filters[key] = (single.data as Record<string, unknown>)[key];
    else if (Array.isArray(value)) {
      // Keep the valid members of a list (e.g. body=suv,spaceship → [suv]).
      const kept = value.filter(
        (item) => inventoryFiltersSchema.safeParse({ [key]: [item] }).success,
      );
      if (kept.length) filters[key] = kept;
      dropped.push(key);
    } else dropped.push(key);
  }
  // Cross-field rules: drop the min side if contradictory.
  const whole = inventoryFiltersSchema.safeParse(filters);
  if (!whole.success) {
    for (const issue of whole.error.issues) {
      const key = String(issue.path[0]);
      delete filters[key];
      dropped.push(key);
    }
  }
  return { filters: compactFilters(filters as InventoryFilters), dropped };
}

const PARAM_ORDER: readonly FilterKey[] = [
  "q",
  "make",
  "model",
  "body",
  "yearMin",
  "yearMax",
  "priceMin",
  "priceMax",
  "mileageMax",
  "fuel",
  "drivetrain",
  "transmission",
  "exteriorColor",
  "interiorColor",
  "hwyMpgMin",
  "sort",
  "page",
];

/** Stable, canonical query string (no leading "?"). */
export function filtersToSearchParams(filters: InventoryFilters): URLSearchParams {
  const compact = compactFilters(filters);
  const params = new URLSearchParams();
  for (const key of PARAM_ORDER) {
    const value = compact[key];
    if (value == null) continue;
    if (Array.isArray(value)) for (const item of value) params.append(key, String(item));
    else params.set(key, String(value));
  }
  return params;
}

export const INVENTORY_PATH = "/pre-owned-cars";

export function inventoryHref(filters: InventoryFilters): string {
  const qs = filtersToSearchParams(filters).toString();
  return qs ? `${INVENTORY_PATH}?${qs}` : INVENTORY_PATH;
}

/**
 * Filter changes, shared by filter chips and the chatbot.
 * - `replace`: discard current filters, use `set` (a new search: "Show me Lexuses").
 * - `merge`: keep current filters, overwrite the keys in `set` ("Only SUVs", "Actually under $20k"),
 *   append list values in `add` ("also Toyotas"), and drop `remove` keys.
 * - `clear`: reset everything ("Clear everything").
 * Page always resets to 1 when narrowing filters change.
 */
export const filterPatchSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("replace"), set: inventoryFiltersSchema }).strict(),
  z
    .object({
      mode: z.literal("merge"),
      set: inventoryFiltersSchema.optional(),
      add: z
        .object({
          make: z.array(text).max(MAX_LIST).optional(),
          model: z.array(text).max(MAX_LIST).optional(),
          body: z.array(z.enum(BODY_TYPES)).optional(),
          fuel: z.array(z.enum(FUEL_TYPES)).optional(),
          drivetrain: z.array(z.enum(DRIVETRAINS)).optional(),
          transmission: z.array(z.enum(TRANSMISSIONS)).optional(),
          exteriorColor: z.array(text).max(MAX_LIST).optional(),
          interiorColor: z.array(text).max(MAX_LIST).optional(),
        })
        .strict()
        .optional(),
      remove: z.array(z.enum(PARAM_ORDER as [FilterKey, ...FilterKey[]])).optional(),
    })
    .strict(),
  z.object({ mode: z.literal("clear") }).strict(),
]);
export type FilterPatch = z.infer<typeof filterPatchSchema>;

export function applyFilterPatch(current: InventoryFilters, patch: FilterPatch): InventoryFilters {
  if (patch.mode === "clear") return {};
  if (patch.mode === "replace") return compactFilters({ ...patch.set, page: undefined });

  const next: Record<string, unknown> = { ...current };
  for (const key of patch.remove ?? []) delete next[key];
  for (const [key, value] of Object.entries(patch.set ?? {})) next[key] = value;
  for (const [key, values] of Object.entries(patch.add ?? {})) {
    const existing = (next[key] as string[] | undefined) ?? [];
    next[key] = [...existing, ...(values as string[])];
  }
  const changedNarrowing =
    (patch.remove ?? []).some((k) => k !== "sort" && k !== "page") ||
    Object.keys(patch.set ?? {}).some((k) => k !== "sort" && k !== "page") ||
    Object.keys(patch.add ?? {}).length > 0;
  if (changedNarrowing && !(patch.set && "page" in patch.set)) delete next.page;

  const result = validateFilters(next);
  if (!result.ok) throw new FilterValidationError(result.error);
  return result.filters;
}

export class FilterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilterValidationError";
  }
}

export interface FilterChip {
  key: FilterKey;
  /** For list filters, the specific value the chip removes. */
  value?: string;
  label: string;
}

/** Human-readable chips; also used by the chatbot to describe active filters. */
export function describeFilters(filters: InventoryFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  const f = compactFilters(filters);
  if (f.q) chips.push({ key: "q", label: `“${f.q}”` });
  const listLabel: Record<ListKey, (v: string) => string> = {
    make: (v) => v,
    model: (v) => v,
    body: (v) => BODY_TYPE_LABELS[v as keyof typeof BODY_TYPE_LABELS] ?? v,
    fuel: (v) => FUEL_TYPE_LABELS[v as keyof typeof FUEL_TYPE_LABELS] ?? v,
    drivetrain: (v) => DRIVETRAIN_LABELS[v as keyof typeof DRIVETRAIN_LABELS] ?? v,
    transmission: (v) => TRANSMISSION_LABELS[v as keyof typeof TRANSMISSION_LABELS] ?? v,
    exteriorColor: (v) => `Exterior: ${v}`,
    interiorColor: (v) => `Interior: ${v}`,
  };
  for (const key of LIST_KEYS) {
    for (const value of f[key] ?? []) chips.push({ key, value, label: listLabel[key](value) });
  }
  const money = (d: number) => formatPrice(d * 100);
  if (f.priceMin != null) chips.push({ key: "priceMin", label: `Sale price ${money(f.priceMin)}+` });
  if (f.priceMax != null) chips.push({ key: "priceMax", label: `Sale price under ${money(f.priceMax)}` });
  if (f.yearMin != null && f.yearMax != null && f.yearMin === f.yearMax)
    chips.push({ key: "yearMin", label: `${f.yearMin}` });
  else {
    if (f.yearMin != null) chips.push({ key: "yearMin", label: `${f.yearMin} or newer` });
    if (f.yearMax != null) chips.push({ key: "yearMax", label: `${f.yearMax} or older` });
  }
  if (f.mileageMax != null)
    chips.push({ key: "mileageMax", label: `Up to ${f.mileageMax.toLocaleString("en-US")} miles` });
  if (f.hwyMpgMin != null) chips.push({ key: "hwyMpgMin", label: `${f.hwyMpgMin}+ hwy MPG` });
  return chips;
}

/** Remove one chip's value (or the whole key for scalar filters). */
export function removeChip(filters: InventoryFilters, chip: FilterChip): InventoryFilters {
  const next: Record<string, unknown> = { ...filters };
  const current = next[chip.key];
  if (Array.isArray(current) && chip.value != null) {
    next[chip.key] = current.filter((v: string) => v.toLowerCase() !== chip.value!.toLowerCase());
  } else {
    delete next[chip.key];
    if (chip.key === "yearMin" && filters.yearMin === filters.yearMax) delete next.yearMax;
  }
  delete next.page;
  return compactFilters(next as InventoryFilters);
}
