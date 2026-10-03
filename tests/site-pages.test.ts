import { describe, expect, it } from "vitest";
import { GUIDES, PUBLIC_ROUTES, SITE_PAGES } from "@/lib/site-pages";
import { allowRequest, sameOrigin } from "@/lib/request-limits";
import {
  hasPhotoVariants,
  photoVariantPath,
} from "@/lib/inventory/photo-variants";

describe("Phase 3 registry and request boundaries", () => {
  it("retains all seven captured article paths", () => {
    expect(GUIDES).toHaveLength(7);
    expect(new Set(PUBLIC_ROUTES).size).toBe(PUBLIC_ROUTES.length);
    expect(PUBLIC_ROUTES).toContain("/finance-your-car/pre-approved");
    expect(SITE_PAGES["/pre-owned-exotic-cars"]).toBeUndefined();
  });
  it("rates requests within a bounded window", () => {
    expect(allowRequest("test:window", 2, 100, 50)).toBe(true);
    expect(allowRequest("test:window", 2, 110, 50)).toBe(true);
    expect(allowRequest("test:window", 2, 120, 50)).toBe(false);
    expect(allowRequest("test:window", 2, 151, 50)).toBe(true);
  });
  it("rejects cross-origin mutations", () => {
    expect(
      sameOrigin(
        new Request("http://localhost:3000/api/admin", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);
    expect(
      sameOrigin(
        new Request("http://localhost:3000/api/admin", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).toBe(true);
    expect(sameOrigin(new Request("http://localhost:3000/api/admin", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } }))).toBe(true);
  });
  it("admin uploads use pre-generated variants, not runtime optimization", () => {
    const src = "/vehicles/uploads/1234-abcd/1.jpg";
    expect(hasPhotoVariants(src)).toBe(true);
    expect(photoVariantPath(src, 480)).toBe(
      "/vehicles/uploads/1234-abcd/1-480.webp",
    );
  });
});
