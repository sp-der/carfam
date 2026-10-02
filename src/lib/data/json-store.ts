import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lead, LeadNote } from "@/lib/leads/types";
import type { Vehicle } from "@/lib/inventory/types";
import {
  ConflictError,
  NotFoundError,
  ReadOnlyError,
  type DemoStaffMember,
  type ImportRun,
  type Repository,
  type RepositoryInfo,
} from "./repository";

/**
 * Demo repository backed by one JSON file on the server.
 *
 * - First read creates the store from the seed.
 * - Later reads merge the seed idempotently when its hash changes: missing vehicles
 *   (matched on sourceId, then VIN) are inserted; existing vehicles are never modified,
 *   so staff edits always survive a re-import.
 * - Writes are serialized in-process and written atomically (temp file + rename).
 * - On a read-only filesystem (e.g. Vercel) the seed is served from memory and writes
 *   throw ReadOnlyError.
 *
 * Single-process only; fine for a local demo. Supabase replaces this post-approval.
 */

export interface SeedData {
  vehicles: Vehicle[];
  leads: Lead[];
  staff: DemoStaffMember[];
}

interface StoreFile {
  schemaVersion: 1;
  seedHash: string;
  importRuns: ImportRun[];
  vehicles: Vehicle[];
  leads: Lead[];
  staff: DemoStaffMember[];
}

export interface JsonStoreOptions {
  filePath: string;
  loadSeed: () => Promise<SeedData>;
  /** Force read-only (tests, or CARFAM_READ_ONLY=1). Otherwise detected by probing the directory. */
  readOnly?: boolean;
  now?: () => Date;
}

const MAX_IMPORT_RUNS = 50;

export function hashSeed(seed: SeedData): string {
  return createHash("sha256").update(JSON.stringify(seed)).digest("hex").slice(0, 16);
}

const clone = <T>(value: T): T => structuredClone(value);

/** Pure seed merge: exported for tests. Never mutates or updates existing vehicles. */
export function mergeSeed(
  store: Pick<StoreFile, "vehicles">,
  seed: SeedData,
): { vehicles: Vehicle[]; inserted: number; skippedExisting: number } {
  const bySource = new Set(store.vehicles.map((v) => v.sourceId).filter((s): s is string => s != null));
  const byVin = new Set(store.vehicles.map((v) => v.vin.toUpperCase()));
  const vehicles = [...store.vehicles];
  let inserted = 0;
  let skippedExisting = 0;
  for (const seedVehicle of seed.vehicles) {
    const exists =
      (seedVehicle.sourceId != null && bySource.has(seedVehicle.sourceId)) ||
      byVin.has(seedVehicle.vin.toUpperCase());
    if (exists) {
      skippedExisting++;
      continue;
    }
    vehicles.push(clone(seedVehicle));
    if (seedVehicle.sourceId) bySource.add(seedVehicle.sourceId);
    byVin.add(seedVehicle.vin.toUpperCase());
    inserted++;
  }
  return { vehicles, inserted, skippedExisting };
}

export class JsonFileStore implements Repository {
  private state: StoreFile | null = null;
  private loading: Promise<StoreFile> | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private readOnlyReason: string | null = null;
  private readonly now: () => Date;

  constructor(private readonly options: JsonStoreOptions) {
    this.now = options.now ?? (() => new Date());
    if (options.readOnly) this.readOnlyReason = "read-only mode is enabled";
  }

  // ---------- loading ----------

  private async detectReadOnly(): Promise<void> {
    if (this.readOnlyReason) return;
    const dir = path.dirname(this.options.filePath);
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(probe, "");
      await fs.unlink(probe);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "unknown error";
      this.readOnlyReason = `the server filesystem is not writable (${code})`;
    }
  }

  private async load(): Promise<StoreFile> {
    if (this.state) return this.state;
    this.loading ??= (async () => {
      await this.detectReadOnly();
      const seed = await this.options.loadSeed();
      const seedHash = hashSeed(seed);

      let existing: StoreFile | null = null;
      if (!this.readOnlyReason) {
        try {
          existing = JSON.parse(await fs.readFile(this.options.filePath, "utf8")) as StoreFile;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
      }

      if (!existing) {
        const fresh = this.freshFromSeed(seed, seedHash);
        if (!this.readOnlyReason) await this.persist(fresh);
        this.state = fresh;
        return fresh;
      }

      if (existing.seedHash !== seedHash) {
        const merged = mergeSeed(existing, seed);
        existing.vehicles = merged.vehicles;
        existing.seedHash = seedHash;
        existing.importRuns = [
          ...existing.importRuns,
          { at: this.now().toISOString(), seedHash, inserted: merged.inserted, skippedExisting: merged.skippedExisting },
        ].slice(-MAX_IMPORT_RUNS);
        await this.persist(existing);
      }
      this.state = existing;
      return existing;
    })();
    try {
      return await this.loading;
    } finally {
      this.loading = null;
    }
  }

  private freshFromSeed(seed: SeedData, seedHash: string): StoreFile {
    return {
      schemaVersion: 1,
      seedHash,
      importRuns: [
        { at: this.now().toISOString(), seedHash, inserted: seed.vehicles.length, skippedExisting: 0 },
      ],
      vehicles: clone(seed.vehicles),
      leads: clone(seed.leads),
      staff: clone(seed.staff),
    };
  }

  private async persist(state: StoreFile): Promise<void> {
    const file = this.options.filePath;
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(tmp, JSON.stringify(state), "utf8");
    await fs.rename(tmp, file);
  }

  /** Serialize mutations; apply to a copy and commit only after a successful write. */
  private mutate<T>(fn: (draft: StoreFile) => T): Promise<T> {
    const run = async () => {
      const current = await this.load();
      if (this.readOnlyReason) throw new ReadOnlyError(this.readOnlyReason);
      const draft = clone(current);
      const result = fn(draft);
      await this.persist(draft);
      this.state = draft;
      return result;
    };
    const next = this.writeQueue.then(run, run);
    this.writeQueue = next.catch(() => undefined);
    return next;
  }

  // ---------- Repository ----------

  async info(): Promise<RepositoryInfo> {
    const state = await this.load();
    return {
      backend: "json-file",
      readOnly: this.readOnlyReason != null,
      readOnlyReason: this.readOnlyReason,
      seedHash: state.seedHash,
      importRuns: clone(state.importRuns),
    };
  }

  async listVehicles(): Promise<Vehicle[]> {
    return clone((await this.load()).vehicles);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const v = (await this.load()).vehicles.find((x) => x.id === id);
    return v && clone(v);
  }

  async getVehicleByRouteId(routeId: string): Promise<Vehicle | undefined> {
    const vehicles = (await this.load()).vehicles;
    const v = vehicles.find((x) => x.sourceId === routeId) ?? vehicles.find((x) => x.sourceId == null && x.id === routeId);
    return v && clone(v);
  }

  insertVehicle(vehicle: Vehicle): Promise<Vehicle> {
    return this.mutate((draft) => {
      if (draft.vehicles.some((v) => v.id === vehicle.id)) throw new ConflictError(`Vehicle ${vehicle.id} already exists`);
      draft.vehicles.push(clone(vehicle));
      return clone(vehicle);
    });
  }

  replaceVehicle(vehicle: Vehicle, expectedUpdatedAt?: string): Promise<Vehicle> {
    return this.mutate((draft) => {
      const index = draft.vehicles.findIndex((v) => v.id === vehicle.id);
      if (index < 0) throw new NotFoundError(`Vehicle ${vehicle.id}`);
      if (expectedUpdatedAt && draft.vehicles[index].updatedAt !== expectedUpdatedAt)
        throw new ConflictError("This vehicle was changed by someone else. Reload and try again.");
      draft.vehicles[index] = clone(vehicle);
      return clone(vehicle);
    });
  }

  async listLeads(): Promise<Lead[]> {
    return clone((await this.load()).leads);
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const lead = (await this.load()).leads.find((l) => l.id === id);
    return lead && clone(lead);
  }

  insertLead(lead: Lead): Promise<Lead> {
    return this.mutate((draft) => {
      draft.leads.push(clone(lead));
      return clone(lead);
    });
  }

  replaceLead(lead: Lead, expectedUpdatedAt?: string): Promise<Lead> {
    return this.mutate((draft) => {
      const index = draft.leads.findIndex((l) => l.id === lead.id);
      if (index < 0) throw new NotFoundError(`Lead ${lead.id}`);
      if (expectedUpdatedAt && draft.leads[index].updatedAt !== expectedUpdatedAt)
        throw new ConflictError("This lead was changed by someone else. Reload and try again.");
      draft.leads[index] = clone(lead);
      return clone(lead);
    });
  }

  appendLeadNote(leadId: string, note: LeadNote): Promise<Lead> {
    return this.mutate((draft) => {
      const lead = draft.leads.find((l) => l.id === leadId);
      if (!lead) throw new NotFoundError(`Lead ${leadId}`);
      lead.notes.push(clone(note));
      lead.updatedAt = note.createdAt;
      return clone(lead);
    });
  }

  async listStaff(): Promise<DemoStaffMember[]> {
    return clone((await this.load()).staff);
  }

  async reset(): Promise<void> {
    await this.load();
    if (this.readOnlyReason) throw new ReadOnlyError(this.readOnlyReason);
    const seed = await this.options.loadSeed();
    const fresh = this.freshFromSeed(seed, hashSeed(seed));
    await this.mutate((draft) => Object.assign(draft, fresh));
  }
}
