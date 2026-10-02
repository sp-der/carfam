import { feeSummary, formatPrice, SALE_PRICE_NOTE, salePriceCents } from "./pricing";
import type { SearchResult } from "./search";
import { vehicleDetailPath, vehicleRouteId, type Vehicle } from "./types";

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
