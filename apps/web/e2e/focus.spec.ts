import { expect, type Page, test } from "@playwright/test";
import { createDb, sql } from "@ribbon/db";
import { E2E_DATABASE_URL, E2E_URL } from "../playwright.config";
import { useDevice, useMode } from "./support/device";

test.describe.configure({ mode: "serial" });

// These tests fast-forward the clock, so what they save is dated minutes ahead. Remove it,
// or later tests would see it as the newest reading.
test.afterAll(async () => {
  const { db, pool } = createDb(E2E_DATABASE_URL);
  try {
    await db.execute(sql`delete from reading_positions where device_id like 'device-focus-%'`);
    await db.execute(sql`delete from reading_sessions where device_id like 'device-focus-%'`);
    await db.execute(sql`delete from focus_runs where device_id like 'device-focus-%'`);
  } finally {
    await pool.end();
  }
});

/**
 * Lets a test switch the tab away and back: `away(page, true)` acts like
 * switching to another tab (hidden, no focus), `away(page, false)` like coming back.
 */
async function setup(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __here: boolean; __active: number; __run: number };
    w.__here = true;
    w.__active = 0;
    w.__run = 0;
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (w.__here ? "visible" : "hidden"),
    });
    Document.prototype.hasFocus = () => w.__here;
    window.addEventListener("ribbon:active-seconds", (e) => {
      w.__active = (e as CustomEvent<number>).detail;
    });
    window.addEventListener("ribbon:focus-run", (e) => {
      w.__run = (e as CustomEvent<number>).detail;
    });
  });
}
async function away(page: Page, gone: boolean) {
  await page.evaluate((g) => {
    (window as unknown as { __here: boolean }).__here = !g;
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event(g ? "blur" : "focus"));
  }, gone);
}
const seconds = (page: Page, key: "__active" | "__run") =>
  page.evaluate((k) => Math.round((window as unknown as Record<string, number>)[k] ?? 0), key);

/** Reads for `ms`, with a scroll every few seconds so it counts as active reading. */
async function read(page: Page, ms: number) {
  for (let t = 0; t < ms; t += 5_000) {
    await page.mouse.wheel(0, 40);
    await page.clock.runFor(5_000);
  }
}

test("time away from the tab is not counted, and the reader is told", async ({ page, context }) => {
  await useDevice(context, E2E_URL, "device-focus-0001", "Mac · Chrome");
  await useMode(page, "scroll");
  await setup(page);
  await page.clock.install();
  await page.goto("/books/ddia-2e/ch02");
  await read(page, 20_000);
  const before = await seconds(page, "__active");
  expect(before).toBeGreaterThanOrEqual(10);

  await away(page, true);
  await page.clock.runFor(120_000);
  await away(page, false);
  await page.clock.runFor(1_000);
  expect(await seconds(page, "__active")).toBeLessThanOrEqual(before + 2);
  await expect(page.locator(".away-note")).toHaveText("Away 2 min. That time wasn't counted.");
});

test("in strict focus mode, leaving restarts the run, but a short glance does not", async ({
  page,
  context,
}) => {
  await useDevice(context, E2E_URL, "device-focus-0002", "Mac · Chrome");
  await useMode(page, "scroll");
  await page.goto("/settings");
  await page.getByRole("switch", { name: /Strict focus/ }).click();
  await expect(page.getByRole("switch", { name: /Strict focus/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await setup(page);
  await page.clock.install();
  await page.goto("/books/ddia-2e/ch02");
  await read(page, 20_000);
  const run = await seconds(page, "__run");
  expect(run).toBeGreaterThanOrEqual(10);

  // A 5-second glance away: same run.
  await away(page, true);
  await page.clock.runFor(5_000);
  await away(page, false);
  await read(page, 5_000);
  expect(await seconds(page, "__run")).toBeGreaterThanOrEqual(run);
  await expect(page.locator(".away-note")).toHaveCount(0);

  // Gone 30 seconds: the run starts over.
  const saved = page.waitForRequest(
    (r) => r.url().endsWith("/api/progress") && (r.postData() ?? "").includes('"run"'),
  );
  await away(page, true);
  await page.clock.runFor(30_000);
  await away(page, false);
  await page.clock.runFor(2_000);
  await expect(page.locator(".away-note")).toHaveText(
    "You were away 30 sec, so your focus run restarted.",
  );
  expect(await seconds(page, "__run")).toBeLessThan(5);
  await saved; // the finished run was saved

  // Back to normal for the other tests.
  await page.goto("/settings");
  await page.getByRole("switch", { name: /Strict focus/ }).click();
  await expect(page.getByRole("switch", { name: /Strict focus/ })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});
