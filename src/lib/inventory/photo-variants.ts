/**
 * Pre-generated photo sizes. `npm run photos:variants` writes `{n}-480.webp` and `{n}-960.webp` next to
 * every committed `public/vehicles/{sourceId}/{n}.jpg` (1200×900 originals). The runtime image
 * optimizer is off (see next.config.ts), so pages pick a size with srcset/sizes instead.
 */

export const PHOTO_VARIANT_WIDTHS = [480, 960] as const;
export const ORIGINAL_PHOTO_WIDTH = 1200;

/** Committed recon photos: `/vehicles/{id}/{n}.jpg`. Other images (future uploads) are served as-is. */
const COMMITTED_PHOTO = /^\/vehicles\/[\w-]+\/\d+\.jpg$/;

export function hasPhotoVariants(src: string): boolean {
  return COMMITTED_PHOTO.test(src);
}

export function photoVariantPath(src: string, width: (typeof PHOTO_VARIANT_WIDTHS)[number]): string {
  return src.replace(/\.jpg$/, `-${width}.webp`);
}

/** srcset for a committed photo (small WebP, medium WebP, original JPEG), or undefined. */
export function photoSrcSet(src: string): string | undefined {
  if (!hasPhotoVariants(src)) return undefined;
  return [
    ...PHOTO_VARIANT_WIDTHS.map((w) => `${photoVariantPath(src, w)} ${w}w`),
    `${src} ${ORIGINAL_PHOTO_WIDTH}w`,
  ].join(", ");
}
