import { getRepository } from "@/lib/data";
import { demoActor } from "@/lib/auth/demo-actor";
import { assertCan } from "@/lib/auth/permissions";
import { createVehicle, updateVehicle } from "@/lib/services/inventory-service";
import {
  addLeadNote,
  listLeadsFor,
  resetDemoData,
  updateLead,
} from "@/lib/services/lead-service";
import { allowRequest, sameOrigin } from "@/lib/request-limits";

export async function GET(request: Request) {
  try {
    const repo = getRepository();
    const actor = await demoActor(
      repo,
      new URL(request.url).searchParams.get("actor"),
    );
    assertCan(actor, "inventory:view");
    const [vehicles, leads, staff, info] = await Promise.all([
      repo.listVehicles(),
      listLeadsFor(repo, actor),
      repo.listStaff(),
      repo.info(),
    ]);
    return Response.json(
      { vehicles, leads, staff, info, actor },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  if (
    !allowRequest(
      `admin:${request.headers.get("x-forwarded-for") ?? "local"}`,
      60,
    )
  )
    return Response.json(
      { error: "Please wait before trying again." },
      { status: 429 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 100_000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const { actor: id, action, entityId, input, updatedAt } = JSON.parse(raw);
    const repo = getRepository();
    const actor = await demoActor(repo, id);
    if (action === "create-vehicle")
      return Response.json({
        vehicle: await createVehicle(repo, actor, input),
      });
    if (action === "update-vehicle")
      return Response.json({
        vehicle: await updateVehicle(repo, actor, entityId, input, updatedAt),
      });
    if (action === "update-lead")
      return Response.json({
        lead: await updateLead(repo, actor, entityId, input, updatedAt),
      });
    if (action === "add-note")
      return Response.json({
        lead: await addLeadNote(repo, actor, entityId, input),
      });
    if (action === "reset") {
      await resetDemoData(repo, actor);
      return Response.json({
        notice:
          "Demo restored to seed. Local edits and demo leads were removed.",
      });
    }
    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}
function failure(error: unknown) {
  const e = error as Error & {
    status?: number;
    fieldErrors?: Record<string, string[]>;
  };
  return Response.json(
    {
      error: e.status ? e.message : "Unable to perform this demo operation.",
      fieldErrors: e.fieldErrors,
    },
    { status: e.status ?? 400 },
  );
}
