/**
 * Pre-generate 480px and 960px WebP versions of every committed vehicle photo:
 *   public/vehicles/{sourceId}/{n}.jpg → {n}-480.webp, {n}-960.webp
 *
 *   npm run photos:variants            # create missing or outdated variants
 *   npm run photos:variants -- --force # regenerate everything
 *
 * Runs one image at a time (the runtime optimizer stalled under concurrency on Windows).
 * Output is deterministic for a given sharp version; commit the generated files.
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PHOTO_VARIANT_WIDTHS, photoVariantPath } from "../src/lib/inventory/photo-variants";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VEHICLES = path.join(ROOT, "public", "vehicles");
const force = process.argv.includes("--force");
const QUALITY = 72;

sharp.concurrency(1);
sharp.cache(false);

function mtime(file: string): number | null {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return null;
  }
}

async function main() {
  let created = 0;
  let skipped = 0;
  let bytes = 0;
  const dirs = readdirSync(VEHICLES, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const dir of dirs) {
    const photos = readdirSync(path.join(VEHICLES, dir.name)).filter((f) => /^\d+\.jpg$/.test(f));
    for (const photo of photos) {
      const src = path.join(VEHICLES, dir.name, photo);
      const srcTime = mtime(src)!;
      for (const width of PHOTO_VARIANT_WIDTHS) {
        const out = path.join(ROOT, "public", photoVariantPath(`/vehicles/${dir.name}/${photo}`, width));
        const outTime = mtime(out);
        if (!force && outTime != null && outTime >= srcTime) {
          skipped++;
          bytes += statSync(out).size;
          continue;
        }
        const info = await sharp(src)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: QUALITY, effort: 4 })
          .toFile(out);
        created++;
        bytes += info.size;
      }
    }
  }
  console.log(
    `Photo variants: ${created} written, ${skipped} up to date, ${(bytes / 1024 / 1024).toFixed(1)} MB total ` +
      `across ${dirs.length} vehicles.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
