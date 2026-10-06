import { expect, test } from "@playwright/test";
import { E2E_DATABASE_URL, E2E_SECRET, E2E_URL } from "../playwright.config";
import { createTestLogin } from "./support/test-auth";

/** A second signed-in browser for the same reader, like opening Ribbon on another device. */
async function otherDevice(browser: import("@playwright/test").Browser) {
  const { cookies } = await createTestLogin({
    databaseUrl: E2E_DATABASE_URL,
    secret: E2E_SECRET,
    baseURL: E2E_URL,
  });
  const context = await browser.newContext({ storageState: { cookies, origins: [] } });
  return { context, page: await context.newPage() };
}

test("reading settings save to the account and follow the reader to another device", async ({
  page,
  browser,
}) => {
  await page.goto("/settings");
  const html = page.locator("html");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Large", exact: true }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveAttribute("data-text-size", "large");
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(html).toHaveAttribute("data-text-size", "large");

  // Another device with none of this browser's cookies gets the same settings.
  const other = await otherDevice(browser);
  await other.page.goto("/");
  await expect(other.page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(other.page.locator("html")).toHaveAttribute("data-text-size", "large");
  await other.context.close();

  // Put them back for the other tests.
  const res = await page.request.post("/api/settings", {
    data: { theme: "system", textSize: "medium" },
  });
  expect(res.status()).toBe(204);
});

test("the settings API refuses bad values and visitors without a session", async ({
  page,
  browser,
}) => {
  expect((await page.request.post("/api/settings", { data: { theme: "neon" } })).status()).toBe(
    400,
  );
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const res = await visitor.request.post(`${E2E_URL}/api/settings`, { data: { theme: "dark" } });
  expect(res.status()).toBe(401);
  await visitor.close();
});

test("notes export as a Markdown file", async ({ page }) => {
  const res = await page.request.get("/api/books/ddia-2e/notes");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/markdown");
  expect(res.headers()["content-disposition"]).toContain("ribbon-notes-ddia-2e.md");
  expect(await res.text()).toMatch(/^# Designing Data-Intensive Applications/);
});

test("signing out ends the session", async ({ browser }) => {
  // Its own session, so the other tests stay signed in.
  const other = await otherDevice(browser);
  await other.page.goto("/settings");
  await other.page.getByRole("button", { name: "Sign out" }).click();
  await expect(other.page).toHaveURL(/\/login/);
  await other.page.goto("/");
  await expect(other.page).toHaveURL(/\/login/);
  await other.context.close();
});
