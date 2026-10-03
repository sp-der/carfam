import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    ...[375, 390, 430].map((width) => ({ name: `mobile-${width}`, use: { browserName: "chromium" as const, viewport: { width, height: 844 }, isMobile: true, hasTouch: true } })),
  ],
  webServer: { command: "npm run dev -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, env: { CARFAM_DATA_FILE: ".data/browser-tests.json", NEXT_TELEMETRY_DISABLED: "1" } },
});
