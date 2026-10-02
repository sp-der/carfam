/**
 * Copy up to the first 6 photos per vehicle into `public/vehicles/{sourceId}/{n}.jpg`.
 *
 *   npm run photos:copy              # estimate only (HEAD requests), no download
 *   npm run photos:copy -- --download
 *
 * One-time copy so the running demo never loads Carfam's photo server. Reuses files
 * already in `carfam-recon/assets/inventory-demo/` when the source URL matches.
 * Skips Coming Soon placeholders (those vehicles use the site's fallback image) and
 * files that already exist, so re-running is safe. Writes `public/vehicles/manifest.json`;
 * re-run `npm run import:recon` afterwards.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECON = path.join(ROOT, "carfam-recon");
const OUT_DIR = path.join(ROOT, "public", "vehicles");
const PER_VEHICLE = 6;
const CONCURRENCY = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const USER_AGENT = "carfam-private-demo-photo-copy (one-time)";

interface Job {
  vehicleId: string;
  index: number;
  url: string;
  dest: string;
  localSource?: string;
}

function planJobs(): Job[] {
  const { vehicles } = JSON.parse(readFileSync(path.join(RECON, "data", "inventory.json"), "utf8")) as {
    vehicles: { id: string; image_urls: string[] }[];
  };
  const demoAssets = JSON.parse(readFileSync(path.join(RECON, "data", "demo_assets.json"), "utf8")) as {
    source_url: string;
    local_path: string;
  }[];
  const local = new Map(demoAssets.map((a) => [a.source_url, path.join(RECON, a.local_path)]));

  return vehicles.flatMap((v) =>
    v.image_urls
      .filter((u) => !u.includes("/comingsoon/"))
      .slice(0, PER_VEHICLE)
      .map((url, index) => ({
        vehicleId: v.id,
        index,
        url,
        dest: path.join(OUT_DIR, v.id, `${index + 1}.jpg`),
        localSource: local.get(url),
      })),
  );
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

async function estimate(jobs: Job[]) {
  const pending = jobs.filter((j) => !existsSync(j.dest) && !j.localSource);
  const sizes = await pool(pending, CONCURRENCY, async (j) => {
    const res = await fetch(j.url, { method: "HEAD", headers: { "User-Agent": USER_AGENT } });
    return res.ok ? Number(res.headers.get("content-length") ?? 0) : 0;
  });
  const bytes = sizes.reduce((a, b) => a + b, 0);
  console.log(`Planned files: ${jobs.length} for ${new Set(jobs.map((j) => j.vehicleId)).size} vehicles`);
  console.log(`Already present: ${jobs.filter((j) => existsSync(j.dest)).length}; reusable from recon: ${jobs.filter((j) => j.localSource && !existsSync(j.dest)).length}`);
  console.log(`To download: ${pending.length} files, ~${(bytes / 1e6).toFixed(1)} MB`);
}

async function download(jobs: Job[]) {
  const failures: string[] = [];
  let fetched = 0;
  await pool(jobs, CONCURRENCY, async (j) => {
    if (existsSync(j.dest) && statSync(j.dest).size > 0) return;
    mkdirSync(path.dirname(j.dest), { recursive: true });
    if (j.localSource && existsSync(j.localSource)) {
      copyFileSync(j.localSource, j.dest);
      return;
    }
    try {
      const res = await fetch(j.url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) throw new Error(`HTTP ${res.status} ${type}`);
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length === 0 || body.length > MAX_BYTES) throw new Error(`unexpected size ${body.length}`);
      writeFileSync(j.dest, body);
      fetched++;
    } catch (error) {
      failures.push(`${j.vehicleId} #${j.index + 1}: ${(error as Error).message}`);
    }
  });

  // Manifest lists only files that exist, in gallery order.
  const manifest: Record<string, { file: string; sourceUrl: string }[]> = {};
  for (const j of jobs) {
    if (!existsSync(j.dest)) continue;
    (manifest[j.vehicleId] ??= []).push({ file: `${j.index + 1}.jpg`, sourceUrl: j.url });
  }
  writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
  const files = Object.values(manifest).flat().length;
  console.log(`Downloaded ${fetched}; manifest lists ${files} files for ${Object.keys(manifest).length} vehicles.`);
  if (failures.length) {
    console.warn(`${failures.length} failures (those positions fall back):\n  ${failures.join("\n  ")}`);
    process.exitCode = 1;
  }
}

async function main() {
  const jobs = planJobs();
  if (process.argv.includes("--download")) await download(jobs);
  else await estimate(jobs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
