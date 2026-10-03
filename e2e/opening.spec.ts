import { test, expect } from "@playwright/test";

test("opening logo reveal ends and stays dismissed for the tab session", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByTestId("carfam-opening")).toBeVisible();
  await page.screenshot({
    path: `screenshots/${info.project.name}-opening.png`,
  });
  await expect(page.getByTestId("carfam-opening")).toHaveCount(0, {
    timeout: 3000,
  });
  await page.reload();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByTestId("carfam-opening")).toHaveCount(0);
});

test("opening respects reduced motion and direct inventory entry", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByTestId("carfam-opening")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/pre-owned-cars");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByTestId("carfam-opening")).toHaveCount(0);
});

test("opening is immediately skippable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Skip intro" }).click();
  await expect(page.getByTestId("carfam-opening")).toHaveCount(0);
});
