"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Vehicle photo at a fixed 4:3 frame (the source photos are 1200×900 with the dealer's watermark
 * frame, shown uncropped). Missing or broken images fall back to a labeled placeholder.
 */
export function VehicleImage({
  image,
  title,
  sizes,
  priority = false,
  className = "",
}: {
  image: { src: string; alt: string } | null;
  title: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return <VehicleFallback title={title} className={className} />;
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={1200}
      height={900}
      sizes={sizes}
      quality={70}
      priority={priority}
      onError={() => setFailed(true)}
      className={`aspect-[4/3] h-auto w-full bg-mist object-cover ${className}`}
    />
  );
}

export function VehicleFallback({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`${title}: photos coming soon`}
      className={`grid aspect-[4/3] w-full place-items-center bg-graphite-2 text-center ${className}`}
    >
      <div className="px-4">
        <Image src="/brand/carfam-logo.png" alt="" width={351} height={66} className="mx-auto h-auto w-24 opacity-90" />
        <p className="mt-3 text-sm font-medium text-fog">Photos coming soon</p>
      </div>
    </div>
  );
}
