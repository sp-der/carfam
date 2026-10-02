import "server-only";
import path from "node:path";
import inventorySeed from "../../../data/seed/inventory.seed.json";
import demoSeed from "../../../data/seed/demo.seed.json";
import type { Lead } from "@/lib/leads/types";
import type { Vehicle } from "@/lib/inventory/types";
import { JsonFileStore, type SeedData } from "./json-store";
import type { DemoStaffMember, Repository } from "./repository";

/**
 * Server-only repository accessor. Swap the implementation here (e.g. Supabase) post-approval.
 *
 * Env:
 * - CARFAM_DATA_FILE: store path (default `.data/store.json` in the project root)
 * - CARFAM_READ_ONLY=1: force read-only mode
 */

export function loadBundledSeed(): SeedData {
  return {
    vehicles: (inventorySeed as unknown as { vehicles: Vehicle[] }).vehicles,
    leads: (demoSeed as unknown as { leads: Lead[] }).leads,
    staff: (demoSeed as unknown as { staff: DemoStaffMember[] }).staff,
  };
}

const globalForRepo = globalThis as unknown as { __carfamRepository?: Repository };

export function getRepository(): Repository {
  globalForRepo.__carfamRepository ??= new JsonFileStore({
    filePath: process.env.CARFAM_DATA_FILE ?? path.join(process.cwd(), ".data", "store.json"),
    loadSeed: async () => loadBundledSeed(),
    readOnly: process.env.CARFAM_READ_ONLY === "1",
  });
  return globalForRepo.__carfamRepository;
}
