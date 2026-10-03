import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getRepository } from "@/lib/data";
import { ReadOnlyError } from "@/lib/data/repository";
import { demoActor } from "@/lib/auth/demo-actor";
import { assertCan } from "@/lib/auth/permissions";
import { updateVehicle } from "@/lib/services/inventory-service";
import { allowRequest, sameOrigin } from "@/lib/request-limits";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origin not allowed." }, { status: 403 });
  if (
    !allowRequest(
      `photos:${request.headers.get("x-forwarded-for") ?? "local"}`,
      10,
    )
  )
    return Response.json(
      { error: "Please wait before uploading again." },
      { status: 429 },
    );
  if (Number(request.headers.get("content-length") ?? 0) > 9 * 1024 * 1024)
    return Response.json(
      { error: "Maximum photo size is 8 MB." },
      { status: 413 },
    );
  try {
    const data = await request.formData();
    const repo = getRepository();
    const actor = await demoActor(repo, data.get("actor"));
    assertCan(actor, "inventory:manage-photos");
    const info = await repo.info();
    if (info.readOnly)
      throw new ReadOnlyError(info.readOnlyReason ?? "read-only hosting");
    const vehicle = await repo.getVehicle(String(data.get("vehicleId")));
    if (!vehicle)
      return Response.json({ error: "Vehicle not found." }, { status: 404 });
    if (vehicle.images.length >= 40)
      return Response.json(
        { error: "Maximum 40 photos per vehicle." },
        { status: 422 },
      );
    const file = data.get("photo");
    if (
      !(file instanceof File) ||
      file.size > 8 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return Response.json(
        { error: "Use JPEG, PNG or WebP under 8 MB." },
        { status: 422 },
      );
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40_000_000,
    }).rotate();
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
      return Response.json(
        { error: "Unsupported image contents." },
        { status: 422 },
      );
    // Runtime files are external state, never build-time assets to trace into the bundle.
    const dir = path.join(/* turbopackIgnore: true */ process.env.CARFAM_UPLOAD_DIR ?? path.join(process.cwd(), ".data", "photo-uploads"), randomUUID());
    await mkdir(dir, { recursive: true });
    const original = await image
      .resize(1200, 900, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await Promise.all([
      writeFile(path.join(dir, "1.jpg"), original),
      sharp(original)
        .resize(480)
        .webp({ quality: 75 })
        .toFile(path.join(dir, "1-480.webp")),
      sharp(original)
        .resize(960)
        .webp({ quality: 75 })
        .toFile(path.join(dir, "1-960.webp")),
    ]);
    const src = `/vehicles/uploads/${path.basename(dir)}/1.jpg`;
    const updated = await updateVehicle(
      repo,
      actor,
      vehicle.id,
      {
        images: [
          ...vehicle.images,
          {
            src,
            alt: `${vehicle.title} — uploaded photo`,
            sourceUrl: null,
            origin: "upload",
          },
        ],
      },
      String(data.get("updatedAt")),
    );
    return Response.json({ vehicle: updated });
  } catch (error) {
    const e = error as Error & { status?: number };
    return Response.json(
      {
        error: e.status
          ? e.message
          : "Photo could not be saved. Check that hosting supports writable files.",
      },
      { status: e.status ?? 400 },
    );
  }
}
