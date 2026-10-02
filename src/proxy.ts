import { NextResponse, type NextRequest } from "next/server";

/**
 * Sold, archived or unpublished vehicle pages render a "no longer available" page with HTTP 410,
 * which App Router pages can't set themselves. The outcome comes from a small internal endpoint
 * (proxy shouldn't import the data layer); if that check fails, the page renders normally (200).
 */
export async function proxy(request: NextRequest) {
  const [, , , slug = "", id = ""] = request.nextUrl.pathname.split("/");
  try {
    const url = new URL("/api/inventory/route-status", request.nextUrl.origin);
    url.searchParams.set("id", decodeURIComponent(id));
    url.searchParams.set("slug", decodeURIComponent(slug));
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const { kind } = (await res.json()) as { kind?: string };
      if (kind === "unavailable") return NextResponse.rewrite(request.nextUrl, { status: 410 });
    }
  } catch {
    // Fall through: the page itself still shows the unavailable state.
  }
  return NextResponse.next();
}

export const config = { matcher: "/pre-owned-cars/detail/:slug/:id" };
