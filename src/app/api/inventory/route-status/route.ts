import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { resolveVehicleRoute } from "@/lib/inventory/legacy-routes";

/**
 * Detail-route outcome for the proxy (`src/proxy.ts`), which sets HTTP 410 on unavailable vehicles.
 * Returns only the outcome kind — no vehicle data.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const vehicle = /^[\w-]{1,64}$/.test(id) ? await getRepository().getVehicleByRouteId(id) : undefined;
  const { kind } = resolveVehicleRoute(slug, id, vehicle);
  return NextResponse.json({ kind }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
