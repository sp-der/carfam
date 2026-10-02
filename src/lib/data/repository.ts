import type { StaffRole } from "@/lib/auth/permissions";
import type { Lead, LeadNote } from "@/lib/leads/types";
import type { Vehicle } from "@/lib/inventory/types";

/**
 * Storage boundary for all data reads and writes. The demo uses the JSON file store;
 * a Supabase implementation replaces it post-approval without UI changes.
 *
 * The repository is plain data access. Validation and permission checks live in the
 * service layer (`src/lib/services`), which is what UI and route handlers call.
 */

export interface DemoStaffMember {
  id: string;
  name: string;
  role: StaffRole;
}

export interface ImportRun {
  at: string;
  seedHash: string;
  inserted: number;
  skippedExisting: number;
}

export interface RepositoryInfo {
  backend: "json-file" | "supabase";
  readOnly: boolean;
  readOnlyReason: string | null;
  seedHash: string | null;
  importRuns: ImportRun[];
}

export class ReadOnlyError extends Error {
  readonly status = 503;
  constructor(reason: string) {
    super(`Demo data is read-only here: ${reason}`);
    this.name = "ReadOnlyError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

/** Optimistic concurrency: the write fails if the record changed since `updatedAt`. */
export class ConflictError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export interface Repository {
  info(): Promise<RepositoryInfo>;

  listVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  /** Lookup by public route id: sourceId for imported vehicles, id otherwise. */
  getVehicleByRouteId(routeId: string): Promise<Vehicle | undefined>;
  insertVehicle(vehicle: Vehicle): Promise<Vehicle>;
  /** Replace a vehicle. Fails with ConflictError if `expectedUpdatedAt` is given and stale. */
  replaceVehicle(vehicle: Vehicle, expectedUpdatedAt?: string): Promise<Vehicle>;

  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  insertLead(lead: Lead): Promise<Lead>;
  replaceLead(lead: Lead, expectedUpdatedAt?: string): Promise<Lead>;
  appendLeadNote(leadId: string, note: LeadNote): Promise<Lead>;

  listStaff(): Promise<DemoStaffMember[]>;

  /** Restore vehicles, leads and staff to the seed. */
  reset(): Promise<void>;
}
