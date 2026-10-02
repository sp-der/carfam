/**
 * Dealership facts used across the public site. Values come from the recon package
 * (`carfam-recon/data/dealership.json`, main-site sources). Conflicting values found elsewhere
 * are listed in docs/PHASE0_PLAN.md §8 and stay out of the UI until the owner confirms them.
 */

export const DEALER = {
  name: "Carfam",
  legalName: "CARFAM",
  street: "1731 South Cactus Ave",
  city: "Rialto",
  region: "CA",
  postalCode: "92316",
  salesPhone: "909-543-1450",
  /** Purpose-labeled: the original "Text Link to Phone" number. Texting is disabled in the demo. */
  textPhone: "909-251-7182",
  email: "sales@carfam.com",
  timezone: "America/Los_Angeles",
  directionsUrl:
    "https://www.google.com/maps/dir/?api=1&destination=1731+South+Cactus+Ave%2C+Rialto%2C+CA+92316",
  social: [
    { label: "Facebook", href: "https://www.facebook.com/carFAMdealer" },
    { label: "Instagram", href: "https://www.instagram.com/carfam_dealer" },
    { label: "X", href: "https://x.com/CARFAMdealer" },
    { label: "YouTube", href: "https://www.youtube.com/@carfamdealer7066" },
  ],
} as const;

/** Main-site sales hours. A Capital One page lists 9–9 Mon–Sat; pending owner confirmation. */
export const SALES_HOURS: readonly { days: string; hours: string }[] = [
  { days: "Monday – Saturday", hours: "9:00 AM – 8:00 PM" },
  { days: "Sunday", hours: "10:00 AM – 7:00 PM" },
];
export const HOURS_REVIEW_NOTE = "Hours from the main Carfam site, pending dealer confirmation.";

export function telHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, "")}`;
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Capture start of the recon snapshot (see data/seed/inventory.seed.json `source.snapshotStartedAt`). */
export const SNAPSHOT_AT = "2026-10-02T20:49:02Z";
export const SNAPSHOT_DATE_LABEL = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "America/Los_Angeles",
}).format(new Date(SNAPSHOT_AT));
export const SNAPSHOT_NOTICE = `Demo snapshot of Carfam's inventory captured ${SNAPSHOT_DATE_LABEL}. Not live stock.`;

/** Primary navigation. Pages other than inventory arrive in Phase 3. */
export const MAIN_NAV: readonly { label: string; href: string }[] = [
  { label: "Inventory", href: "/pre-owned-cars" },
  { label: "Financing", href: "/finance-your-car" },
  { label: "Sell your car", href: "/sell-my-car" },
  { label: "About", href: "/about-us" },
  { label: "Resources", href: "/resources" },
];
