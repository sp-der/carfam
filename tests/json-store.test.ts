import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hashSeed, mergeSeed, type SeedData } from "@/lib/data/json-store";
import { ConflictError, ReadOnlyError } from "@/lib/data/repository";
import type { Lead } from "@/lib/leads/types";
import { seed, tempStore, vehicleBySource } from "./support/fixtures";

function withSeed(mutate: (s: SeedData) => void): SeedData {
  const next = structuredClone(seed);
  mutate(next);
  return next;
}

describe("JSON file store seeding", () => {
  it("creates the store from the seed on first read and persists it", async () => {
    const { store, filePath, reopen } = tempStore();
    expect(await store.listVehicles()).toHaveLength(127);
    const onDisk = JSON.parse(readFileSync(filePath, "utf8"));
    expect(onDisk.vehicles).toHaveLength(127);
    expect(onDisk.seedHash).toBe(hashSeed(seed));
    expect(await reopen().listLeads()).toHaveLength(seed.leads.length);
  });

  it("re-importing the same seed changes nothing", async () => {
    const { store, filePath, reopen } = tempStore();
    await store.listVehicles();
    const before = readFileSync(filePath, "utf8");
    const again = reopen();
    await again.listVehicles();
    expect(readFileSync(filePath, "utf8")).toBe(before);
    expect((await again.info()).importRuns).toHaveLength(1);
  });

  it("never overwrites staff edits (or any existing row) when the seed changes", async () => {
    const { store, setSeed, reopen } = tempStore();
    const xt5 = (await store.getVehicleByRouteId("1449827"))!;
    await store.replaceVehicle({
      ...xt5,
      pricing: { ...xt5.pricing, internetPriceCents: 1_800_000 },
      staffEditedAt: "2026-10-03T00:00:00.000Z",
    });

    const extra = { ...vehicleBySource("1581060"), id: "veh_new1", sourceId: "new1", vin: "1HGCM82633A004352", stockNumber: "NEW1" };
    setSeed(
      withSeed((s) => {
        for (const v of s.vehicles) {
          v.title = `${v.title} (re-imported)`;
          v.pricing.internetPriceCents += 100_000;
        }
        s.vehicles.push(extra);
      }),
    );

    const restarted = reopen();
    const vehicles = await restarted.listVehicles();
    expect(vehicles).toHaveLength(128);
    const editedAfter = vehicles.find((v) => v.sourceId === "1449827")!;
    expect(editedAfter.pricing.internetPriceCents).toBe(1_800_000);
    expect(editedAfter.title).not.toMatch(/re-imported/);
    // Unedited existing rows are left alone too: the import is insert-only.
    expect(vehicles.filter((v) => v.title.includes("re-imported"))).toHaveLength(0);
    const runs = (await restarted.info()).importRuns;
    expect(runs.at(-1)).toMatchObject({ inserted: 1, skippedExisting: 127 });
  });

  it("matches on VIN when the source id differs", () => {
    const xt5 = vehicleBySource("1449827");
    const result = mergeSeed({ vehicles: [{ ...xt5, sourceId: null, id: "veh_admin" }] }, { vehicles: [xt5], leads: [], staff: [] });
    expect(result.inserted).toBe(0);
    expect(result.vehicles).toHaveLength(1);
    expect(result.vehicles[0].id).toBe("veh_admin");
  });

  it("does not resurrect data the seed no longer has, and keeps admin-created vehicles", async () => {
    const { store, setSeed, reopen } = tempStore();
    const created = { ...vehicleBySource("1581060"), id: "veh_admin1", sourceId: null, vin: "2HGFB2F50DH512345", stockNumber: "A1" };
    await store.insertVehicle(created);
    setSeed(withSeed((s) => s.vehicles.splice(0, 10)));
    const vehicles = await reopen().listVehicles();
    expect(vehicles).toHaveLength(128);
    expect(vehicles.some((v) => v.id === "veh_admin1")).toBe(true);
  });

  it("reset restores the seed exactly", async () => {
    const { store } = tempStore();
    const xt5 = (await store.getVehicleByRouteId("1449827"))!;
    await store.replaceVehicle({ ...xt5, publication: "archived" });
    await store.insertLead({ ...(seed.leads[0] as Lead), id: "lead_extra" });
    await store.reset();
    expect(await store.listVehicles()).toEqual(seed.vehicles);
    expect(await store.listLeads()).toEqual(seed.leads);
  });
});

describe("JSON file store writes", () => {
  it("persists across restarts", async () => {
    const { store, reopen } = tempStore();
    const xt5 = (await store.getVehicleByRouteId("1449827"))!;
    await store.replaceVehicle({ ...xt5, status: "pending" });
    expect((await reopen().getVehicleByRouteId("1449827"))!.status).toBe("pending");
  });

  it("serializes concurrent writes without losing any", async () => {
    const { store, reopen } = tempStore();
    const template = seed.leads[0] as Lead;
    await Promise.all(Array.from({ length: 20 }, (_, i) => store.insertLead({ ...template, id: `lead_c${i}` })));
    const leads = await reopen().listLeads();
    expect(leads.filter((l) => l.id.startsWith("lead_c"))).toHaveLength(20);
  });

  it("rejects stale writes with a conflict", async () => {
    const { store } = tempStore();
    const v = (await store.getVehicleByRouteId("1449827"))!;
    await store.replaceVehicle({ ...v, mileage: 1, updatedAt: "2026-10-03T01:00:00.000Z" }, v.updatedAt);
    await expect(store.replaceVehicle({ ...v, mileage: 2 }, v.updatedAt)).rejects.toBeInstanceOf(ConflictError);
  });

  it("a failed write leaves the in-memory state unchanged", async () => {
    const { store } = tempStore();
    await expect(store.replaceVehicle({ ...vehicleBySource("1449827"), id: "missing" })).rejects.toThrow(/not found/);
    expect(await store.listVehicles()).toHaveLength(127);
  });

  it("returns copies, so callers can't mutate stored data", async () => {
    const { store } = tempStore();
    const v = (await store.getVehicleByRouteId("1449827"))!;
    v.mileage = 0;
    expect((await store.getVehicleByRouteId("1449827"))!.mileage).not.toBe(0);
  });
});

describe("read-only mode", () => {
  it("serves the seed and refuses writes when forced", async () => {
    const { store } = tempStore({ readOnly: true });
    expect(await store.listVehicles()).toHaveLength(127);
    expect(await store.info()).toMatchObject({ readOnly: true });
    await expect(store.insertLead(seed.leads[0] as Lead)).rejects.toBeInstanceOf(ReadOnlyError);
    await expect(store.reset()).rejects.toBeInstanceOf(ReadOnlyError);
  });

  it("detects an unwritable location", async () => {
    const { dir } = tempStore();
    const blocker = path.join(dir, "not-a-directory");
    writeFileSync(blocker, "");
    const { store } = tempStore({ filePath: path.join(blocker, "store.json") });
    const info = await store.info();
    expect(info.readOnly).toBe(true);
    expect(info.readOnlyReason).toMatch(/not writable/);
    expect(await store.listVehicles()).toHaveLength(127);
  });
});
