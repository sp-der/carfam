import { describe, expect, it } from "vitest";
import {
  applyFilterPatch,
  describeFilters,
  filterPatchSchema,
  filtersFromSearchParams,
  filtersToSearchParams,
  FilterValidationError,
  inventoryHref,
  removeChip,
  validateFilters,
  type InventoryFilters,
} from "@/lib/inventory/filters";

describe("URL parsing", () => {
  it("parses repeated and comma-separated list values and numbers", () => {
    const { filters, dropped } = filtersFromSearchParams(
      new URLSearchParams("make=Honda&make=Toyota&body=suv,pickup&priceMax=15,000&sort=price-asc&page=2"),
    );
    expect(filters).toEqual({
      make: ["Honda", "Toyota"],
      body: ["suv", "pickup"],
      priceMax: 15000,
      sort: "price-asc",
      page: 2,
    });
    expect(dropped).toEqual([]);
  });

  it("drops invalid values without discarding valid ones", () => {
    const { filters, dropped } = filtersFromSearchParams(
      new URLSearchParams("body=suv&body=spaceship&priceMax=cheap&yearMin=2020&sort=bogus&make=Lexus"),
    );
    expect(filters).toEqual({ body: ["suv"], yearMin: 2020, make: ["Lexus"] });
    expect(dropped).toEqual(expect.arrayContaining(["body", "priceMax", "sort"]));
  });

  it("drops contradictory ranges", () => {
    const { filters } = filtersFromSearchParams(new URLSearchParams("priceMin=20000&priceMax=15000"));
    expect(filters.priceMin).toBeUndefined();
    expect(filters.priceMax).toBe(15000);
  });

  it("serializes canonically and round-trips", () => {
    const filters: InventoryFilters = { priceMax: 15000, make: ["Honda"], sort: "recommended", page: 1 };
    expect(inventoryHref(filters)).toBe("/pre-owned-cars?make=Honda&priceMax=15000");
    expect(inventoryHref({})).toBe("/pre-owned-cars");
    const round = filtersFromSearchParams(filtersToSearchParams({ make: ["Honda"], body: ["suv"], q: "awd" })).filters;
    expect(round).toEqual({ make: ["Honda"], body: ["suv"], q: "awd" });
  });

  it("rejects unknown keys in strict validation (chatbot tool arguments)", () => {
    expect(validateFilters({ make: ["Honda"], url: "https://evil.example" }).ok).toBe(false);
    expect(validateFilters({ priceMax: -1 }).ok).toBe(false);
  });
});

describe("filter patches (shared by chips and the chatbot)", () => {
  it("runs the spec's conversation sequence", () => {
    // "Show me Hondas under $15k"
    let f = applyFilterPatch({}, { mode: "replace", set: { make: ["Honda"], priceMax: 15000 } });
    expect(f).toEqual({ make: ["Honda"], priceMax: 15000 });

    // "Show me Lexuses" (new search)
    f = applyFilterPatch(f, { mode: "replace", set: { make: ["Lexus"] } });
    expect(f).toEqual({ make: ["Lexus"] });

    // "Only SUVs" keeps Lexus, adds SUV
    f = applyFilterPatch(f, { mode: "merge", set: { body: ["suv"] } });
    expect(f).toEqual({ make: ["Lexus"], body: ["suv"] });

    // "Under $15k", then "Actually under $20k" replaces the limit
    f = applyFilterPatch(f, { mode: "merge", set: { priceMax: 15000 } });
    f = applyFilterPatch(f, { mode: "merge", set: { priceMax: 20000 } });
    expect(f).toEqual({ make: ["Lexus"], body: ["suv"], priceMax: 20000 });

    // "Clear everything"
    expect(applyFilterPatch(f, { mode: "clear" })).toEqual({});
  });

  it("adds to lists, removes keys and resets the page", () => {
    const f = applyFilterPatch(
      { make: ["Honda"], page: 3, sort: "price-asc" },
      { mode: "merge", add: { make: ["Toyota", "honda"] }, remove: ["sort"] },
    );
    expect(f).toEqual({ make: ["Honda", "Toyota"] });
  });

  it("validates patches and the merged result", () => {
    expect(filterPatchSchema.safeParse({ mode: "merge", set: { navigate: "/admin" } }).success).toBe(false);
    expect(() => applyFilterPatch({ priceMin: 30000 }, { mode: "merge", set: { priceMax: 20000 } })).toThrow(
      FilterValidationError,
    );
  });
});

describe("chips", () => {
  it("describes filters with the sale-price wording", () => {
    const chips = describeFilters({ make: ["Honda"], body: ["suv"], priceMax: 15000, yearMin: 2019, yearMax: 2019 });
    expect(chips.map((c) => c.label)).toEqual(["Honda", "SUV", "Sale price under $15,000", "2019"]);
  });

  it("removes one value from a list or the whole scalar", () => {
    const f: InventoryFilters = { make: ["Honda", "Toyota"], priceMax: 15000, page: 2 };
    expect(removeChip(f, { key: "make", value: "Honda", label: "Honda" })).toEqual({ make: ["Toyota"], priceMax: 15000 });
    expect(removeChip(f, { key: "priceMax", label: "" })).toEqual({ make: ["Honda", "Toyota"] });
    expect(removeChip({ yearMin: 2019, yearMax: 2019 }, { key: "yearMin", label: "2019" })).toEqual({});
  });
});
