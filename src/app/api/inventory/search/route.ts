import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { filtersFromSearchParams } from "@/lib/inventory/filters";
import { toPublicSearchResult } from "@/lib/inventory/public";
import { searchPublicInventory } from "@/lib/services/inventory-service";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * Shared inventory search for Load More, the hero search count, the mobile filter sheet and the
 * chat widget. Same service as the inventory page. `?summary=1` returns only the match count.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const { filters, dropped } = filtersFromSearchParams(params);
  const result = await searchPublicInventory(getRepository(), filters);
  if (params.get("summary") === "1") {
    return NextResponse.json({ total: result.total, ignoredParams: dropped }, { headers });
  }
  return NextResponse.json({ ...toPublicSearchResult(result), ignoredParams: dropped }, { headers });
}
