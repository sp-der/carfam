import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasPhotoVariants, photoSrcSet, photoVariantPath } from "@/lib/inventory/photo-variants";
import { seedVehicles } from "./support/fixtures";

const PUBLIC = path.resolve(__dirname, "..", "public");

describe("pre-generated photo variants", () => {
  it("builds srcset for committed photos only", () => {
    expect(photoSrcSet("/vehicles/1567362/1.jpg")).toBe(
      "/vehicles/1567362/1-480.webp 480w, /vehicles/1567362/1-960.webp 960w, /vehicles/1567362/1.jpg 1200w",
    );
    expect(hasPhotoVariants("/uploads/abc.png")).toBe(false);
    expect(photoSrcSet("/uploads/abc.png")).toBeUndefined();
  });

  it("every committed photo has its 480 and 960 WebP (run `npm run photos:variants` if this fails)", () => {
    const missing: string[] = [];
    const dirs = readdirSync(path.join(PUBLIC, "vehicles"), { withFileTypes: true }).filter((d) => d.isDirectory());
    expect(dirs).toHaveLength(101);
    for (const { name: dir } of dirs) {
      for (const file of readdirSync(path.join(PUBLIC, "vehicles", dir)).filter((f) => /^\d+\.jpg$/.test(f))) {
        const src = `/vehicles/${dir}/${file}`;
        for (const w of [480, 960] as const) {
          if (!existsSync(path.join(PUBLIC, photoVariantPath(src, w)))) missing.push(photoVariantPath(src, w));
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("every seed image path points at a committed photo with variants", () => {
    const srcs = seedVehicles.flatMap((v) => v.images.map((i) => i.src));
    expect(srcs.length).toBe(606);
    expect(srcs.every(hasPhotoVariants)).toBe(true);
  });
});
