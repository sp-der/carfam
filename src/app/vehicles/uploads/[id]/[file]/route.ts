import { readFile } from "node:fs/promises";
import path from "node:path";

/** Runtime uploads cannot rely on Next's startup-only public-file inventory. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !["1.jpg", "1-480.webp", "1-960.webp"].includes(file)) return new Response("Not found", { status: 404 });
  try {
    const directory = process.env.CARFAM_UPLOAD_DIR ?? path.join(process.cwd(), ".data", "photo-uploads");
    // Uploads are runtime state, not files to copy into the server build.
    const bytes = await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ directory, id, file));
    return new Response(bytes, { headers: { "Content-Type": file.endsWith(".webp") ? "image/webp" : "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
