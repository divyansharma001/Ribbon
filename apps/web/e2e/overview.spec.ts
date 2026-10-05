import { expect, test } from "@playwright/test";
import { E2E_URL } from "../playwright.config";
import { useDevice } from "./support/device";

test("the book overview lists every chapter and opens a section in the reader", async ({
  page,
  context,
}) => {
  await useDevice(context, E2E_URL, "device-overview-0001", "Mac · Chrome");
  await context.addCookies([{ name: "ribbon-mode", value: "scroll", url: E2E_URL }]);
  await page.goto("/books/ddia-2e");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Designing Data-Intensive Applications",
  );
  const chapters = page.locator(".ov-chapter");
  await expect(chapters).toHaveCount(15);

  // Chapter 2 opens to its sections, each with its quick-check count.
  const ch2 = chapters.filter({ hasText: "Defining Nonfunctional Requirements" });
  await ch2.locator("summary").click();
  const section = ch2.locator(".ov-section").filter({ hasText: "Latency and Response Time" });
  await expect(section).toContainText("/3 answered");
  await expect(section.locator(".ov-chip")).toBeVisible();

  await section.getByRole("link", { name: "Latency and Response Time" }).click();
  await expect(page).toHaveURL(/\/books\/ddia-2e\/ch02#id23\.0$/);
  await expect(page.locator('[id="id23.0"]')).toBeInViewport();
});
