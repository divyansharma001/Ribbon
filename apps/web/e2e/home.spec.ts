import { expect, test } from "@playwright/test";
import { E2E_URL } from "../playwright.config";
import { useDevice } from "./support/device";

test("home shows where you were, the streak, and saves the daily goal", async ({
  page,
  context,
}) => {
  await useDevice(context, E2E_URL, "device-home-0006", "Mac · Chrome");
  // A browser time zone that Postgres does not know by this name (regression).
  await page.addInitScript(() => {
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () {
      return { ...original.call(this), timeZone: "Asia/Calcutta" };
    };
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Test Reader".split(" ")[0] ?? "",
  );
  // "Continue reading" once there is a saved spot, "Start reading" on a fresh account.
  await expect(page.locator(".home-continue .home-eyebrow")).toHaveText(
    /Continue reading|Start reading/,
  );
  await expect(page.locator("#streak-title")).toContainText(/\d+ days?/);
  await expect(
    page
      .locator(
        '.streak-calendar .streak-day[data-status="pending"], .streak-calendar .streak-day[data-status="met"]',
      )
      .last(),
  ).toBeVisible();

  await page.getByRole("button", { name: "20 min" }).click();
  await expect(page.getByRole("button", { name: "20 min" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "20 min" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".home-streak-note")).toContainText(/20 minutes left|done|repair/);
});
