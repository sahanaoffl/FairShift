import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      USE_MEMORY_DB: "true",
      NEXT_PUBLIC_DEMO: "true",
      SESSION_SECRET: "fairshift-playwright-session-secret-0123456789",
      TRACKING_SALT: "fairshift-playwright-tracking-salt",
      GOOGLE_CLOUD_PROJECT: "",
      GOOGLE_CLOUD_LOCATION: "",
    },
  },
});
