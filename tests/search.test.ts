import { describe, expect, it } from "vitest";
import { salePriceCents } from "@/lib/inventory/pricing";
import { isShoppable, PAGE_SIZE, searchInventory, similarVehicles } from "@/lib/inventory/search";
import type { Vehicle } from "@/lib/inventory/types";
import { seedVehicles, vehicleBySource } from "./support/fixtures";

const titles = (vs: Vehicle[]) => vs.map((v) => v.title).sort();

describe("search over the recon snapshot", () => {
  it("returns all 127 shoppable vehicles with no filters", () => {
    const r = searchInventory(seedVehicles, {});
    expect(r.total).toBe(127);
    expect(r.vehicles).toHaveLength(PAGE_SIZE);
    expect(r.hasMore).toBe(true);
  });

  it("Hondas under $15k: Honda and sale price strictly below $15,000", () => {
    const r = searchInventory(seedVehicles, { make: ["Honda"], priceMax: 15000 });
    expect(titles(r.vehicles)).toEqual(["2013 Honda Accord Sedan LX"]);
    // 2016 Odyssey: internet $15,777 / sale $15,912 → excluded.
    expect(r.vehicles.some((v) => v.sourceId === "1573576" || v.model === "Odyssey")).toBe(false);
  });

  it("budget is on sale price (fees included), and the bound is strict", () => {
    const accord = vehicleBySource("1581060"); // sale $10,134, internet $9,999
    expect(searchInventory([accord], { priceMax: 10134 }).total).toBe(0);
    expect(searchInventory([accord], { priceMax: 10135 }).total).toBe(1);
    // Internet price alone is under $10,000 but the sale price is not.
    expect(searchInventory([accord], { priceMax: 10000 }).total).toBe(0);
  });

  it("matches Carfam's own price-range facet counts (sale price buckets)", () => {
    const count = (priceMin: number | undefined, priceMax: number | undefined) =>
      searchInventory(seedVehicles, { priceMin, priceMax }).total;
    expect(count(undefined, 10000)).toBe(8);
    expect(count(10000, 20000)).toBe(47);
    expect(count(20000, 30000)).toBe(53);
    expect(count(30000, 40000)).toBe(11);
    expect(count(40000, 50000)).toBe(6);
    expect(count(70000, undefined)).toBe(1);
  });

  it("Lexus, then only SUVs", () => {
    expect(searchInventory(seedVehicles, { make: ["Lexus"] }).total).toBe(8);
    expect(titles(searchInventory(seedVehicles, { make: ["lexus"], body: ["suv"] }).vehicles)).toEqual([
      "2013 Lexus RX 350",
      "2019 Lexus GX 460 4WD",
      "2020 Lexus UX 250h F SPORT AWD",
    ]);
  });

  it("returns an honest empty result", () => {
    const r = searchInventory(seedVehicles, { make: ["Honda"], body: ["suv"], priceMax: 15000 });
    expect(r.total).toBe(0);
    expect(r.vehicles).toEqual([]);
    // Facets ignore their own dimension, so the UI/chatbot can suggest relaxations.
    expect(r.facets.make.find((m) => m.value === "Honda")).toBeUndefined();
    // Dropping the body filter leaves one Honda sedan under $15k; dropping make leaves SUVs.
    expect(r.facets.body).toEqual([{ value: "sedan", label: "Sedan", count: 1 }]);
    expect(r.facets.make.length).toBeGreaterThan(0);
  });

  it("keyword search tolerates plurals and matches stock/VIN", () => {
    expect(searchInventory(seedVehicles, { q: "hondas" }).total).toBe(7);
    const xt5 = vehicleBySource("1449827");
    expect(searchInventory(seedVehicles, { q: xt5.vin.toLowerCase() }).vehicles.map((v) => v.id)).toEqual([xt5.id]);
    expect(searchInventory(seedVehicles, { q: "tesla model x" }).total).toBe(1);
  });

  it("never guesses unknown body or fuel types", () => {
    const model3 = vehicleBySource("1545135");
    expect(model3.bodyType).toBeNull();
    for (const body of ["sedan", "suv", "coupe", "hatchback"] as const) {
      expect(searchInventory([model3], { body: [body] }).total).toBe(0);
    }
    expect(searchInventory(seedVehicles, {}).facets.unknown).toEqual({ body: 1, fuel: 2, hwyMpg: 14 });
  });

  it("sorts price by sale price and paginates cumulatively", () => {
    const asc = searchInventory(seedVehicles, { sort: "price-asc", page: 2 });
    expect(asc.vehicles).toHaveLength(PAGE_SIZE * 2);
    const prices = asc.vehicles.map((v) => salePriceCents(v.pricing));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices[0]).toBe(791_200);
    const last = searchInventory(seedVehicles, { page: 6 });
    expect(last.vehicles).toHaveLength(127);
    expect(last.hasMore).toBe(false);
  });

  it("puts featured vehicles first in the recommended order", () => {
    const accord = { ...vehicleBySource("1581060"), featured: true, featuredRank: 1 };
    const others = seedVehicles.filter((v) => v.id !== accord.id);
    expect(searchInventory([...others, accord], {}).vehicles[0].id).toBe(accord.id);
  });
});

describe("shopping visibility", () => {
  const base = vehicleBySource("1449827");
  const variants: [string, Partial<Vehicle>, boolean][] = [
    ["available + published", {}, true],
    ["pending + published", { status: "pending" }, true],
    ["sold", { status: "sold" }, false],
    ["archived", { publication: "archived" }, false],
    ["draft", { publication: "draft" }, false],
  ];
  it.each(variants)("%s", (_label, patch, expected) => {
    const v = { ...base, ...patch };
    expect(isShoppable(v)).toBe(expected);
    expect(searchInventory([v], {}).total).toBe(expected ? 1 : 0);
    expect(searchInventory([v], {}, { shoppingOnly: false }).total).toBe(1);
  });
});

describe("similar vehicles", () => {
  it("prefers the same body type and excludes the vehicle itself and unshoppable ones", () => {
    const target = vehicleBySource("1567362");
    const sold = { ...vehicleBySource("1502496"), status: "sold" as const };
    const pool = seedVehicles.map((v) => (v.id === sold.id ? sold : v));
    const similar = similarVehicles(pool, target);
    expect(similar).toHaveLength(4);
    expect(similar.every((v) => v.bodyType === "suv" && v.id !== target.id && v.id !== sold.id)).toBe(true);
  });
});

describe("public card projection", () => {
  it("exposes the sale price with its fee label and no internal fields", async () => {
    const { toVehicleCard } = await import("@/lib/inventory/public");
    const card = toVehicleCard(vehicleBySource("1449827"));
    expect(card).toMatchObject({
      href: "/pre-owned-cars/detail/2020-Cadillac-XT5/1449827",
      salePriceCents: 2_013_400,
      salePriceLabel: "$20,134",
      feeSummary: "Includes $85 doc + $50 smog fees",
    });
    expect(Object.keys(card)).not.toEqual(
      expect.arrayContaining(["dataQualityFlags", "sourceHtmlPath", "staffEditedAt", "pricing", "vin"]),
    );
    for (const key of ["dataQualityFlags", "sourceHtmlPath", "staffEditedAt", "fieldSources"]) {
      expect(card).not.toHaveProperty(key);
    }
  });
});
