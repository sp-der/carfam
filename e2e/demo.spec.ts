import { test, expect } from "@playwright/test";

test("public pages render without horizontal overflow", async ({ page }, info) => {
  for (const path of ["/", "/contact-us", "/sell-my-car", "/find-my-car", "/finance-your-car", "/about-us", "/resources"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: `screenshots/${info.project.name}-resources.png`, fullPage: true });
});
test("chat applies make and budget, then preserves them on refinement", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Find my ride" }).click();
  await page.getByLabel("What are you looking for?").fill("Show me Hondas under $15k");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page).toHaveURL(/make=Honda.*priceMax=15000/);
  await expect(page.getByRole("log")).toContainText("1 matching vehicle");
  await page.getByLabel("What are you looking for?").fill("Only SUVs");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("No matches");
  await page.screenshot({ path: `screenshots/${info.project.name}-chat.png` });
  await page.getByRole("button", { name: "Close chat" }).click();
  await expect(page.getByRole("button", { name: "Find my ride" })).toBeFocused();
});
test("contact request arrives in the demo inbox", async ({ page }) => {
  await page.goto("/contact-us");
  await page.getByLabel("First name", { exact: true }).fill("BrowserSample");
  await page.getByLabel("Last name", { exact: true }).fill("Lead");
  await page.getByLabel("Email", { exact: true }).fill("browser@example.com");
  await page.getByLabel("Phone", { exact: true }).fill("5555550123");
  await page.getByLabel("Message", { exact: true }).fill("Synthetic browser verification request.");
  await page.getByRole("button", { name: "Save demo request" }).click();
  await expect(page.getByRole("status")).toContainText("Demo only—nothing was sent.");
  await page.goto("/admin/leads");
  await expect(page.getByRole("button", { name: "BrowserSample Lead" }).first()).toBeVisible();
});
test("demo roles restrict inventory controls and admin is explicitly unauthenticated", async ({ page }, info) => {
  await page.goto("/admin");
  await expect(page.getByText("Demo mode — no login.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add vehicle", exact: true })).toBeVisible();
  await page.getByLabel("Viewing as").selectOption("demo-sales-1");
  await expect(page.getByRole("button", { name: "Add vehicle", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reset demo data", exact: true })).toHaveCount(0);
  await page.screenshot({ path: `screenshots/${info.project.name}-admin.png`, fullPage: true });
});
test("appraisal manual branch validates and reaches a demo result", async ({ page }) => {
  await page.goto("/sell-my-car");
  await page.getByLabel("Year", { exact: true }).fill("2020");
  await page.getByLabel("Make", { exact: true }).fill("Honda");
  await page.getByLabel("Model", { exact: true }).fill("Civic");
  await page.getByLabel("Mileage", { exact: true }).fill("55000");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("First name", { exact: true }).fill("AppraisalSample");
  await page.getByLabel("Last name", { exact: true }).fill("Lead");
  await page.getByLabel("Email", { exact: true }).fill("appraisal@example.com");
  await page.getByLabel("Phone", { exact: true }).fill("5555550124");
  await page.getByLabel("ZIP code", { exact: true }).fill("92316");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Review your demo request")).toBeVisible();
  await page.getByRole("button", { name: "Save demo request" }).click();
  await expect(page.getByRole("status")).toContainText("Demo only—nothing was sent.");
});
test("unknown paths are real 404s", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
});
