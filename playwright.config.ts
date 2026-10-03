import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev:backend",
      url: "http://localhost:4000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "npm run dev:admin",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "npm run dev:frontend",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
