/**
 * Server-side permission checks. In demo mode the actor's role comes from the admin
 * "Viewing as" switcher (not security); post-approval it comes from real authentication.
 * Every mutation path calls `assertCan` on the server, regardless of what the UI shows.
 */

export const STAFF_ROLES = ["owner", "manager", "sales"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface Actor {
  /** Demo staff id (or auth user id post-approval). */
  id: string;
  role: StaffRole;
}

export type Action =
  | "inventory:view"
  | "inventory:create"
  | "inventory:edit"
  | "inventory:edit-pricing"
  | "inventory:set-status"
  | "inventory:publish"
  | "inventory:archive"
  | "inventory:feature"
  | "inventory:manage-photos"
  | "leads:view-all"
  | "leads:view-assigned"
  | "leads:assign"
  | "leads:update-status"
  | "leads:add-note"
  | "demo:reset";

const GRANTS: Record<StaffRole, ReadonlySet<Action>> = {
  owner: new Set<Action>([
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:edit-pricing",
    "inventory:set-status",
    "inventory:publish",
    "inventory:archive",
    "inventory:feature",
    "inventory:manage-photos",
    "leads:view-all",
    "leads:view-assigned",
    "leads:assign",
    "leads:update-status",
    "leads:add-note",
    "demo:reset",
  ]),
  manager: new Set<Action>([
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "inventory:edit-pricing",
    "inventory:set-status",
    "inventory:publish",
    "inventory:archive",
    "inventory:feature",
    "inventory:manage-photos",
    "leads:view-all",
    "leads:view-assigned",
    "leads:assign",
    "leads:update-status",
    "leads:add-note",
  ]),
  // Sales staff manage their assigned leads and can view inventory.
  sales: new Set<Action>(["inventory:view", "leads:view-assigned", "leads:update-status", "leads:add-note"]),
};

export class PermissionError extends Error {
  readonly status = 403;
  constructor(
    readonly actor: Actor | null,
    readonly action: Action,
  ) {
    super(actor ? `Role "${actor.role}" may not perform "${action}"` : `Sign-in required for "${action}"`);
    this.name = "PermissionError";
  }
}

export function can(actor: Actor | null | undefined, action: Action): boolean {
  if (!actor) return false;
  return GRANTS[actor.role]?.has(action) ?? false;
}

export function assertCan(actor: Actor | null | undefined, action: Action): asserts actor is Actor {
  if (!can(actor, action)) throw new PermissionError(actor ?? null, action);
}

/** Lead-level access: managers/owners see everything; sales only leads assigned to them. */
export function canAccessLead(actor: Actor | null | undefined, lead: { assignedTo: string | null }): boolean {
  if (can(actor, "leads:view-all")) return true;
  return !!actor && can(actor, "leads:view-assigned") && lead.assignedTo === actor.id;
}

export function assertCanAccessLead(actor: Actor | null | undefined, lead: { assignedTo: string | null }): asserts actor is Actor {
  if (!canAccessLead(actor, lead)) throw new PermissionError(actor ?? null, "leads:view-assigned");
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}
