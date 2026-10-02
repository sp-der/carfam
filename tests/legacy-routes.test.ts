import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { filtersFromSearchParams } from "@/lib/inventory/filters";
import {
  LEGACY_PAGE_REDIRECTS,
  parseLegacyPriceRange,
  parseLegacySort,
  resolveInventoryRoute,
  resolveVehicleRoute,
  type InventoryRoute,
  type LegacyContext,
} from "@/lib/inventory/legacy-routes";
import { searchInventory } from "@/lib/inventory/search";
import { seedVehicles, vehicleBySource } from "./support/fixtures";

const ctx: LegacyContext = {
  knownMakes: [...new Set(seedVehicles.map((v) => v.make))],
  knownModels: seedVehicles.map((v) => ({ make: v.make, model: v.model })),
};

function resolve(url: string): InventoryRoute {
  const u = new URL(url, "https://demo.local");
  const segments = u.pathname.replace(/^\/pre-owned-cars\/?/, "").split("/").filter(Boolean);
  return resolveInventoryRoute(segments, u.searchParams, ctx);
}

describe("legacy filter paths redirect to clean query URLs", () => {
  it.each([
    ["/pre-owned-cars/filter/pricerange=0-15000", "/pre-owned-cars?priceMax=15000"],
    ["/pre-owned-cars/filter/bodytype/Passenger-Van", "/pre-owned-cars?body=passenger-van"],
    ["/pre-owned-cars/filter/bodytype/coupe", "/pre-owned-cars?body=coupe"],
    ["/pre-owned-cars/filter/make/Chevrolet/bodytype/SUV", "/pre-owned-cars?make=Chevrolet&body=suv"],
    ["/pre-owned-cars/filter/bodytype/Sedan/make/Toyota", "/pre-owned-cars?make=Toyota&body=sedan"],
    ["/pre-owned-cars/filter/bodytype/Coupe/sort/Year/dir/desc", "/pre-owned-cars?body=coupe&sort=year-desc"],
    ["/pre-owned-cars/filter/fuel/Plug-In-Electric-Gas", "/pre-owned-cars?fuel=plug-in-hybrid"],
    ["/pre-owned-cars?fuel=Electric%20Fuel%20System", "/pre-owned-cars?fuel=electric"],
    ["/pre-owned-cars?pricerange=0-15000", "/pre-owned-cars?priceMax=15000"],
    ["/pre-owned-cars?bodytype=Passenger%20Van&make=honda", "/pre-owned-cars?make=Honda&body=passenger-van"],
    ["/pre-owned-cars?bodytype=Coupe&sort=Year&dir=desc", "/pre-owned-cars?body=coupe&sort=year-desc"],
  ])("%s → %s", (from, to) => {
    expect(resolve(from)).toEqual({ kind: "redirect", location: to });
  });

  it("rejects malformed filter paths", () => {
    expect(resolve("/pre-owned-cars/filter").kind).toBe("not-found");
    expect(resolve("/pre-owned-cars/filter/bodytype").kind).toBe("not-found");
  });
});

describe("category paths render in place", () => {
  it.each([
    ["/pre-owned-cars/2019", { yearMin: 2019, yearMax: 2019 }],
    ["/pre-owned-cars/INFINITI", { make: ["INFINITI"] }],
    ["/pre-owned-cars/infiniti", { make: ["INFINITI"] }],
    ["/pre-owned-cars/2010/Toyota/FJ-Cruiser", { make: ["Toyota"], model: ["FJ Cruiser"], yearMin: 2010, yearMax: 2010 }],
    ["/pre-owned-cars/2016/Ram/1500", { make: ["Ram"], model: ["1500"], yearMin: 2016, yearMax: 2016 }],
    ["/pre-owned-cars/2018/Mercedes-Benz/CLA-250", { make: ["Mercedes-Benz"], model: ["CLA 250"], yearMin: 2018, yearMax: 2018 }],
  ])("%s", (url, filters) => {
    const route = resolve(url);
    expect(route.kind).toBe("inventory");
    if (route.kind === "inventory") expect(route.filters).toEqual(filters);
  });

  it("404s unknown makes and over-long paths instead of redirecting home", () => {
    expect(resolve("/pre-owned-cars/Bugatti").kind).toBe("not-found");
    expect(resolve("/pre-owned-cars/2019/Honda/Civic/Extra").kind).toBe("not-found");
  });

  it("recognises detail paths", () => {
    expect(resolve("/pre-owned-cars/detail/2019-Acura-RDX/1567362")).toEqual({
      kind: "detail",
      slug: "2019-Acura-RDX",
      id: "1567362",
    });
    expect(resolve("/pre-owned-cars/detail/2019-Acura-RDX").kind).toBe("not-found");
  });

  it("keeps simple page aliases", () => {
    expect(LEGACY_PAGE_REDIRECTS["/inventory"]).toBe("/pre-owned-cars");
    expect(LEGACY_PAGE_REDIRECTS["/searchused.aspx"]).toBe("/pre-owned-cars");
    expect(LEGACY_PAGE_REDIRECTS["/contactus.aspx"]).toBe("/contact-us");
  });
});

describe("every captured category URL from the recon package", () => {
  const categories = JSON.parse(
    readFileSync(path.join(process.cwd(), "carfam-recon", "data", "inventory_categories.json"), "utf8"),
  ) as { url: string; visible_vehicle_ids: string[] }[];

  it("covers all 272 captured category URLs", () => {
    expect(categories).toHaveLength(272);
  });

  it("resolves each one and shows the vehicles Carfam displayed there", () => {
    const failures: string[] = [];
    for (const category of categories) {
      const url = category.url.replace("https://www.carfam.com", "");
      if (url === "/inventory") continue; // simple alias, covered above
      let route = resolve(url);
      if (route.kind === "redirect") route = resolve(route.location);
      if (route.kind !== "inventory") {
        failures.push(`${url}: ${route.kind}`);
        continue;
      }
      const results = new Set(searchInventory(seedVehicles, { ...route.filters, page: 10 }).vehicles.map((v) => v.sourceId));
      const missing = category.visible_vehicle_ids.filter((id) => !results.has(id));
      if (missing.length) failures.push(`${url}: missing ${missing.join(", ")}`);
    }
    expect(failures).toEqual([]);
  });
});

describe("legacy value parsers", () => {
  it("parses price ranges", () => {
    expect(parseLegacyPriceRange("0-15000")).toEqual({ priceMax: 15000 });
    expect(parseLegacyPriceRange("10000-20000")).toEqual({ priceMin: 10000, priceMax: 20000 });
    expect(parseLegacyPriceRange("Under 10000")).toEqual({ priceMax: 10000 });
    expect(parseLegacyPriceRange("Over 70000")).toEqual({ priceMin: 70000 });
    expect(parseLegacyPriceRange("20000-10000")).toEqual({});
    expect(parseLegacyPriceRange("cheap")).toEqual({});
  });

  it("parses sorts and ignores the estimated-range sort (no data)", () => {
    expect(parseLegacySort("InternetPrice-asc")).toBe("price-asc");
    expect(parseLegacySort("Year", "desc")).toBe("year-desc");
    expect(parseLegacySort("Mileage-desc")).toBe("mileage-desc");
    expect(parseLegacySort("EstimatedRange-asc")).toBeUndefined();
  });

  it("clean query URLs pass straight through", () => {
    const route = resolve("/pre-owned-cars?make=Honda&priceMax=15000&sort=price-asc");
    expect(route).toEqual({
      kind: "inventory",
      filters: filtersFromSearchParams(new URLSearchParams("make=Honda&priceMax=15000&sort=price-asc")).filters,
      canonical: "/pre-owned-cars?make=Honda&priceMax=15000&sort=price-asc",
    });
  });
});

describe("vehicle detail routes", () => {
  const rdx = vehicleBySource("1567362");

  it("serves a published vehicle on its canonical slug", () => {
    expect(resolveVehicleRoute("2019-Acura-RDX", "1567362", rdx)).toEqual({ kind: "ok", vehicle: rdx });
  });

  it("redirects a wrong slug to the canonical one", () => {
    expect(resolveVehicleRoute("wrong-slug", "1567362", rdx)).toEqual({
      kind: "redirect",
      location: "/pre-owned-cars/detail/2019-Acura-RDX/1567362",
    });
  });

  it("shows pending vehicles", () => {
    expect(resolveVehicleRoute(rdx.slug, "1567362", { ...rdx, status: "pending" }).kind).toBe("ok");
  });

  it.each([
    ["sold", { status: "sold" as const }],
    ["archived", { publication: "archived" as const }],
    ["unpublished after being public", { publication: "draft" as const }],
  ])("returns the unavailable state when %s", (_label, patch) => {
    expect(resolveVehicleRoute(rdx.slug, "1567362", { ...rdx, ...patch }).kind).toBe("unavailable");
  });

  it("hides never-published drafts as 404", () => {
    expect(resolveVehicleRoute(rdx.slug, "x", { ...rdx, publication: "draft", firstPublishedAt: null }).kind).toBe(
      "not-found",
    );
  });

  it("returns unavailable for the Kia Carfam itself reported as 410 Gone, and 404 for unknown ids", () => {
    expect(resolveVehicleRoute("2022-Kia-Forte", "1505080", undefined)).toEqual({ kind: "unavailable", vehicle: null });
    expect(resolveVehicleRoute("2022-Kia-Forte", "999", undefined)).toEqual({ kind: "not-found" });
  });
});
