import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { filtersFromSearchParams } from "@/lib/inventory/filters";
import { toPublicSearchResult } from "@/lib/inventory/public";
import { searchPublicInventory } from "@/lib/services/inventory-service";

/** Shared inventory search for Load More and the chat widget. Same service as the inventory page. */
export async function GET(request: NextRequest) {
  const { filters, dropped } = filtersFromSearchParams(request.nextUrl.searchParams);
  const result = await searchPublicInventory(getRepository(), filters);
  return NextResponse.json(
    { ...toPublicSearchResult(result), ignoredParams: dropped },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
