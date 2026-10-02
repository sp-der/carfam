"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight, CloseIcon, ExpandIcon } from "@/components/icons";
import { VehicleFallback } from "@/components/vehicles/vehicle-image";
import { VehiclePhoto } from "@/components/vehicles/vehicle-photo";

interface Photo {
  src: string;
  alt: string;
}

/** Horizontal swipe detection shared by the inline viewer and the lightbox. */
function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType !== "mouse") start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y)) (dx > 0 ? onPrev : onNext)();
    },
  };
}

/**
 * Vehicle gallery: arrows, keyboard (←/→ when focused), swipe, image count, thumbnails and a
 * full-screen viewer (native dialog: Escape closes, focus returns). Photos keep the dealer frame.
 */
export function PhotoGallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<ReadonlySet<number>>(new Set());
  const dialog = useRef<HTMLDialogElement>(null);
  const count = photos.length;
  const prev = () => setIndex((i) => (i - 1 + count) % count);
  const next = () => setIndex((i) => (i + 1) % count);
  const swipe = useSwipe(prev, next);

  if (count === 0) return <VehicleFallback title={title} className="rounded-[3px]" />;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    }
  };
  const photo = photos[index];
  const markBroken = (i: number) => setBroken((b) => new Set(b).add(i));

  const arrow =
    "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-paper/95 text-ink shadow-[0_1px_4px_rgb(0_0_0/0.3)] hover:bg-paper";

  return (
    <section aria-roledescription="carousel" aria-label={`${title} photos`}>
      <div
        className="relative touch-pan-y select-none overflow-hidden rounded-[3px] bg-mist"
        tabIndex={0}
        onKeyDown={onKey}
        aria-label={`Photo ${index + 1} of ${count}. Use the left and right arrow keys to browse.`}
        {...swipe}
      >
        {broken.has(index) ? (
          <VehicleFallback title={title} />
        ) : (
          <VehiclePhoto
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            use="gallery"
            priority={index === 0}
            onError={() => markBroken(index)}
            className="aspect-[4/3] h-auto w-full object-cover"
            draggable={false}
          />
        )}
        {count > 1 ? (
          <>
            <button type="button" onClick={prev} className={`${arrow} left-3`} aria-label="Previous photo">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={next} className={`${arrow} right-3`} aria-label="Next photo">
              <ChevronRight className="size-6" />
            </button>
          </>
        ) : null}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="rounded-sm bg-graphite/85 px-2.5 py-1 text-sm font-semibold text-paper tabular" aria-hidden>
            {index + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-sm bg-graphite/85 px-2.5 text-sm font-semibold text-paper hover:bg-graphite"
          >
            <ExpandIcon className="size-4" />
            View larger
          </button>
        </div>
      </div>

      {count > 1 ? (
        <ul className="scroll-x mt-3 flex gap-2 pb-1">
          {photos.map((p, i) => (
            <li key={p.src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className="block w-24 overflow-hidden rounded-[3px] opacity-70 ring-cyan-ink transition-opacity hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:ring-3 sm:w-28"
              >
                {broken.has(i) ? (
                  <span className="block aspect-[4/3] bg-graphite-2" />
                ) : (
                  <VehiclePhoto
                    src={p.src}
                    alt=""
                    use="thumb"
                    onError={() => markBroken(i)}
                    className="aspect-[4/3] h-auto w-full object-cover"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialog}
        aria-label={`${title} photos, full screen`}
        onKeyDown={onKey}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
        className="on-dark m-0 h-dvh max-h-none w-full max-w-none bg-graphite p-0 text-paper"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <p className="text-sm font-semibold tabular" aria-live="polite">
              Photo {index + 1} of {count}
            </p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
              aria-label="Close photo viewer"
            >
              <CloseIcon className="size-6" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 pb-4 sm:px-16" {...swipe}>
            {broken.has(index) ? (
              <VehicleFallback title={title} className="max-w-3xl" />
            ) : (
              <VehiclePhoto
                key={`lb-${photo.src}`}
                src={photo.src}
                alt={photo.alt}
                use="full"
                className="h-auto max-h-full w-auto max-w-full object-contain"
                draggable={false}
              />
            )}
            {count > 1 ? (
              <>
                <button type="button" onClick={prev} className={`${arrow} left-2 sm:left-4`} aria-label="Previous photo">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={next} className={`${arrow} right-2 sm:right-4`} aria-label="Next photo">
                  <ChevronRight className="size-6" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </dialog>
    </section>
  );
}
