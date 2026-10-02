import { describe, expect, it } from "vitest";
import { inventoryHeading } from "@/lib/inventory/headings";
import { salePriceCents } from "@/lib/inventory/pricing";
import { publicPackages, toVehicleCard, toVehicleSummary } from "@/lib/inventory/public";
import { searchInventory, suggestRelaxations } from "@/lib/inventory/search";
import { getShoppableByRouteIds } from "@/lib/services/inventory-service";
import { seedVehicles, tempStore, vehicleBySource } from "./support/fixtures";

describe("public projections (Phase 2 UI)", () => {
  it("cards carry the sale price with its internet price and fee label, from one pricing source", () => {
    const v = vehicleBySource("1567362"); // 2019 Acura RDX: $18,275 + $85 + $50
    const card = toVehicleCard(v);
    expect(card.salePriceCents).toBe(salePriceCents(v.pricing));
    expect(card.salePriceLabel).toBe("$18,410");
    expect(card.internetPriceLabel).toBe("$18,275");
    expect(card.feeSummary).toBe("Includes $85 doc + $50 smog fees");
  });

  it("never exposes review flags, provenance or staff fields", () => {
    const summary = toVehicleSummary(vehicleBySource("1567362")) as unknown as Record<string, unknown>;
    for (const key of ["dataQualityFlags", "fieldSources", "sourceHtmlPath", "staffEditedAt", "packages", "pricing"]) {
      expect(summary).not.toHaveProperty(key);
    }
    expect(JSON.stringify(summary)).not.toContain("Confirm with the dealer");
  });

  it("shows exact duplicate packages once, without review flags or an added-value total", () => {
    const v = vehicleBySource("1567362");
    expect(v.packages).toHaveLength(2);
    const pkgs = publicPackages(v);
    expect(pkgs).toEqual([{ name: "MAJESTIC BLACK PEARL", msrpLabel: "$400", included: false }]);
  });

  it("spec rows keep unknown values as null (rendered as 'Not listed'), never guessed", () => {
    const tesla = vehicleBySource("1545135"); // body type unknown in the source
    const body = toVehicleSummary(tesla).specs.find((s) => s.label === "Body style");
    expect(body?.value).toBeNull();
  });
});

describe("inventory headings", () => {
  it.each([
    [{}, "Used cars, trucks and SUVs"],
    [{ make: ["Lexus"], body: ["suv" as const] }, "Used Lexus SUVs"],
    [{ make: ["Honda"] }, "Used Honda vehicles"],
    [{ yearMin: 2020, yearMax: 2020, make: ["Honda"], model: ["Accord"] }, "Used 2020 Honda Accord"],
    [{ body: ["pickup" as const, "suv" as const] }, "Used trucks and SUVs"],
    [{ make: ["BMW", "Lexus"], model: ["IS 250"] }, "Used BMW and Lexus vehicles"],
  ])("%j → %s", (filters, heading) => {
    expect(inventoryHeading(filters)).toBe(heading);
  });
});

describe("no-results suggestions", () => {
  it("offers one-filter relaxations with real counts and never relaxes the budget on its own", () => {
    const filters = { make: ["Honda"], priceMax: 9000 };
    expect(searchInventory(seedVehicles, filters).total).toBe(0);
    const suggestions = suggestRelaxations(seedVehicles, filters);
    const removeBudget = suggestions.find((s) => s.chip.key === "priceMax");
    const removeMake = suggestions.find((s) => s.chip.key === "make");
    expect(removeBudget?.count).toBe(searchInventory(seedVehicles, { make: ["Honda"] }).total);
    expect(removeMake?.count).toBe(searchInventory(seedVehicles, { priceMax: 9000 }).total);
    // Each suggestion removes exactly one chip and keeps the rest.
    expect(removeBudget?.filters).toEqual({ make: ["Honda"] });
  });

  it("drops suggestions that would still return nothing", () => {
    const suggestions = suggestRelaxations(seedVehicles, { priceMax: 1000, make: ["Honda"] });
    expect(suggestions.every((s) => s.count > 0)).toBe(true);
    expect(suggestions.find((s) => s.chip.key === "make")).toBeUndefined();
  });
});

describe("saved vehicles / comparison lookup", () => {
  it("returns shoppable vehicles in request order and reports unavailable ids", async () => {
    const { store } = tempStore();
    const sold = vehicleBySource("1485865");
    const stored = (await store.getVehicleByRouteId("1485865"))!;
    await store.replaceVehicle({ ...stored, status: "sold" });
    const result = await getShoppableByRouteIds(store, ["1567362", "1485865", "nope", "1489060"]);
    expect(result.vehicles.map((v) => v.sourceId)).toEqual(["1567362", "1489060"]);
    expect(result.unavailable).toEqual([sold.sourceId, "nope"]);
  });
});
