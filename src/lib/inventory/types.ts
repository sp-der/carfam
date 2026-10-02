import { z } from "zod";

export const BODY_TYPES = [
  "sedan",
  "coupe",
  "suv",
  "pickup",
  "hatchback",
  "passenger-van",
  "cargo-van",
  "convertible",
  "other",
] as const;
export const FUEL_TYPES = [
  "gasoline",
  "diesel",
  "hybrid",
  "plug-in-hybrid",
  "electric",
  "flex-fuel",
] as const;
export const DRIVETRAINS = ["fwd", "rwd", "awd", "4wd"] as const;
export const TRANSMISSIONS = ["automatic", "manual"] as const;
export const VEHICLE_STATUSES = ["available", "pending", "sold"] as const;
export const PUBLICATION_STATES = ["draft", "published", "archived"] as const;

export type BodyType = (typeof BODY_TYPES)[number];
export type FuelType = (typeof FUEL_TYPES)[number];
export type Drivetrain = (typeof DRIVETRAINS)[number];
export type Transmission = (typeof TRANSMISSIONS)[number];
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];
export type PublicationState = (typeof PUBLICATION_STATES)[number];

const cents = z.number().int().min(0);

export const feeSchema = z.object({
  label: z.string().trim().min(1).max(60),
  cents,
});

export const pricingSchema = z.object({
  internetPriceCents: cents,
  docFeeCents: cents,
  smogFeeCents: cents,
  otherFees: z.array(feeSchema).max(10),
});

export const vehicleImageSchema = z.object({
  /** Site-relative path served from /public (e.g. /vehicles/1449827/1.jpg). */
  src: z.string().startsWith("/"),
  alt: z.string(),
  /** Original capture URL kept for provenance only; never rendered. */
  sourceUrl: z.string().nullable(),
  origin: z.enum(["recon", "upload"]),
});

export const packageSchema = z.object({
  name: z.string(),
  msrpCents: cents.nullable(),
  included: z.boolean(),
  reviewFlag: z.string().nullable(),
});

export const vehicleSchema = z.object({
  id: z.string(),
  sourceId: z.string().nullable(),
  slug: z.string(),
  vin: z.string(),
  stockNumber: z.string(),
  year: z.number().int(),
  make: z.string(),
  model: z.string(),
  trim: z.string().nullable(),
  title: z.string(),
  tagline: z.string().nullable(),
  style: z.string().nullable(),
  mileage: z.number().int().min(0),
  exteriorColor: z.string().nullable(),
  interiorColor: z.string().nullable(),
  bodyType: z.enum(BODY_TYPES).nullable(),
  fuelType: z.enum(FUEL_TYPES).nullable(),
  drivetrain: z.enum(DRIVETRAINS).nullable(),
  drivetrainLabel: z.string().nullable(),
  transmission: z.enum(TRANSMISSIONS).nullable(),
  engine: z.string().nullable(),
  horsepower: z.string().nullable(),
  torque: z.string().nullable(),
  mpgCity: z.number().int().nullable(),
  mpgHighway: z.number().int().nullable(),
  description: z.string().nullable(),
  pricing: pricingSchema,
  status: z.enum(VEHICLE_STATUSES),
  publication: z.enum(PUBLICATION_STATES),
  featured: z.boolean(),
  featuredRank: z.number().int().nullable(),
  images: z.array(vehicleImageSchema),
  hasPlaceholderImage: z.boolean(),
  packages: z.array(packageSchema),
  highlights: z.array(z.string()),
  equipment: z.object({
    exterior: z.array(z.string()),
    interior: z.array(z.string()),
    safety: z.array(z.string()),
  }),
  documents: z.array(
    z.object({ kind: z.enum(["carfax", "window-sticker"]), url: z.string().url() }),
  ),
  dataQualityFlags: z.array(z.string()),
  fieldSources: z.record(z.string(), z.unknown()),
  snapshotAt: z.string().nullable(),
  sourceHtmlPath: z.string().nullable(),
  firstPublishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  staffEditedAt: z.string().nullable(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
export type VehiclePricing = z.infer<typeof pricingSchema>;
export type VehicleImage = z.infer<typeof vehicleImageSchema>;

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: "Sedan",
  coupe: "Coupe",
  suv: "SUV",
  pickup: "Truck/Pickup",
  hatchback: "Hatchback",
  "passenger-van": "Minivan/Passenger Van",
  "cargo-van": "Cargo Van",
  convertible: "Convertible",
  other: "Other",
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  gasoline: "Gasoline",
  diesel: "Diesel",
  hybrid: "Hybrid",
  "plug-in-hybrid": "Plug-in Hybrid",
  electric: "Electric",
  "flex-fuel": "Flex Fuel",
};

export const DRIVETRAIN_LABELS: Record<Drivetrain, string> = {
  fwd: "Front-Wheel Drive",
  rwd: "Rear-Wheel Drive",
  awd: "All-Wheel Drive",
  "4wd": "Four-Wheel Drive",
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  automatic: "Automatic",
  manual: "Manual",
};

/** Public route id: original DealerSync id for imported vehicles, internal id otherwise. */
export function vehicleRouteId(v: Pick<Vehicle, "id" | "sourceId">): string {
  return v.sourceId ?? v.id;
}

export function vehicleDetailPath(v: Pick<Vehicle, "id" | "sourceId" | "slug">): string {
  return `/pre-owned-cars/detail/${v.slug}/${vehicleRouteId(v)}`;
}
