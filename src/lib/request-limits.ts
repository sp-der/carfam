import { createHash } from "node:crypto";

const buckets = new Map<string, { count: number; expires: number }>();
/** Single-process demo limiter. Replace with a shared durable limiter before production. */
export function allowRequest(key: string, limit = 15, now = Date.now(), windowMs = 60_000): boolean {
  for (const [k, v] of buckets) if (v.expires <= now) buckets.delete(k);
  const id = createHash("sha256").update(key).digest("hex");
  const current = buckets.get(id);
  if (current && current.expires > now) {
    if (current.count >= limit) return false;
    current.count += 1;
  } else {
    if (buckets.size >= 10_000) return false;
    buckets.set(id, { count: 1, expires: now + windowMs });
  }
  return true;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    // Next may normalize request.url to localhost internally; Host retains the requested site.
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return ["http:", "https:"].includes(source.protocol) && source.host === host;
  } catch { return false; }
}
