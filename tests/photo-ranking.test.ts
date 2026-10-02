import { describe, expect, it } from "vitest";
import {
  hasPhotos,
  preferPhotographed,
  searchInventory,
  selectFeaturedVehicles,
  similarVehicles,
} from "@/lib/inventory/search";
import { updateVehicle, ValidationError } from "@/lib/services/inventory-service";
import { manager, seedVehicles, tempStore, vehicleBySource } from "./support/fixtures";

/**
 * Rule (CLAUDE.md): vehicles without photos stay in inventory but rank last in "recommended",
 * and are never used on the homepage, in featured slots, or as the chatbot's top results
 * when a comparable vehicle with photos exists.
 */

const withoutPhotos = seedVehicles.filter((v) => !hasPhotos(v));

describe("vehicles without photos", () => {
  it("snapshot has 101 vehicles with copied photos and 26 without", () => {
    expect(seedVehicles.filter(hasPhotos)).toHaveLength(101);
    expect(withoutPhotos).toHaveLength(26);
    for (const v of seedVehicles.filter(hasPhotos)) {
      expect(v.images.length).toBeGreaterThan(0);
      expect(v.images.length).toBeLessThanOrEqual(6);
    }
  });

  it("stay in inventory but rank last in the recommended sort", () => {
    const r = searchInventory(seedVehicles, { page: 10 });
    expect(r.total).toBe(127);
    const firstWithout = r.vehicles.findIndex((v) => !hasPhotos(v));
    expect(firstWithout).toBe(101);
    expect(r.vehicles.slice(firstWithout).every((v) => !hasPhotos(v))).toBe(true);
  });

  it("rank last even when staff featured them", () => {
    const noPhoto = { ...vehicleBySource("1595132"), featured: true, featuredRank: 1 }; // Lexus GX, no photos
    const pool = seedVehicles.map((v) => (v.id === noPhoto.id ? noPhoto : v));
    const r = searchInventory(pool, { make: ["Lexus"] });
    expect(r.vehicles.at(-1)!.id).toBe(noPhoto.id);
  });

  it("explicit sorts (e.g. price) still include them in place", () => {
    const r = searchInventory(seedVehicles, { make: ["Honda"], sort: "price-asc" });
    expect(r.vehicles[0].sourceId).toBe("1581060"); // cheapest Honda, no photos
  });

  it("are never selected for homepage/featured slots", () => {
    const pool = seedVehicles.map((v) => (hasPhotos(v) ? v : { ...v, featured: true, featuredRank: 1 }));
    const picked = selectFeaturedVehicles(pool, 8);
    expect(picked).toHaveLength(8);
    expect(picked.every(hasPhotos)).toBe(true);
    expect(selectFeaturedVehicles(withoutPhotos, 8)).toEqual([]);
  });

  it("featured selection honours staff picks, then mixes body types", () => {
    const rdx = { ...vehicleBySource("1567362"), featured: true, featuredRank: 1 };
    const pool = seedVehicles.map((v) => (v.id === rdx.id ? rdx : v));
    const picked = selectFeaturedVehicles(pool, 8);
    expect(picked[0].id).toBe(rdx.id);
    expect(new Set(picked.map((v) => v.bodyType)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(picked.map((v) => v.id)).size).toBe(8);
  });

  it("automatic homepage fill skips cargo and passenger vans; staff can still feature one", () => {
    const auto = selectFeaturedVehicles(seedVehicles, 8);
    expect(auto).toHaveLength(8);
    expect(auto.some((v) => v.bodyType === "cargo-van" || v.bodyType === "passenger-van")).toBe(false);

    const odyssey = { ...vehicleBySource("1573576"), featured: true, featuredRank: 1 }; // passenger van
    const pool = seedVehicles.map((v) => (v.id === odyssey.id ? odyssey : v));
    const picked = selectFeaturedVehicles(pool, 8);
    expect(picked[0].id).toBe(odyssey.id);
    expect(picked.slice(1).some((v) => v.bodyType === "cargo-van" || v.bodyType === "passenger-van")).toBe(false);
  });

  it("are not the chatbot's top results when a comparable vehicle with photos exists", () => {
    // Highest-price-first Lexus SUVs would put the no-photo GX 460 first; it must not lead.
    const lexusSuvs = searchInventory(seedVehicles, { make: ["Lexus"], body: ["suv"], sort: "price-desc" }).vehicles;
    expect(lexusSuvs.some((v) => !hasPhotos(v))).toBe(true);
    const top = preferPhotographed(lexusSuvs);
    expect(hasPhotos(top[0])).toBe(true);
    expect(top.slice(0, top.filter(hasPhotos).length).every(hasPhotos)).toBe(true);
    expect(top).toHaveLength(lexusSuvs.length); // still listed, just later
  });

  it("are still shown honestly when nothing comparable has photos", () => {
    // "Hondas under $15k": the only match (2013 Accord) has no photos.
    const r = searchInventory(seedVehicles, { make: ["Honda"], priceMax: 15000 });
    expect(preferPhotographed(r.vehicles).map((v) => v.sourceId)).toEqual(["1581060"]);
  });

  it("are deprioritized in similar-vehicle suggestions", () => {
    const similar = similarVehicles(seedVehicles, vehicleBySource("1592842"), 4); // Highlander, no photos
    expect(similar.every(hasPhotos)).toBe(true);
  });

  it("cannot be featured by staff, and lose featured status when photos are removed", async () => {
    const { store } = tempStore();
    const accord = (await store.getVehicleByRouteId("1581060"))!;
    await expect(updateVehicle(store, manager, accord.id, { featured: true })).rejects.toBeInstanceOf(ValidationError);

    const rdx = (await store.getVehicleByRouteId("1567362"))!;
    await updateVehicle(store, manager, rdx.id, { featured: true, featuredRank: 2 });
    const cleared = await updateVehicle(store, manager, rdx.id, { images: [] });
    expect(cleared).toMatchObject({ featured: false, featuredRank: null });
  });
});
