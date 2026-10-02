import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadBundledSeed } from "@/lib/data";
import { JsonFileStore, type SeedData } from "@/lib/data/json-store";
import type { Vehicle } from "@/lib/inventory/types";
import type { Actor } from "@/lib/auth/permissions";

export const seed: SeedData = loadBundledSeed();
export const seedVehicles: Vehicle[] = seed.vehicles;

export function vehicleBySource(sourceId: string): Vehicle {
  const v = seedVehicles.find((x) => x.sourceId === sourceId);
  if (!v) throw new Error(`No seed vehicle ${sourceId}`);
  return structuredClone(v);
}

export function tempStore(overrides: Partial<{ seed: SeedData; readOnly: boolean; filePath: string }> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "carfam-store-"));
  const filePath = overrides.filePath ?? path.join(dir, "store.json");
  let current = overrides.seed ?? structuredClone(seed);
  const store = new JsonFileStore({ filePath, loadSeed: async () => structuredClone(current), readOnly: overrides.readOnly });
  return {
    store,
    filePath,
    dir,
    setSeed(next: SeedData) {
      current = next;
    },
    /** A second store instance on the same file, simulating a server restart. */
    reopen() {
      return new JsonFileStore({ filePath, loadSeed: async () => structuredClone(current) });
    },
  };
}

export const owner: Actor = { id: "demo-owner", role: "owner" };
export const manager: Actor = { id: "demo-manager", role: "manager" };
export const sales1: Actor = { id: "demo-sales-1", role: "sales" };
export const sales2: Actor = { id: "demo-sales-2", role: "sales" };
