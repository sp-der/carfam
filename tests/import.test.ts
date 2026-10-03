import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeed, extractVdp } from "../scripts/import-recon";
import { vehicleSchema } from "@/lib/inventory/types";
import { searchInventory, selectFeaturedVehicles } from "@/lib/inventory/search";
import { seed, seedVehicles, vehicleBySource } from "./support/fixtures";

const ROOT = process.cwd();

describe("recon import", () => {
  it("seeds exactly the eight approved picks in homepage and recommended order", () => {
    const ids = ["1573124", "1581603", "1512247", "1545135", "1581604", "1570774", "1574790", "1592525"];
    expect(seedVehicles.filter((v) => v.featured)).toHaveLength(8);
    expect(selectFeaturedVehicles(seedVehicles, 8).map((v) => v.sourceId)).toEqual(ids);
    expect(searchInventory(seedVehicles, {}).vehicles.slice(0, 8).map((v) => v.sourceId)).toEqual(ids);
    ids.forEach((id, i) => expect(vehicleBySource(id).featuredRank).toBe(i + 1));
  });
  it("is deterministic and matches the committed seed", () => {
    const first = buildSeed();
    const second = buildSeed();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    const committed = JSON.parse(readFileSync(path.join(ROOT, "data", "seed", "inventory.seed.json"), "utf8"));
    expect(committed).toEqual(first);
  });

  it("imports all 127 vehicles with valid, unique records", () => {
    expect(seedVehicles).toHaveLength(127);
    for (const v of seedVehicles) vehicleSchema.parse(v);
    expect(new Set(seedVehicles.map((v) => v.sourceId)).size).toBe(127);
    expect(new Set(seedVehicles.map((v) => v.vin)).size).toBe(127);
    expect(new Set(seedVehicles.map((v) => v.stockNumber.toLowerCase())).size).toBe(127);
    expect(seedVehicles.every((v) => v.publication === "published" && v.status === "available")).toBe(true);
    expect(seedVehicles.every((v) => v.staffEditedAt === null)).toBe(true);
  });

  it("recovers VDP content that inventory.json leaves empty", () => {
    expect(seedVehicles.filter((v) => v.description).length).toBe(125);
    expect(seedVehicles.filter((v) => v.packages.length).length).toBe(124);
    expect(seedVehicles.filter((v) => v.highlights.length).length).toBe(23);
    expect(seedVehicles.filter((v) => v.tagline).length).toBe(127);
    expect(seedVehicles.every((v) => v.equipment.exterior.length + v.equipment.interior.length + v.equipment.safety.length > 0)).toBe(true);
  });

  it("flags the duplicate Acura package instead of trusting it", () => {
    const rdx = vehicleBySource("1567362");
    expect(rdx.packages).toHaveLength(2);
    expect(rdx.packages.every((p) => p.name === "MAJESTIC BLACK PEARL" && p.msrpCents === 40_000 && p.reviewFlag)).toBe(true);
    expect(rdx.dataQualityFlags).toContain("Duplicate package/option rows in the source.");
  });

  it("keeps unknowns null and flags owner-review conflicts", () => {
    expect(vehicleBySource("1545135").bodyType).toBeNull();
    expect(vehicleBySource("1540740").fuelType).toBeNull();
    expect(vehicleBySource("1577686").fuelType).toBeNull();
    expect(vehicleBySource("1530885").dataQualityFlags.join(" ")).toMatch(/Coupe filter/);
    const historyFlagged = seedVehicles.filter((v) => v.dataQualityFlags.some((f) => f.includes("vehicle history")));
    expect(historyFlagged.length).toBe(13);
  });

  it("uses Carfam's own filter pages as per-vehicle evidence", () => {
    const fusion = vehicleBySource("1590746");
    expect(fusion.fuelType).toBe("plug-in-hybrid");
    expect(fusion.fieldSources.fuelType).toMatchObject({ url: expect.stringContaining("Plug-In-Electric-Gas") });
    expect(fusion.dataQualityFlags.join(" ")).toMatch(/record said hybrid/);
    // Only the Fusion changes; no other record conflicts with those pages.
    expect(seedVehicles.filter((v) => v.dataQualityFlags.some((f) => f.includes("filter page"))).map((v) => v.sourceId)).toEqual(["1590746"]);
  });

  it("normalizes source label variants", () => {
    const bodies = new Set(seedVehicles.map((v) => v.bodyType));
    expect([...bodies].sort()).toEqual(
      ["cargo-van", "convertible", "coupe", "hatchback", "passenger-van", "pickup", "sedan", "suv", null].sort(),
    );
    expect(seedVehicles.filter((v) => v.fuelType === "gasoline")).toHaveLength(101);
    expect(seedVehicles.filter((v) => v.fuelType === "electric")).toHaveLength(3);
    expect(seedVehicles.filter((v) => v.fuelType === "hybrid")).toHaveLength(6);
  });

  it("never points the site at Carfam's photo server", () => {
    for (const v of seedVehicles) {
      for (const img of v.images) {
        expect(img.src.startsWith(`/vehicles/${v.sourceId}/`)).toBe(true);
        expect(img.src).not.toMatch(/dealersync|^https?:/);
      }
    }
  });

  it("extracts fields from VDP HTML", () => {
    const html = `
      <div id="ds-vdp-vehicle-title-container"><h1>2015 Acura RDX</h1><h3 class="ds-vdp-vehicle-sub-title"> WHITE  PEARL </h3></div>
      <div id="ds-vdp-packages"><div class="ds-vdp-features-container">
        <div class="ds-vdp-feature-row"><div><h5>Tech Pkg</h5></div><div><span class="value">$1,250</span></div></div>
        <div class="ds-vdp-feature-row"><div><h5>Leather</h5></div><div><span class="value">Included</span></div></div>
      </div></div>
      <div id="ds-vdp-description">Line one.<br/>Line two.</div>
      <div id="ds-vdp-spec-safety-pane"><div class="ds-vdp-feature-row"><div><div>Back-Up Camera</div></div><div><i></i></div></div>
        <div class="ds-vdp-feature-row"><div><div>Back-Up Camera</div></div></div></div>`;
    const out = extractVdp(html);
    expect(out.tagline).toBe("WHITE PEARL");
    expect(out.packages).toEqual([
      { name: "Tech Pkg", msrpCents: 125_000, included: false, reviewFlag: null },
      { name: "Leather", msrpCents: null, included: true, reviewFlag: null },
    ]);
    expect(out.description).toBe("Line one.\nLine two.");
    expect(out.equipment.safety).toEqual(["Back-Up Camera"]);
    expect(out.highlights).toEqual([]);
  });
});

describe("synthetic demo seed", () => {
  it("is labeled synthetic and references real seed vehicles", () => {
    const ids = new Set(seedVehicles.map((v) => v.id));
    const staff = new Set(seed.staff.map((s) => s.id));
    for (const lead of seed.leads) {
      expect(lead.isSynthetic).toBe(true);
      expect(lead.email).toMatch(/@example\.com$/);
      if (lead.vehicleId) {
        expect(ids.has(lead.vehicleId)).toBe(true);
        const v = seedVehicles.find((x) => x.id === lead.vehicleId)!;
        expect(lead.vehicleTitle).toBe(v.title);
        expect(lead.sourcePath).toBe(`/pre-owned-cars/detail/${v.slug}/${v.sourceId}`);
      }
      if (lead.assignedTo) expect(staff.has(lead.assignedTo)).toBe(true);
    }
  });
});
