import { expect, test } from "@playwright/test";
import { E2E_URL } from "../playwright.config";

test("the leaderboard races this week against last week", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Leaderboard");
  await expect(page.locator(".vs")).toContainText("This week");
  await expect(page.locator(".lb-record")).toHaveCount(6);
});

test("a public profile is off until turned on, shows only totals, and goes away when turned off", async ({
  page,
  browser,
}) => {
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const get = (path: string) => visitor.request.get(`${E2E_URL}${path}`);

  await page.goto("/share");
  await page.getByRole("textbox").fill("e2e-reader");
  await expect(page.getByRole("status").first()).toContainText("private");
  expect((await get("/u/e2e-reader")).status()).toBe(404);

  await page.getByRole("switch", { name: /Public profile/ }).click();
  await expect(page.getByRole("status").first()).toContainText("Your profile is public");
  await expect(page.getByRole("button", { name: "Copy" }).first()).toBeVisible();

  // A visitor without an account sees the profile, its images, and proof pages.
  const profile = await get("/u/e2e-reader");
  expect(profile.status()).toBe(200);
  const html = await profile.text();
  expect(html).toContain("Badges");
  expect(html).toContain("Designing Data-Intensive Applications");
  expect(html).not.toContain("reader@example.com");
  expect(html).toContain('property="og:image"');
  const card = await get("/u/e2e-reader/card.svg?theme=dark");
  expect(card.headers()["content-type"]).toContain("image/svg+xml");
  expect(card.headers()["cache-control"]).toContain("no-cache");
  expect((await get("/u/e2e-reader/badges/level.svg")).status()).toBe(200);
  expect((await get("/u/e2e-reader/badges/hundred.svg")).status()).toBe(404); // not earned
  expect((await get("/u/e2e-reader/card.png")).headers()["content-type"]).toBe("image/png");
  expect((await get("/u/e2e-reader/badge/level")).status()).toBe(200);

  // The book itself stays private.
  expect((await get("/books/ddia-2e/ch01")).url()).toContain("/login");

  await page.getByRole("switch", { name: /Public profile/ }).click();
  await expect(page.getByRole("status").first()).toContainText("private");
  expect((await get("/u/e2e-reader")).status()).toBe(404);
  expect((await get("/u/e2e-reader/card.svg")).status()).toBe(404);
  await visitor.close();
});
