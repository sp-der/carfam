import { randomUUID } from "node:crypto";
import { z } from "zod";
import { assertCan, assertCanAccessLead, canAccessLead, type Actor } from "@/lib/auth/permissions";
import type { Repository } from "@/lib/data/repository";
import { isShoppable } from "@/lib/inventory/search";
import {
  leadInputSchema,
  leadNoteSchema,
  leadUpdateSchema,
  type Lead,
  type LeadStatus,
  type LeadType,
} from "@/lib/leads/types";
import { ValidationError } from "./inventory-service";

/** Shown with every public form result. */
export const DEMO_SUBMISSION_NOTICE = "Demo only—nothing was sent.";

function fail(error: z.ZodError): never {
  throw new ValidationError(
    "Please fix the highlighted fields.",
    z.flattenError(error).fieldErrors as Record<string, string[]>,
  );
}

/** Public demo form submission: validated, stored locally for the lead inbox, never transmitted. */
export async function submitDemoLead(repo: Repository, input: unknown): Promise<Lead> {
  const parsed = leadInputSchema.safeParse(input);
  if (!parsed.success) fail(parsed.error);
  const d = parsed.data;

  // Accepts the internal id or the public route id; stored as the internal id.
  const requestedVehicleId = "vehicleId" in d && d.vehicleId ? d.vehicleId : null;
  let vehicle = null;
  if (requestedVehicleId) {
    vehicle = (await repo.getVehicle(requestedVehicleId)) ?? (await repo.getVehicleByRouteId(requestedVehicleId));
    if (!vehicle || !isShoppable(vehicle))
      throw new ValidationError("That vehicle is no longer available.", { vehicleId: ["Vehicle unavailable"] });
  }

  const now = new Date().toISOString();
  const lead: Lead = {
    id: `lead_${randomUUID()}`,
    type: d.type,
    subtype: d.type === "vehicle-inquiry" ? d.subtype : null,
    status: "new",
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phone: d.phone,
    sourcePath: d.sourcePath,
    vehicleId: vehicle?.id ?? null,
    vehicleTitle: vehicle?.title ?? null,
    department: d.type === "contact" ? d.department : null,
    subject: d.type === "vehicle-inquiry" ? (d.subject ?? null) : null,
    message: d.message ?? null,
    details: "details" in d ? (d.details as Record<string, unknown>) : null,
    assignedTo: null,
    notes: [],
    isSynthetic: false,
    createdAt: now,
    updatedAt: now,
  };
  return repo.insertLead(lead);
}

export interface LeadQuery {
  status?: LeadStatus;
  type?: LeadType;
  q?: string;
}

/** Leads the actor may see, newest first. Sales staff only see leads assigned to them. */
export async function listLeadsFor(repo: Repository, actor: Actor | null, query: LeadQuery = {}): Promise<Lead[]> {
  if (!actor) assertCan(actor, "leads:view-assigned");
  const q = query.q?.trim().toLowerCase();
  return (await repo.listLeads())
    .filter((lead) => canAccessLead(actor, lead))
    .filter((lead) => !query.status || lead.status === query.status)
    .filter((lead) => !query.type || lead.type === query.type)
    .filter(
      (lead) =>
        !q ||
        [lead.firstName, lead.lastName, lead.email, lead.phone, lead.vehicleTitle, lead.message]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLeadFor(repo: Repository, actor: Actor | null, id: string): Promise<Lead> {
  const lead = await repo.getLead(id);
  if (!lead) throw new ValidationError("Lead not found.");
  assertCanAccessLead(actor, lead);
  return lead;
}

export async function updateLead(
  repo: Repository,
  actor: Actor | null,
  id: string,
  input: unknown,
  expectedUpdatedAt?: string,
): Promise<Lead> {
  const lead = await getLeadFor(repo, actor, id);
  const parsed = leadUpdateSchema.safeParse(input);
  if (!parsed.success) fail(parsed.error);
  const patch = parsed.data;

  if (patch.status !== undefined) assertCan(actor, "leads:update-status");
  if (patch.assignedTo !== undefined) {
    assertCan(actor, "leads:assign");
    if (patch.assignedTo !== null) {
      const staff = await repo.listStaff();
      if (!staff.some((s) => s.id === patch.assignedTo))
        throw new ValidationError("Unknown staff member.", { assignedTo: ["Unknown staff member"] });
    }
  }
  const next: Lead = {
    ...lead,
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.assignedTo !== undefined && { assignedTo: patch.assignedTo }),
    updatedAt: new Date().toISOString(),
  };
  return repo.replaceLead(next, expectedUpdatedAt);
}

export async function addLeadNote(repo: Repository, actor: Actor | null, id: string, input: unknown): Promise<Lead> {
  await getLeadFor(repo, actor, id);
  assertCan(actor, "leads:add-note");
  const parsed = leadNoteSchema.safeParse(input);
  if (!parsed.success) fail(parsed.error);
  return repo.appendLeadNote(id, {
    id: `note_${randomUUID()}`,
    authorId: actor.id,
    body: parsed.data.body,
    createdAt: new Date().toISOString(),
  });
}

export async function resetDemoData(repo: Repository, actor: Actor | null): Promise<void> {
  assertCan(actor, "demo:reset");
  await repo.reset();
}
