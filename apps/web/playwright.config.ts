import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run a production build against the TEST database
 * (see docker-compose.yml), on its own port so the dev server can keep running.
 */
export const E2E_PORT = 3211;
export const E2E_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://ribbon:ribbon@localhost:5433/ribbon_test";
export const E2E_SECRET = "e2e-only-secret-not-used-anywhere-else-0123456789";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: E2E_URL,
    storageState: "e2e/.auth/state.json",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 860 },
  },
  webServer: {
    command: `pnpm exec next build && pnpm exec next start --port ${E2E_PORT}`,
    url: `${E2E_URL}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: E2E_URL,
      BETTER_AUTH_SECRET: E2E_SECRET,
      GOOGLE_CLIENT_ID: "e2e",
      GOOGLE_CLIENT_SECRET: "e2e",
      ALLOWED_EMAIL: "reader@example.com",
      BLOB_READ_WRITE_TOKEN: "",
      BLOB_STORE_ID: "",
    },
  },
});
