import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { toVehicleSummary } from "@/lib/inventory/public";
import { getShoppableByRouteIds } from "@/lib/services/inventory-service";

/** Saved vehicles and comparison: `?ids=1567362,1485865` (public route ids, max 50). */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[\w-]{1,64}$/.test(s));
  const { vehicles, unavailable } = await getShoppableByRouteIds(getRepository(), ids);
  return NextResponse.json(
    { vehicles: vehicles.map(toVehicleSummary), unavailable },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
