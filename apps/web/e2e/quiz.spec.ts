import { expect, test } from "@playwright/test";
import { E2E_URL } from "../playwright.config";
import { turnPage } from "./support/book";
import { useDevice, useMode } from "./support/device";

test.use({ viewport: { width: 1512, height: 982 } });

test("a quick check stops the book until it is answered, then goes to review", async ({
  page,
  context,
}) => {
  await useDevice(context, E2E_URL, "device-quiz-0007", "Mac · Chrome");
  await useMode(page, "book");
  await page.goto("/books/ddia-2e/ch01#ch_tradeoffs.15");
  const pages = page.locator(".book-footer-pages");
  await expect(pages).toHaveText(/^Page \d+–\d+ of \d+$/);

  // Turn until the first quick check is on one of the two pages shown.
  const card = page.locator(".quiz-card").first();
  const shown = () =>
    page.evaluate(() => {
      const book = document.querySelector(".book")?.getBoundingClientRect();
      const r = document.querySelector(".quiz-card")?.getClientRects()[0];
      return !!book && !!r && r.left >= book.left - 1 && r.right <= book.right + 1;
    });
  for (let i = 0; i < 4 && !(await shown()); i++) await turnPage(page);
  await expect(card).toHaveAttribute("data-quiz-state", "open");
  const at = await pages.textContent();

  // Blocked while unanswered.
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  await expect(pages).toHaveText(at ?? "");
  await expect(card).toHaveAttribute("data-nudge", "true");

  // Answer all three.
  await card
    .getByRole("button", {
      name: "When managing its data is one of the main challenges in building it",
    })
    .click();
  await card.getByRole("button", { name: "Next question" }).click();
  const pairs = [
    ["Database", "Store data so it can be found again later"],
    ["Cache", "Remember the result of an expensive operation"],
    ["Search index", "Find data by keyword or filter"],
    ["Stream processing", "Handle events as soon as they happen"],
    ["Batch processing", "Crunch a large pile of collected data now and then"],
  ] as const;
  for (const [term, meaning] of pairs) {
    await card.getByRole("button", { name: term, exact: true }).click();
    await card.getByRole("button", { name: meaning }).click();
  }
  await card.getByRole("button", { name: "Check" }).click();
  await expect(card.locator(".quiz-verdict")).toHaveText("Right.");
  await card.getByRole("button", { name: "Next question" }).click();
  await card.getByRole("button", { name: "False", exact: true }).click();
  await expect(card).toHaveAttribute("data-quiz-state", "done");

  // Now the page turns.
  await page.keyboard.press("ArrowRight");
  await expect(pages).not.toHaveText(at ?? "");

  // The answers were saved: after a reload the check shows as done.
  await page.goto("/books/ddia-2e/ch01#ch_tradeoffs.15");
  await expect(page.locator(".quiz-card").first()).toHaveAttribute("data-quiz-state", "done");
});
