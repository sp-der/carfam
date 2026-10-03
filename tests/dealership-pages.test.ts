import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DealershipPages } from "@/components/dealership/dealership-pages";
import { ABOUT_LINKS, isDealershipRoute } from "@/lib/dealership";
import policy from "@/lib/privacy-policy.json";

const render = (route: string) => renderToStaticMarkup(createElement(DealershipPages, {route}));
describe("About menu and reference pages", () => {
  it("retains the existing seven paths and highlights each current page", () => {
    expect(ABOUT_LINKS).toHaveLength(7);
    for (const {href} of ABOUT_LINKS) {
      expect(isDealershipRoute(href)).toBe(true);
      const html=render(href);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toMatch(new RegExp(`<a(?=[^>]*href="${href}")(?=[^>]*aria-current="page")[^>]*>`));
    }
    expect(isDealershipRoute("/finance-your-car")).toBe(false);
  });
  it("keeps careers informational with no applications, resume fields or openings", () => {
    const html=render("/careers");
    expect(html).toContain("Life at Carfam.");
    expect(html).toContain("great benefits and compensation");
    expect(html).not.toMatch(/<form|<input|<textarea|type="file"/);
    expect(html).not.toContain("Apply now");
  });
  it("exposes the contact fields and retains the explicit demo boundary", () => {
    const html=render("/contact-us");
    for(const name of ["firstName","lastName","email","phone","department","message"]) expect(html).toContain(`name="${name}"`);
    expect(html).toContain("Subject");
    expect(html).toContain("Save demo request");
    expect(html).toContain("Use sample contact details");
  });
  it("includes the supplied outreach subjects and assets without undated rankings", () => {
    const html=render("/used-car-dealer-serving-the-community-in-rialto");
    for (const phrase of ["CHOC", "Wheels for Wishes", "Make-A-Wish", "2017–2018", "How are we making an impact?"]) expect(html).toContain(phrase);
    expect(html).toContain("/brand/community-outreach.jpg");
    expect(html).toContain("current outreach and donation arrangements");
  });
  it("keeps ADA assistance separate from the supplied privacy policy", () => {
    const html=render("/ada-policy-statement");
    expect(html).toContain("ADA policy statement");
    expect(html).toContain("has not been supplied");
    expect(html).not.toContain("Sale Notice");
    expect(html).not.toContain("compliant with");
  });
  it("renders the entire policy including the sale notice and explains demo practices", () => {
    const html=render("/privacy-policy");
    expect(policy.at(-1)?.text).toContain("We may sell your personal information in the future.");
    for (const text of ["Definitions", "Types of Data Collected", "Transfer of Data", "Disclosure of Data", "Categories of Personal Information Collected", "Sale Notice"]) expect(html).toContain(text);
    expect(html).toContain("We may have sold your personal information");
    expect(html).toContain("integrations are active in this demo");
    expect(html).toContain("/policies/carfam-privacy-policy.pdf");
    const bytes=readFileSync("public/policies/carfam-privacy-policy.pdf");
    expect(bytes.subarray(0,5).toString()).toBe("%PDF-");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("fa82869f28dd91382f5a5cce44e39874c1eeea26ca1aef1d87ad69d0e2ea677e");
  });
});
