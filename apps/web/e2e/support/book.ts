import { expect, type Page } from "@playwright/test";

/** The pages shown in book mode, e.g. "5–6", without the total (which can shift as figures load). */
export async function shownPages(page: Page): Promise<string> {
  const text = (await page.locator(".book-footer-pages").textContent()) ?? "";
  return text.replace(/^Page /, "").replace(/ of \d+$/, "");
}

/** Turns a page with the keyboard and waits until the turn has landed. */
export async function turnPage(page: Page, key: "ArrowRight" | "ArrowLeft" = "ArrowRight") {
  const before = await shownPages(page);
  await page.keyboard.press(key);
  await expect.poll(() => shownPages(page)).not.toBe(before);
}
