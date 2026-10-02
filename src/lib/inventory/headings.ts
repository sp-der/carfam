import { compactFilters, type InventoryFilters } from "./filters";
import type { BodyType } from "./types";

const BODY_PLURAL: Record<BodyType, string> = {
  sedan: "sedans",
  coupe: "coupes",
  suv: "SUVs",
  pickup: "trucks",
  hatchback: "hatchbacks",
  "passenger-van": "minivans",
  "cargo-van": "cargo vans",
  convertible: "convertibles",
  other: "vehicles",
};

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * Inventory page heading from make/model/year/body filters, e.g. "Used Lexus SUVs",
 * "Used 2020 Honda Accord", "Used cars, trucks and SUVs". Other filters show as chips instead.
 */
export function inventoryHeading(raw: InventoryFilters): string {
  const f = compactFilters(raw);
  const year = f.yearMin != null && f.yearMin === f.yearMax ? String(f.yearMin) : null;
  const makes = f.make ?? [];
  const models = makes.length <= 1 ? (f.model ?? []) : [];
  const bodies = (f.body ?? []).map((b) => BODY_PLURAL[b]);

  const subject = [year, joinWords(makes), joinWords(models)].filter(Boolean).join(" ");
  if (!subject && !bodies.length) return "Used cars, trucks and SUVs";
  const noun = bodies.length ? joinWords(bodies) : models.length ? "" : "vehicles";
  return `Used ${[subject, noun].filter(Boolean).join(" ")}`;
}
