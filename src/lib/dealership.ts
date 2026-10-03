export const ABOUT_LINKS = [
  { label: "About the Dealership", href: "/about-us" },
  { label: "Contact Us", href: "/contact-us" },
  { label: "Meet Our Staff", href: "/meet-our-team" },
  { label: "Community Outreach", href: "/used-car-dealer-serving-the-community-in-rialto" },
  { label: "Careers", href: "/careers" },
  { label: "ADA Policy Statement", href: "/ada-policy-statement" },
  { label: "Privacy Policy", href: "/privacy-policy" },
] as const;
export function isDealershipRoute(route: string) {
  return ABOUT_LINKS.some((item) => item.href === route);
}
