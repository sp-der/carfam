/**
 * Build `data/seed/inventory.seed.json` from the recon package.
 *
 *   npm run import:recon
 *
 * Reads `carfam-recon/data/inventory.json` plus each vehicle's captured VDP HTML
 * (`source_html`) for description, tagline, packages, highlights and equipment rows,
 * which the JSON leaves empty. Photos come from `public/vehicles/manifest.json`
 * (written by `npm run photos:copy`); vehicles without copied photos get no images
 * and render the fallback.
 *
 * Output is deterministic: running it twice produces an identical file. The seed
 * never touches the runtime store directly; the store merges it insert-only.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import {
  cleanText,
  normalizeBodyType,
  normalizeDrivetrain,
  normalizeFuelType,
  normalizeTransmission,
} from "../src/lib/inventory/normalize";
import { dollarsToCents } from "../src/lib/inventory/pricing";
import { vehicleSchema, type Vehicle } from "../src/lib/inventory/types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RECON = path.join(ROOT, "carfam-recon");
const OUT = path.join(ROOT, "data", "seed", "inventory.seed.json");
const PHOTO_MANIFEST = path.join(ROOT, "public", "vehicles", "manifest.json");

// Owner-approved homepage picks, in display order. Keep re-imports deterministic.
const FEATURED_RANK_BY_SOURCE_ID: Record<string, number> = {
  "1573124": 1, // 2021 Toyota RAV4 XLE Premium
  "1581603": 2, // 2022 Chevrolet Silverado 1500 LTD Custom
  "1512247": 3, // 2021 Toyota Corolla Hybrid LE
  "1545135": 4, // 2018 Tesla Model 3 Long Range Battery
  "1581604": 5, // 2020 Kia Telluride SX
  "1570774": 6, // 2023 Toyota Tacoma 4WD TRD Off Road
  "1574790": 7, // 2024 Chevrolet Malibu LT
  "1592525": 8, // 2022 Cadillac Escalade Sport
};

export interface ReconVehicle {
  id: string;
  detail_url: string;
  snapshot_at: string;
  title: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  stock_number: string;
  vin: string;
  mileage: number;
  exterior_color: string | null;
  interior_color: string | null;
  internet_price: number;
  doc_fee: number;
  smog_fee: number;
  sale_price: number;
  mpg_highway: number | null;
  mpg_city: number | null;
  drivetrain: string | null;
  transmission: string | null;
  engine: string | null;
  horsepower: string | null;
  torque: string | null;
  style: string | null;
  body_type: string | null;
  fuel_type: string | null;
  monroney_urls: string[];
  image_urls: string[];
  data_quality_flags: string[];
  source_html: string;
  field_sources?: Record<string, unknown>;
  has_placeholder_image: boolean;
}

export type PhotoManifest = Record<string, { file: string; sourceUrl: string }[]>;

/** Owner-review flags found in Phase 0 by comparing records with Carfam's own filter facets. */
const REVIEW_FLAGS: Record<string, string[]> = {
  "1530885": [
    "Body type: recorded as Coupe, but Carfam's own Coupe filter did not include this vehicle (its facet counts imply Sedan). Confirm.",
  ],
  "1545135": ["Body type unknown in the capture (Carfam's facet counts imply Sedan). Confirm before setting."],
};

const HISTORY_CLAIM = /carfax|one[- ]owner|1[- ]owner/i;

export interface VdpExtract {
  tagline: string | null;
  description: string | null;
  packages: { name: string; msrpCents: number | null; included: boolean; reviewFlag: string | null }[];
  highlights: string[];
  equipment: { exterior: string[]; interior: string[]; safety: string[] };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function extractVdp(html: string): VdpExtract {
  const $ = cheerio.load(html);

  const tagline = cleanText($("#ds-vdp-vehicle-title-container h3.ds-vdp-vehicle-sub-title").first().text());

  const descEl = $("#ds-vdp-description").first().clone();
  descEl.find("br").replaceWith("\n");
  descEl.find("p, div").each((_, el) => {
    $(el).append("\n\n");
  });
  const description =
    descEl
      .text()
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() || null;

  const rawPackages = $("#ds-vdp-packages .ds-vdp-features-container .ds-vdp-feature-row")
    .toArray()
    .map((row) => {
      const name = cleanText($(row).find("h5").first().text()) ?? "";
      const value = cleanText($(row).find(".value").first().text()) ?? "";
      const money = /^\$([\d,]+(?:\.\d{2})?)$/.exec(value);
      return {
        name,
        msrpCents: money ? dollarsToCents(Number(money[1].replace(/,/g, ""))) : null,
        included: /^included$/i.test(value),
      };
    })
    .filter((p) => p.name);
  const seen = new Map<string, number>();
  for (const p of rawPackages) {
    const key = `${p.name}|${p.msrpCents}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const packages = rawPackages.map((p) => ({
    ...p,
    reviewFlag:
      (seen.get(`${p.name}|${p.msrpCents}`) ?? 0) > 1
        ? "Listed more than once in the source with the same price. Confirm with the dealer before advertising."
        : null,
  }));

  const highlights = dedupe(
    $("#ds-vdp-highlights .ds-vdp-highlight-title")
      .toArray()
      .map((el) => cleanText($(el).text()))
      .filter((x): x is string => !!x),
  );

  const pane = (id: string) =>
    dedupe(
      $(`#${id} .ds-vdp-feature-row`)
        .toArray()
        .map((row) => cleanText($(row).children().first().text()))
        .filter((x): x is string => !!x),
    );

  return {
    tagline,
    description,
    packages,
    highlights,
    equipment: {
      exterior: pane("ds-vdp-spec-exterior-pane"),
      interior: pane("ds-vdp-spec-interior-pane"),
      safety: pane("ds-vdp-spec-safety-pane"),
    },
  };
}

export function toVehicle(r: ReconVehicle, vdp: VdpExtract, photos: PhotoManifest[string] | undefined): Vehicle {
  const pricing = {
    internetPriceCents: dollarsToCents(r.internet_price),
    docFeeCents: dollarsToCents(r.doc_fee),
    smogFeeCents: dollarsToCents(r.smog_fee),
    otherFees: [],
  };
  const sum = pricing.internetPriceCents + pricing.docFeeCents + pricing.smogFeeCents;
  if (sum !== dollarsToCents(r.sale_price)) {
    throw new Error(`Pricing arithmetic mismatch for ${r.id}: ${sum} vs ${r.sale_price}`);
  }

  const flags = [...r.data_quality_flags, ...(REVIEW_FLAGS[r.id] ?? [])];
  if (vdp.description && HISTORY_CLAIM.test(vdp.description)) {
    flags.push(
      "Description mentions vehicle history (e.g. CARFAX or one-owner), but no history report was captured. Shown only as dealer text; no badges.",
    );
  }
  if (vdp.packages.some((p) => p.reviewFlag)) flags.push("Duplicate package/option rows in the source.");

  const slug = new URL(r.detail_url).pathname.split("/detail/")[1].split("/")[0];

  return vehicleSchema.parse({
    id: `veh_${r.id}`,
    sourceId: r.id,
    slug,
    vin: r.vin.toUpperCase(),
    stockNumber: r.stock_number,
    year: r.year,
    make: r.make,
    model: r.model,
    trim: cleanText(r.trim),
    title: cleanText(r.title),
    tagline: vdp.tagline,
    style: cleanText(r.style),
    mileage: Math.round(r.mileage),
    exteriorColor: cleanText(r.exterior_color),
    interiorColor: cleanText(r.interior_color),
    bodyType: normalizeBodyType(r.body_type),
    fuelType: normalizeFuelType(r.fuel_type),
    drivetrain: normalizeDrivetrain(r.drivetrain),
    drivetrainLabel: cleanText(r.drivetrain),
    transmission: normalizeTransmission(r.transmission),
    engine: cleanText(r.engine),
    horsepower: cleanText(r.horsepower),
    torque: cleanText(r.torque),
    mpgCity: r.mpg_city,
    mpgHighway: r.mpg_highway,
    description: vdp.description,
    pricing,
    status: "available",
    publication: "published",
    featured: FEATURED_RANK_BY_SOURCE_ID[r.id] !== undefined,
    featuredRank: FEATURED_RANK_BY_SOURCE_ID[r.id] ?? null,
    images: (photos ?? []).map((p, i) => ({
      src: `/vehicles/${r.id}/${p.file}`,
      alt: `${cleanText(r.title)} — photo ${i + 1}`,
      sourceUrl: p.sourceUrl,
      origin: "recon",
    })),
    hasPlaceholderImage: r.has_placeholder_image,
    packages: vdp.packages,
    highlights: vdp.highlights,
    equipment: vdp.equipment,
    documents: r.monroney_urls.map((url) => ({ kind: "window-sticker", url })),
    dataQualityFlags: flags,
    fieldSources: r.field_sources ?? {},
    snapshotAt: r.snapshot_at,
    sourceHtmlPath: `carfam-recon/${r.source_html}`,
    firstPublishedAt: r.snapshot_at,
    createdAt: r.snapshot_at,
    updatedAt: r.snapshot_at,
    staffEditedAt: null,
  });
}

interface CategoryPage {
  url: string;
  visible_vehicle_ids: string[];
}

/**
 * Carfam's own single-criterion filter pages (`/filter/fuel/X`, `/filter/bodytype/X`) list
 * vehicles under that value. Listing is per-vehicle evidence, so it fills nulls and
 * overrides conflicting record values, each change recorded in fieldSources and flagged.
 */
export function applyCategoryEvidence(vehicles: Vehicle[], categories: CategoryPage[]): Vehicle[] {
  const byId = new Map(vehicles.map((v) => [v.sourceId, v]));
  for (const page of categories) {
    const m = /\/pre-owned-cars\/filter\/(fuel|bodytype)\/([^/?]+)$/i.exec(new URL(page.url).pathname);
    if (!m) continue;
    const field = m[1].toLowerCase() === "fuel" ? "fuelType" : "bodyType";
    const value = field === "fuelType" ? normalizeFuelType(m[2]) : normalizeBodyType(m[2]);
    if (!value) continue;
    for (const id of page.visible_vehicle_ids) {
      const v = byId.get(id);
      if (!v || v[field] === value) continue;
      const previous = v[field];
      (v as Record<string, unknown>)[field] = value;
      v.fieldSources = { ...v.fieldSources, [field]: { url: page.url, evidence: "Listed on Carfam's own filter page for this value." } };
      v.dataQualityFlags = [
        ...v.dataQualityFlags,
        `${field === "fuelType" ? "Fuel" : "Body"} type set to "${value}" from Carfam's own filter page (record said ${previous ?? "unknown"}). Confirm.`,
      ];
    }
  }
  return vehicles;
}

export function buildSeed(reconRoot = RECON, photoManifestPath = PHOTO_MANIFEST) {
  const inventory = JSON.parse(readFileSync(path.join(reconRoot, "data", "inventory.json"), "utf8")) as {
    snapshot_started_at: string;
    snapshot_ended_at: string;
    source_inventory_count: number;
    vehicles: ReconVehicle[];
  };
  const photos: PhotoManifest = existsSync(photoManifestPath)
    ? JSON.parse(readFileSync(photoManifestPath, "utf8"))
    : {};

  const categories = JSON.parse(
    readFileSync(path.join(reconRoot, "data", "inventory_categories.json"), "utf8"),
  ) as CategoryPage[];

  const vehicles = applyCategoryEvidence(
    inventory.vehicles.map((r) => {
      const html = readFileSync(path.join(reconRoot, r.source_html), "utf8");
      return toVehicle(r, extractVdp(html), photos[r.id]);
    }),
    categories,
  ).map((v) => vehicleSchema.parse(v));

  const ids = new Set(vehicles.map((v) => v.sourceId));
  const vins = new Set(vehicles.map((v) => v.vin));
  if (ids.size !== vehicles.length || vins.size !== vehicles.length) throw new Error("Duplicate ids or VINs in recon data");

  return {
    seedVersion: 1,
    label: "Demo snapshot data captured from carfam.com on 2026-10-02. Not live inventory.",
    source: {
      snapshotStartedAt: inventory.snapshot_started_at,
      snapshotEndedAt: inventory.snapshot_ended_at,
      sourceInventoryCount: inventory.source_inventory_count,
      vehiclesWithCopiedPhotos: vehicles.filter((v) => v.images.length > 0).length,
    },
    vehicles,
  };
}

function main() {
  const seed = buildSeed();
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(seed, null, 1) + "\n", "utf8");
  const v = seed.vehicles;
  const count = (pred: (x: Vehicle) => boolean) => v.filter(pred).length;
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
  console.log(
    [
      `vehicles: ${v.length}`,
      `with description: ${count((x) => !!x.description)}`,
      `with packages: ${count((x) => x.packages.length > 0)}`,
      `with highlights: ${count((x) => x.highlights.length > 0)}`,
      `with tagline: ${count((x) => !!x.tagline)}`,
      `with copied photos: ${count((x) => x.images.length > 0)}`,
      `unknown body: ${count((x) => !x.bodyType)}`,
      `unknown fuel: ${count((x) => !x.fuelType)}`,
    ].join("\n"),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
