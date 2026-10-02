import type { BodyType, Drivetrain, FuelType, Transmission } from "./types";

/** Lowercase, collapse every non-alphanumeric run to "-". "4 Series" and "4-Series" both become "4-series". */
export function slugKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Original-site style vehicle slug, e.g. "2020-Cadillac-XT5". */
export function vehicleSlug(year: number, make: string, model: string): string {
  return `${year}-${make}-${model}`
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const BODY_ALIASES: Record<string, BodyType> = {
  sedan: "sedan",
  coupe: "coupe",
  suv: "suv",
  pickup: "pickup",
  truck: "pickup",
  hatchback: "hatchback",
  "passenger-van": "passenger-van",
  minivan: "passenger-van",
  "cargo-van": "cargo-van",
  convertible: "convertible",
  other: "other",
};

/** Maps source body labels ("Passenger-Van", "Cargo Van", "suv", …). Unknown input → null, never a guess. */
export function normalizeBodyType(raw: string | null | undefined): BodyType | null {
  if (!raw) return null;
  return BODY_ALIASES[slugKey(raw)] ?? null;
}

const FUEL_ALIASES: Record<string, FuelType> = {
  gasoline: "gasoline",
  "gasoline-fuel": "gasoline",
  gas: "gasoline",
  diesel: "diesel",
  "diesel-fuel": "diesel",
  hybrid: "hybrid",
  "gas-electric-hybrid": "hybrid",
  "plug-in-electric-gas": "plug-in-hybrid",
  "plug-in-hybrid": "plug-in-hybrid",
  electric: "electric",
  "electric-fuel-system": "electric",
  "flex-fuel-capability": "flex-fuel",
  "flex-fuel": "flex-fuel",
};

export function normalizeFuelType(raw: string | null | undefined): FuelType | null {
  if (!raw) return null;
  return FUEL_ALIASES[slugKey(raw)] ?? null;
}

export function normalizeDrivetrain(raw: string | null | undefined): Drivetrain | null {
  if (!raw) return null;
  const key = slugKey(raw);
  if (key.startsWith("front-wheel") || key === "fwd") return "fwd";
  if (key.startsWith("rear-wheel") || key === "rwd") return "rwd";
  if (key.startsWith("all-wheel") || key === "awd") return "awd";
  if (key.startsWith("four-wheel") || key === "4wd" || key === "4x4") return "4wd";
  return null;
}

export function normalizeTransmission(raw: string | null | undefined): Transmission | null {
  if (!raw) return null;
  const key = slugKey(raw);
  if (key.startsWith("automatic")) return "automatic";
  if (key.startsWith("manual")) return "manual";
  return null;
}

/** Collapse whitespace; empty → null. */
export function cleanText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned === "" ? null : cleaned;
}
