import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FinancePages } from "@/components/finance/finance-pages";
import { ApplicationPreview } from "@/components/finance/application-preview";
import { APPLICATION_STEPS, FINANCE_LINKS, isFinanceRoute } from "@/lib/finance";
import { SITE_PAGES } from "@/lib/site-pages";

const vehicles = [{ id: "demo", title: "Demo vehicle", price: 1508500, disclosure: "Doc and smog included; tax and registration excluded." }];
const render = (route: string) => renderToStaticMarkup(createElement(FinancePages, { route, vehicles }));

describe("Financing experience and demo boundaries", () => {
  it("exposes all five captured menu paths without treating unrelated pages as financing", () => {
    expect(FINANCE_LINKS).toHaveLength(5);
    for (const { href } of FINANCE_LINKS) { expect(isFinanceRoute(href)).toBe(true); expect(SITE_PAGES[href]).toBeDefined(); }
    expect(isFinanceRoute("/contact-us")).toBe(false);
    expect(isFinanceRoute("/finance-your-car/unrecognized")).toBe(false);
  });
  it("renders every path with one page title and all financing links", () => {
    for (const { href } of FINANCE_LINKS) {
      const html = render(href);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      for (const item of FINANCE_LINKS) expect(html).toContain(`href="${item.href}"`);
      expect(html).toMatch(new RegExp(`<a(?=[^>]*href="${href}")(?=[^>]*aria-current="page")[^>]*>`));
      expect(html).not.toContain("<iframe");
      expect(html).not.toMatch(/https:\/\/[^" ]*(routeone|capitalone)/i);
      expect(html).not.toMatch(/<input[^>]*(ssn|birth|income|email|phone|address)/i);
    }
  });
  it("uses the shared fee-inclusive calculator for the department and bad credit pages", () => {
    for (const href of ["/finance-your-car", "/bad-credit-financing-in-bloomington-ca"]) {
      const html = render(href);
      expect(html).toContain("$15,085");
      expect(html).toContain("Doc and smog included; tax and registration excluded.");
      expect(html).toContain("APR you want to try");
      expect(html).toContain("not a lender rate or an offer");
    }
  });
  it("provides a fully translated private walkthrough with no personal-data fields", () => {
    const html = renderToStaticMarkup(createElement(ApplicationPreview, { spanish: true, vehicles }));
    expect(html).toContain('lang="es"');
    expect(html).toContain("Información personal");
    expect(html).toContain("Siguiente");
    expect(html).toContain("No solicitamos datos personales");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<form");
    expect(APPLICATION_STEPS.en).toHaveLength(5);
    expect(APPLICATION_STEPS.es).toHaveLength(5);
  });
  it("keeps Capital One distinct from the RouteOne preview", () => {
    const html = render("/capital-one-pre-qualify-then-shop");
    expect(html).toContain("Capital One demo preview");
    expect(html).toContain("not connected");
    expect(html).not.toContain("Interactive walkthrough");
    expect(html).not.toContain("<input");
  });
  it("offers a dedicated bad-credit conversation without approval guarantees", () => {
    const html = render("/bad-credit-financing-in-bloomington-ca");
    expect(html).toContain("Start where you are.");
    expect(html).toContain("nothing is guaranteed");
    expect(html).toContain("Carfam is located in Rialto");
  });
});
