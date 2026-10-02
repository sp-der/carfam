import { feeSummary, formatPrice, SALE_PRICE_NOTE, salePriceCents } from "./pricing";
import type { SearchResult } from "./search";
import {
  BODY_TYPE_LABELS,
  FUEL_TYPE_LABELS,
  TRANSMISSION_LABELS,
  vehicleDetailPath,
  vehicleRouteId,
  type Vehicle,
} from "./types";

/**
 * Public projection of a vehicle for cards, Load More and chatbot results.
 * Internal fields (review flags, provenance paths, staff timestamps) never leave the server.
 */
export interface VehicleCard {
  id: string;
  routeId: string;
  href: string;
  title: string;
  tagline: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  bodyType: Vehicle["bodyType"];
  fuelType: Vehicle["fuelType"];
  drivetrain: Vehicle["drivetrain"];
  status: Vehicle["status"];
  featured: boolean;
  salePriceCents: number;
  salePriceLabel: string;
  internetPriceLabel: string;
  feeSummary: string;
  priceNote: string;
  /** null → render the site fallback image. */
  image: { src: string; alt: string } | null;
  photoCount: number;
}

export function toVehicleCard(v: Vehicle): VehicleCard {
  const sale = salePriceCents(v.pricing);
  const first = v.images[0];
  return {
    id: v.id,
    routeId: vehicleRouteId(v),
    href: vehicleDetailPath(v),
    title: v.title,
    tagline: v.tagline,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    mileage: v.mileage,
    bodyType: v.bodyType,
    fuelType: v.fuelType,
    drivetrain: v.drivetrain,
    status: v.status,
    featured: v.featured,
    salePriceCents: sale,
    salePriceLabel: formatPrice(sale),
    internetPriceLabel: formatPrice(v.pricing.internetPriceCents),
    feeSummary: feeSummary(v.pricing),
    priceNote: SALE_PRICE_NOTE,
    image: first ? { src: first.src, alt: first.alt } : null,
    photoCount: v.images.length,
  };
}

export function toPublicSearchResult(result: SearchResult) {
  return {
    filters: result.filters,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
    vehicles: result.vehicles.map(toVehicleCard),
    facets: result.facets,
  };
}

/** One labeled spec row. `value: null` renders as "Not listed", never a guess. */
export interface SpecRow {
  label: string;
  value: string | null;
}

/** Spec rows shared by the detail page and comparison table. */
export function vehicleSpecs(v: Vehicle): SpecRow[] {
  const mpg =
    v.mpgCity != null || v.mpgHighway != null
      ? `${v.mpgCity ?? "–"} city / ${v.mpgHighway ?? "–"} hwy`
      : null;
  return [
    { label: "Body style", value: v.bodyType ? BODY_TYPE_LABELS[v.bodyType] : null },
    { label: "Exterior color", value: v.exteriorColor },
    { label: "Interior color", value: v.interiorColor },
    { label: "Drivetrain", value: v.drivetrainLabel },
    { label: "Engine", value: v.engine },
    { label: "Horsepower", value: v.horsepower },
    { label: "Torque", value: v.torque },
    { label: "Transmission", value: v.transmission ? TRANSMISSION_LABELS[v.transmission] : null },
    { label: "Fuel", value: v.fuelType ? FUEL_TYPE_LABELS[v.fuelType] : null },
    { label: "MPG", value: mpg },
    { label: "Style", value: v.style },
  ];
}

/** Card plus specs and identifiers, for saved vehicles and comparison. */
export interface VehicleSummary extends VehicleCard {
  stockNumber: string;
  vin: string;
  specs: SpecRow[];
}

export function toVehicleSummary(v: Vehicle): VehicleSummary {
  return { ...toVehicleCard(v), stockNumber: v.stockNumber, vin: v.vin, specs: vehicleSpecs(v) };
}

export interface PublicPackage {
  name: string;
  msrpLabel: string | null;
  included: boolean;
}

/**
 * Packages for public display. Exact duplicate rows (e.g. the Acura RDX paint option listed twice)
 * are shown once; review flags stay internal, and no "total added value" is computed.
 */
export function publicPackages(v: Pick<Vehicle, "packages">): PublicPackage[] {
  const seen = new Set<string>();
  const out: PublicPackage[] = [];
  for (const p of v.packages) {
    const key = `${p.name.toLowerCase()}|${p.msrpCents ?? ""}|${p.included}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: p.name, msrpLabel: p.msrpCents != null ? formatPrice(p.msrpCents) : null, included: p.included });
  }
  return out;
}
