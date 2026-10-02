import type { NextConfig } from "next";
import { LEGACY_PAGE_REDIRECTS } from "./src/lib/inventory/legacy-routes";

const nextConfig: NextConfig = {
  // CLAUDE.md is the project's decision record; don't let `next dev` append generated rules to it.
  agentRules: false,
  images: {
    // Off by default: during Phase 2 verification on Windows (sharp 0.35.5) the optimizer
    // intermittently left some image/width requests hanging indefinitely, so a card photo
    // never loaded. The committed photos are already 1200×900 JPEGs (~115 KB). Set
    // CARFAM_IMAGE_OPTIMIZER=on to re-enable (e.g. on a host with its own optimizer).
    unoptimized: process.env.CARFAM_IMAGE_OPTIMIZER !== "on",
    // Only local, committed assets are allowed. Runtime never loads Carfam's photo server.
    localPatterns: [
      { pathname: "/vehicles/**", search: "" },
      { pathname: "/body-styles/**", search: "" },
      { pathname: "/customers/**", search: "" },
      { pathname: "/brand/**", search: "" },
    ],
    qualities: [70, 75],
    formats: ["image/webp"],
  },
  async redirects() {
    // Query strings are preserved by Next.js redirects.
    return Object.entries(LEGACY_PAGE_REDIRECTS).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
  async headers() {
    // Private demo: keep every response out of search indexes (noindex is not access control).
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
