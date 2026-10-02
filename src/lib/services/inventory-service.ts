import { randomUUID } from "node:crypto";
import { z } from "zod";
import { assertCan, type Action, type Actor } from "@/lib/auth/permissions";
import type { Repository } from "@/lib/data/repository";
import type { InventoryFilters } from "@/lib/inventory/filters";
import { resolveInventoryRoute, resolveVehicleRoute, type LegacyContext } from "@/lib/inventory/legacy-routes";
import { cleanText, vehicleSlug } from "@/lib/inventory/normalize";
import {
  hasPhotos,
  isShoppable,
  searchInventory,
  selectFeaturedVehicles,
  similarVehicles,
  suggestRelaxations,
  type SearchOptions,
} from "@/lib/inventory/search";
import {
  BODY_TYPES,
  DRIVETRAINS,
  FUEL_TYPES,
  PUBLICATION_STATES,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
  feeSchema,
  vehicleImageSchema,
  packageSchema,
  type Vehicle,
} from "@/lib/inventory/types";

// ---------- public reads (shared by inventory page, Load More endpoint and chatbot) ----------

export async function searchPublicInventory(repo: Repository, filters: InventoryFilters, options?: SearchOptions) {
  return searchInventory(await repo.listVehicles(), filters, { ...options, shoppingOnly: true });
}

export async function suggestPublicRelaxations(repo: Repository, filters: InventoryFilters) {
  return suggestRelaxations(await repo.listVehicles(), filters);
}

export async function getFeaturedVehicles(repo: Repository, limit = 8) {
  return selectFeaturedVehicles(await repo.listVehicles(), limit);
}

/**
 * Saved vehicles and comparison: look up public route ids from the browser. Returns the shoppable
 * ones in request order plus the ids that are no longer available (sold, archived or unknown).
 */
export async function getShoppableByRouteIds(repo: Repository, routeIds: readonly string[]) {
  const ids = [...new Set(routeIds)].slice(0, 50);
  const vehicles: Vehicle[] = [];
  const unavailable: string[] = [];
  for (const id of ids) {
    const v = await repo.getVehicleByRouteId(id);
    if (v && isShoppable(v)) vehicles.push(v);
    else unavailable.push(id);
  }
  return { vehicles, unavailable };
}

export async function getLegacyContext(repo: Repository): Promise<LegacyContext> {
  const vehicles = await repo.listVehicles();
  const makes = [...new Map(vehicles.map((v) => [v.make.toLowerCase(), v.make])).values()];
  const models = [
    ...new Map(vehicles.map((v) => [`${v.make}|${v.model}`.toLowerCase(), { make: v.make, model: v.model }])).values(),
  ];
  return { knownMakes: makes, knownModels: models };
}

export async function resolvePublicInventoryRoute(repo: Repository, segments: string[], params: URLSearchParams) {
  return resolveInventoryRoute(segments, params, await getLegacyContext(repo));
}

export async function resolvePublicVehicle(repo: Repository, slug: string, routeId: string) {
  const route = resolveVehicleRoute(slug, routeId, await repo.getVehicleByRouteId(routeId));
  const similar =
    route.kind === "ok" || (route.kind === "unavailable" && route.vehicle)
      ? similarVehicles(await repo.listVehicles(), route.kind === "ok" ? route.vehicle : route.vehicle!)
      : [];
  return { route, similar };
}

// ---------- admin writes ----------

const currentYear = () => new Date().getFullYear();
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : cleanText(v)));

/** 17 characters, no I/O/Q. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

const vehicleFields = {
  vin: z.string().trim().toUpperCase().regex(VIN_PATTERN, "VIN must be 17 characters (no I, O or Q)"),
  stockNumber: z.string().trim().min(1, "Required").max(20),
  year: z.number().int().min(1950).max(currentYear() + 1),
  make: z.string().trim().min(1, "Required").max(40),
  model: z.string().trim().min(1, "Required").max(60),
  trim: optionalText(80),
  tagline: optionalText(120),
  style: optionalText(120),
  mileage: z.number().int().min(0).max(999_999),
  exteriorColor: optionalText(80),
  interiorColor: optionalText(80),
  bodyType: z.enum(BODY_TYPES).nullable().optional(),
  fuelType: z.enum(FUEL_TYPES).nullable().optional(),
  drivetrain: z.enum(DRIVETRAINS).nullable().optional(),
  transmission: z.enum(TRANSMISSIONS).nullable().optional(),
  engine: optionalText(80),
  horsepower: optionalText(60),
  torque: optionalText(60),
  mpgCity: z.number().int().min(0).max(200).nullable().optional(),
  mpgHighway: z.number().int().min(0).max(200).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  highlights: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  packages: z.array(packageSchema).max(50).optional(),
  equipment: z
    .object({
      exterior: z.array(z.string().trim().min(1).max(200)).max(300),
      interior: z.array(z.string().trim().min(1).max(200)).max(300),
      safety: z.array(z.string().trim().min(1).max(200)).max(300),
    })
    .optional(),
};

const pricingFields = {
  internetPriceCents: z.number().int().min(0).max(1_000_000_00),
  docFeeCents: z.number().int().min(0).max(10_000_00),
  smogFeeCents: z.number().int().min(0).max(10_000_00),
  otherFees: z.array(feeSchema).max(10),
};

export const vehicleCreateSchema = z
  .object({ ...vehicleFields, pricing: z.object(pricingFields).strict() })
  .strict();
export type VehicleCreateInput = z.input<typeof vehicleCreateSchema>;

export const vehicleUpdateSchema = z
  .object({
    ...Object.fromEntries(Object.entries(vehicleFields).map(([k, s]) => [k, (s as z.ZodType).optional()])),
    pricing: z.object(pricingFields).partial().strict().optional(),
    status: z.enum(VEHICLE_STATUSES).optional(),
    publication: z.enum(PUBLICATION_STATES).optional(),
    featured: z.boolean().optional(),
    featuredRank: z.number().int().min(1).max(999).nullable().optional(),
    images: z.array(vehicleImageSchema).max(40).optional(),
  })
  .strict();
export type VehicleUpdateInput = {
  [K in keyof VehicleCreateInput]?: K extends "pricing" ? Partial<VehicleCreateInput["pricing"]> : VehicleCreateInput[K];
} & {
  status?: Vehicle["status"];
  publication?: Vehicle["publication"];
  featured?: boolean;
  featuredRank?: number | null;
  images?: Vehicle["images"];
};

export class ValidationError extends Error {
  readonly status = 422;
  constructor(
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

function toValidationError(error: z.ZodError): ValidationError {
  const flat = z.flattenError(error);
  return new ValidationError("Please fix the highlighted fields.", flat.fieldErrors as Record<string, string[]>);
}

async function assertUniqueIdentifiers(repo: Repository, vin: string, stockNumber: string, selfId?: string) {
  const vehicles = await repo.listVehicles();
  const errors: Record<string, string[]> = {};
  const vinOwner = vehicles.find((v) => v.id !== selfId && v.vin.toUpperCase() === vin.toUpperCase());
  if (vinOwner) errors.vin = [`VIN already used by ${vinOwner.title} (stock ${vinOwner.stockNumber})`];
  const stockOwner = vehicles.find(
    (v) => v.id !== selfId && v.stockNumber.toLowerCase() === stockNumber.toLowerCase(),
  );
  if (stockOwner) errors.stockNumber = [`Stock number already used by ${stockOwner.title}`];
  if (Object.keys(errors).length) throw new ValidationError("Duplicate vehicle identifiers.", errors);
}

function buildTitle(year: number, make: string, model: string, trim: string | null | undefined) {
  return [year, make, model, trim].filter(Boolean).join(" ");
}

export async function createVehicle(repo: Repository, actor: Actor | null, input: unknown): Promise<Vehicle> {
  assertCan(actor, "inventory:create");
  const parsed = vehicleCreateSchema.safeParse(input);
  if (!parsed.success) throw toValidationError(parsed.error);
  const d = parsed.data;
  await assertUniqueIdentifiers(repo, d.vin, d.stockNumber);

  const now = new Date().toISOString();
  const vehicle: Vehicle = {
    id: `veh_${randomUUID()}`,
    sourceId: null,
    slug: vehicleSlug(d.year, d.make, d.model),
    vin: d.vin,
    stockNumber: d.stockNumber,
    year: d.year,
    make: d.make,
    model: d.model,
    trim: d.trim ?? null,
    title: buildTitle(d.year, d.make, d.model, d.trim),
    tagline: d.tagline ?? null,
    style: d.style ?? null,
    mileage: d.mileage,
    exteriorColor: d.exteriorColor ?? null,
    interiorColor: d.interiorColor ?? null,
    bodyType: d.bodyType ?? null,
    fuelType: d.fuelType ?? null,
    drivetrain: d.drivetrain ?? null,
    drivetrainLabel: null,
    transmission: d.transmission ?? null,
    engine: d.engine ?? null,
    horsepower: d.horsepower ?? null,
    torque: d.torque ?? null,
    mpgCity: d.mpgCity ?? null,
    mpgHighway: d.mpgHighway ?? null,
    description: d.description ?? null,
    pricing: d.pricing,
    status: "available",
    publication: "draft",
    featured: false,
    featuredRank: null,
    images: [],
    hasPlaceholderImage: false,
    packages: d.packages ?? [],
    highlights: d.highlights ?? [],
    equipment: d.equipment ?? { exterior: [], interior: [], safety: [] },
    documents: [],
    dataQualityFlags: [],
    fieldSources: {},
    snapshotAt: null,
    sourceHtmlPath: null,
    firstPublishedAt: null,
    createdAt: now,
    updatedAt: now,
    staffEditedAt: now,
  };
  return repo.insertVehicle(vehicle);
}

/** Which permission each kind of change needs. Unlisted fields need "inventory:edit". */
function requiredActions(patch: VehicleUpdateInput, current: Vehicle): Action[] {
  const actions = new Set<Action>();
  for (const key of Object.keys(patch) as (keyof VehicleUpdateInput)[]) {
    if (key === "pricing") actions.add("inventory:edit-pricing");
    else if (key === "status") actions.add("inventory:set-status");
    else if (key === "publication")
      actions.add(patch.publication === "archived" || current.publication === "archived" ? "inventory:archive" : "inventory:publish");
    else if (key === "featured" || key === "featuredRank") actions.add("inventory:feature");
    else if (key === "images") actions.add("inventory:manage-photos");
    else actions.add("inventory:edit");
  }
  return [...actions];
}

export async function updateVehicle(
  repo: Repository,
  actor: Actor | null,
  id: string,
  input: unknown,
  expectedUpdatedAt?: string,
): Promise<Vehicle> {
  assertCan(actor, "inventory:edit");
  const parsed = vehicleUpdateSchema.safeParse(input);
  if (!parsed.success) throw toValidationError(parsed.error);
  const patch = parsed.data as VehicleUpdateInput;

  const current = await repo.getVehicle(id);
  if (!current) throw new ValidationError("Vehicle not found.");
  for (const action of requiredActions(patch, current)) assertCan(actor, action);

  const next: Vehicle = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || key === "pricing") continue;
    (next as Record<string, unknown>)[key] = value;
  }
  if (patch.pricing) next.pricing = { ...current.pricing, ...patch.pricing };
  if (patch.vin !== undefined || patch.stockNumber !== undefined)
    await assertUniqueIdentifiers(repo, next.vin, next.stockNumber, id);
  if (patch.year !== undefined || patch.make !== undefined || patch.model !== undefined || patch.trim !== undefined) {
    next.title = buildTitle(next.year, next.make, next.model, next.trim);
    // Keep original slugs for imported vehicles so legacy URLs stay stable; route id is unchanged.
    if (!next.sourceId) next.slug = vehicleSlug(next.year, next.make, next.model);
  }
  if (patch.images) next.hasPlaceholderImage = false;
  // Featured slots only show vehicles with photos (see CLAUDE.md).
  if (patch.featured === true && !hasPhotos(next))
    throw new ValidationError("Add at least one photo before featuring this vehicle.", {
      featured: ["Vehicle has no photos"],
    });
  if (patch.images && !hasPhotos(next)) next.featured = false;
  if (!next.featured) next.featuredRank = null;

  const now = new Date().toISOString();
  if (next.publication === "published" && !next.firstPublishedAt) next.firstPublishedAt = now;
  next.updatedAt = now;
  next.staffEditedAt = now;
  return repo.replaceVehicle(next, expectedUpdatedAt);
}
