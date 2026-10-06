import { expect, test } from "@playwright/test";
import { E2E_URL } from "../playwright.config";
import { useDevice, useMode } from "./support/device";

test("a citation opens in place and closes without moving the page", async ({ page, context }) => {
  await useDevice(context, E2E_URL, "device-popup-0001", "Mac · Chrome");
  await useMode(page, "scroll");
  await page.goto("/books/ddia-2e/ch02");

  const marker = page.locator('[id="sec_introduction_twitter.2"] [data-noteref]').first();
  await marker.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => [window.scrollY, location.hash]);
  await marker.click();

  const popup = page.getByRole("dialog");
  await expect(popup).toBeVisible();
  await expect(popup).toContainText("Reference");
  await expect(popup.getByRole("link", { name: "Show in references" })).toBeVisible();
  expect(await page.evaluate(() => [window.scrollY, location.hash])).toEqual(before);

  await page.keyboard.press("Escape");
  await expect(popup).toBeHidden();
  await expect(marker).toBeFocused();
});

test("a glossary term in italics shows its definition", async ({ page, context }) => {
  await useDevice(context, E2E_URL, "device-popup-0002", "Mac · Chrome");
  await useMode(page, "scroll");
  await page.goto("/books/ddia-2e/ch02");

  const term = page.locator('[data-term="backpressure"]').first();
  await term.scrollIntoViewIfNeeded();
  await term.click();
  const popup = page.getByRole("dialog", { name: "backpressure" });
  await expect(popup).toContainText("Forcing the sender of data to slow down");

  // A tap anywhere else closes it.
  await page.mouse.click(5, 300);
  await expect(popup).toBeHidden();
});

test("opening a book page from a link never scrolls the pages out of place", async ({
  page,
  context,
}) => {
  await useDevice(context, E2E_URL, "device-popup-0003", "iPhone · Safari");
  await useMode(page, "book");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/books/ddia-2e/ch02#sec_introduction_percentiles.6");
  await expect(page.locator(".book-footer-pages")).toHaveText(/^Page \d+ of \d+$/);
  const scrolled = await page.evaluate(() => {
    const w = document.querySelector(".book-window");
    return w ? [w.scrollLeft, w.scrollTop] : null;
  });
  expect(scrolled).toEqual([0, 0]);
});
