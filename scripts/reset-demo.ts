/**
 * Restore the demo store to the seed (same as the admin "Reset demo data" action).
 *
 *   npm run demo:reset
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonFileStore, type SeedData } from "../src/lib/data/json-store";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => JSON.parse(readFileSync(path.join(ROOT, "data", "seed", file), "utf8"));

const store = new JsonFileStore({
  filePath: process.env.CARFAM_DATA_FILE ?? path.join(ROOT, ".data", "store.json"),
  loadSeed: async (): Promise<SeedData> => {
    const inventory = read("inventory.seed.json");
    const demo = read("demo.seed.json");
    return { vehicles: inventory.vehicles, leads: demo.leads, staff: demo.staff };
  },
});

async function main() {
  await store.reset();
  const info = await store.info();
  console.log(`Demo data reset to seed ${info.seedHash} (${(await store.listVehicles()).length} vehicles).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
