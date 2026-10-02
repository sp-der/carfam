"use client";

import { useState } from "react";
import { CheckIcon, ShareIcon } from "@/components/icons";

/** Native share sheet where available, otherwise copy the link. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold transition-colors hover:border-ink"
    >
      {copied ? <CheckIcon className="size-4 text-cyan-ink" /> : <ShareIcon className="size-4" />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
