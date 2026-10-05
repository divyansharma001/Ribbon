import { expect, type Page, test } from "@playwright/test";
import { E2E_URL } from "../playwright.config";
import { useDevice } from "./support/device";

test.describe.configure({ mode: "serial" });

const CHAPTER = "/books/ddia-2e/ch06";
const pages = (page: Page) => page.locator(".book-footer-pages");

/** True when an element's first piece is inside the visible book. */
async function onScreen(page: Page, id: string) {
  return page.evaluate((target) => {
    const book = document.querySelector(".book")?.getBoundingClientRect();
    const r = document.getElementById(target)?.getClientRects()[0];
    return !!book && !!r && r.left >= book.left - 1 && r.right <= book.right + 1;
  }, id);
}

test.describe("on a 14-inch Mac", () => {
  test.use({ viewport: { width: 1512, height: 982 } });

  test("opens as a two-page book and turns pages with the keyboard", async ({ page, context }) => {
    await useDevice(context, E2E_URL, "device-book-0003", "Mac · Safari");
    await page.goto(CHAPTER);
    await expect(page.locator('.book[data-spread="true"]')).toBeVisible();
    await expect(pages(page)).toHaveText(/^Page 1–2 of \d+$/);

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(800);
    }
    await expect(pages(page)).toHaveText(/^Page 7–8 of \d+$/);

    await page.keyboard.press("ArrowLeft");
    await expect(pages(page)).toHaveText(/^Page 5–6 of \d+$/);
  });

  test("comes back to the same page after a reload", async ({ page, context }) => {
    await useDevice(context, E2E_URL, "device-book-0003", "Mac · Safari");
    await page.goto(CHAPTER);
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(800);
    }
    // Compare the pages shown; the total can settle a moment later as figures load.
    const shown = (await pages(page).textContent())?.replace(/ of \d+$/, "") ?? "";
    await page.waitForResponse((r) => r.url().endsWith("/api/progress") && r.status() === 204, {
      timeout: 15_000,
    });
    await page.reload();
    await expect(pages(page)).toHaveText(new RegExp(`^${shown} of \\d+$`));
    await expect(page.locator('[data-resume="shown"]')).toHaveCount(1);
  });

  test("links in the contents drawer open the right page", async ({ page, context }) => {
    await useDevice(context, E2E_URL, "device-book-0004", "Mac · Firefox");
    await page.goto(CHAPTER);
    await page.getByRole("button", { name: "Contents" }).click();
    const link = page.locator(".contents-drawer nav a").nth(4);
    const target = ((await link.getAttribute("href")) ?? "").slice(1);
    await link.click();
    await expect(pages(page)).not.toHaveText(/^Page 1–2 /);
    expect(await onScreen(page, target)).toBe(true);
  });

  test("the Aa menu switches between book and scroll", async ({ page, context }) => {
    await useDevice(context, E2E_URL, "device-book-0004", "Mac · Firefox");
    await page.goto(CHAPTER);
    await page.getByRole("button", { name: "Reading settings" }).click();
    await page.getByRole("button", { name: "Scroll", exact: true }).click();
    await expect(page.locator(".book-desk")).toHaveCount(0);
    await expect(page.locator("article.reader-body")).toBeVisible();

    await page.getByRole("button", { name: "Reading settings" }).click();
    await page.getByRole("button", { name: "Book", exact: true }).click();
    await expect(page.locator(".book-desk")).toBeVisible();
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("shows one page and turns with a tap on the edge", async ({ page, context }) => {
    await useDevice(context, E2E_URL, "device-book-0005", "iPhone · Safari");
    await page.goto(CHAPTER);
    await expect(page.locator('.book[data-spread="false"]')).toBeVisible();
    await expect(pages(page)).toHaveText(/^Page 1 of \d+$/);
    await page.locator(".book").tap({ position: { x: 370, y: 400 } });
    await expect(pages(page)).toHaveText(/^Page 2 of \d+$/);
  });
});
