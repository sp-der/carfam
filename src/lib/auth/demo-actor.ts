import type { Repository } from "@/lib/data/repository";
import { PermissionError, type Actor } from "./permissions";

/** Demo identity selector only, NOT authentication. Never deploy with real customer data. */
export async function demoActor(repo: Repository, id: unknown): Promise<Actor> {
  const member = (await repo.listStaff()).find((s) => s.id === id);
  if (!member) throw new PermissionError(null, "inventory:view");
  return { id: member.id, role: member.role };
}
