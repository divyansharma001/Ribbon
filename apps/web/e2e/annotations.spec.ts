import { expect, type Page, test } from "@playwright/test";
import { E2E_URL } from "../playwright.config";
import { useDevice } from "./support/device";

test.use({ viewport: { width: 1280, height: 900 } });

/** Selects text the way a mouse drag does, from one word to another inside a block. */
async function dragSelect(page: Page, blockId: string, from: string, to: string) {
  const box = (word: string) =>
    page.evaluate(
      ([id, w]) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const i = n.textContent?.indexOf(w) ?? -1;
          if (i < 0) continue;
          const r = document.createRange();
          r.setStart(n, i);
          r.setEnd(n, i + w.length);
          const b = r.getClientRects()[0];
          return b ? { left: b.left, right: b.right, y: b.top + b.height / 2 } : null;
        }
        return null;
      },
      [blockId, word] as const,
    );
  const a = await box(from);
  const b = await box(to);
  if (!a || !b) throw new Error("word not found");
  await page.mouse.move(a.left + 1, a.y);
  await page.mouse.down();
  await page.mouse.move(b.right - 1, b.y, { steps: 8 });
  await page.mouse.up();
}

const painted = (page: Page, color: string) =>
  page.evaluate((c) => CSS.highlights.get(`ribbon-${c}`)?.size ?? 0, color);

test("highlight, add a note, bookmark, and find them again after a reload", async ({
  page,
  context,
}) => {
  await useDevice(context, E2E_URL, "device-notes-0001", "Mac · Chrome");
  await context.addCookies([{ name: "ribbon-mode", value: "scroll", url: E2E_URL }]);
  const block = "ch_datamodels.3";
  await page.goto(`/books/ddia-2e/ch03#${block}`);
  await expect(page.locator(`[id="${block}"]`)).toBeInViewport();

  // Select, pick green.
  await dragSelect(page, block, "layering", "another");
  await page.getByRole("button", { name: "Highlight green" }).click();
  await expect.poll(() => painted(page, "green")).toBe(1);

  // Still there after a reload, and opens when tapped.
  await page.reload();
  await expect.poll(() => painted(page, "green")).toBe(1);
  const spot = await page.evaluate(() => {
    const r = [...(CSS.highlights.get("ribbon-green")?.values() ?? [])][0] as Range | undefined;
    const b = r?.getClientRects()[0];
    return b ? { x: b.left + 4, y: b.top + b.height / 2 } : null;
  });
  if (!spot) throw new Error("highlight not on screen");
  await page.mouse.click(spot.x, spot.y);
  const editor = page.getByRole("dialog", { name: "Highlight" });
  await editor.getByRole("button", { name: "Add a note" }).click();
  await editor.getByRole("textbox", { name: "Note" }).fill("Compare with the graph model later.");
  await editor.getByRole("button", { name: "Done" }).click();
  await expect(editor).toBeHidden();

  // Bookmark the spot.
  await page.getByRole("button", { name: "Bookmark this spot" }).click();
  await expect(page.getByRole("button", { name: "Remove bookmark" })).toBeVisible();

  // The notes tab lists both, after a reload.
  await page.reload();
  await expect.poll(() => painted(page, "green")).toBe(1);
  await expect(page.locator(".bm-flag")).toHaveCount(1);
  await page.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("tab", { name: /Notes/ }).click();
  const list = page.locator(".notes-list");
  await expect(list).toContainText("Compare with the graph model later.");
  await expect(list).toContainText("Bookmark");

  // The book overview shows them too.
  await page.goto("/books/ddia-2e#notes");
  await expect(page.locator("#notes")).toContainText("Compare with the graph model later.");

  // Delete the highlight from the reader's list.
  await page.goto(`/books/ddia-2e/ch03#${block}`);
  await page.getByRole("button", { name: "Contents" }).click();
  await page.getByRole("tab", { name: /Notes/ }).click();
  await page.getByRole("button", { name: "Delete highlight" }).click();
  await page.getByRole("button", { name: "Remove bookmark" }).last().click();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect.poll(() => painted(page, "green")).toBe(0);
  await expect(page.locator(".bm-flag")).toHaveCount(0);
});
