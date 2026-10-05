import { expect, type Page, test } from "@playwright/test";
import { createDb, eq, schema } from "@ribbon/db";
import { E2E_DATABASE_URL, E2E_URL } from "../playwright.config";
import { useDevice } from "./support/device";

test.describe.configure({ mode: "serial" });

// These tests cover the scrolling reader; book mode has its own tests in book.spec.ts.
test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "ribbon-mode", value: "scroll", url: E2E_URL }]);
});

const CHAPTER = "/books/ddia-2e/ch06";

/** Where the reading line sits inside the block it crosses, in page pixels. */
async function spotOnPage(page: Page, blockId: string, offset: number) {
  return page.evaluate(
    ([id, off]) => {
      const line = Math.max(72, Math.round(innerHeight * 0.2));
      const r = document.getElementById(id as string)?.getBoundingClientRect();
      return r ? r.top + (off as number) * r.height - line : null;
    },
    [blockId, offset],
  );
}

async function savedLocally(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("ribbon:pos:ddia-2e") ?? "null"));
}

test("comes back to the exact spot after a reload", async ({ page, context }) => {
  await useDevice(context, E2E_URL, "device-mac-0001", "Mac · Chrome");
  await page.goto(CHAPTER);
  await expect(page.locator("[data-block-id]").first()).toBeVisible();

  await page.mouse.move(640, 430);
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(60);
  }
  const saved = page.waitForResponse(
    (r) => r.url().endsWith("/api/progress") && r.status() === 204,
    {
      timeout: 15_000,
    },
  );
  await saved;
  const spot = await savedLocally(page);
  expect(spot?.chapterId).toBe("ch06");
  expect(await spotOnPage(page, spot.blockId, spot.offset)).toBeCloseTo(0, -1);

  await page.reload();
  await expect(page.locator(`[id="${spot.blockId}"]`)).toHaveAttribute("data-resume", "shown");
  const drift = await spotOnPage(page, spot.blockId, spot.offset);
  expect(Math.abs(drift ?? 999)).toBeLessThanOrEqual(4);
});

test("offers the newer spot from another device, and jumps there", async ({ page, context }) => {
  await useDevice(context, E2E_URL, "device-phone-0002", "iPhone · Safari");
  await page.goto("/books/ddia-2e/ch01");
  const banner = page.locator(".resume-banner");
  await expect(banner).toContainText("on Mac · Chrome");
  await expect(banner).toContainText("Replication");
  await banner.getByRole("link", { name: "Jump there" }).click();
  await expect(page).toHaveURL(/\/books\/ddia-2e\/ch06#.+/);
  await page.waitForTimeout(500);

  // Tapping the banner is not reading: Chapter 1 must not become this device's spot.
  const { db, pool } = createDb(E2E_DATABASE_URL);
  try {
    const rows = await db
      .select()
      .from(schema.readingPositions)
      .where(eq(schema.readingPositions.deviceId, "device-phone-0002"));
    expect(rows.filter((r) => r.chapterId === "ch01")).toEqual([]);
  } finally {
    await pool.end();
  }
});

test("the progress API refuses visitors without a session", async ({ playwright }) => {
  const anonymous = await playwright.request.newContext({
    baseURL: E2E_URL,
    storageState: undefined,
  });
  const res = await anonymous.post("/api/progress", { data: {} });
  expect(res.status()).toBe(401);
  await anonymous.dispose();
});

test("the progress API rejects bad input and never moves a position back in time", async ({
  request,
}) => {
  const device = { id: "device-api-0003", label: "Test" };
  const base = { bookId: "ddia-2e", chapterId: "ch06", device };
  const { db, pool } = createDb(E2E_DATABASE_URL);
  try {
    const [first, second] = await db
      .select({ id: schema.blocks.id, hash: schema.blocks.hash })
      .from(schema.blocks)
      .where(eq(schema.blocks.chapterId, "ch06"))
      .limit(2);
    if (!first || !second) throw new Error("book not loaded");

    const bad = await request.post("/api/progress", {
      data: {
        ...base,
        position: {
          blockId: first.id,
          blockHash: first.hash,
          offset: 2,
          readAt: new Date().toISOString(),
        },
      },
    });
    expect(bad.status()).toBe(400);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const tooLate = await request.post("/api/progress", {
      data: {
        ...base,
        position: { blockId: first.id, blockHash: first.hash, offset: 0, readAt: future },
      },
    });
    expect(tooLate.status()).toBe(400);

    const newer = new Date().toISOString();
    const older = new Date(Date.now() - 60_000).toISOString();
    for (const [block, readAt] of [
      [second, newer],
      [first, older],
    ] as const) {
      const res = await request.post("/api/progress", {
        data: {
          ...base,
          position: { blockId: block.id, blockHash: block.hash, offset: 0.5, readAt },
        },
      });
      expect(res.status()).toBe(204);
    }
    const [row] = await db
      .select()
      .from(schema.readingPositions)
      .where(eq(schema.readingPositions.deviceId, device.id));
    expect(row?.blockId).toBe(second.id);
  } finally {
    await pool.end();
  }
});

test("the progress API accepts reading time that is not a whole number of seconds", async ({
  request,
}) => {
  // Regression: the browser counts reading time in tenths of a second. Saves with
  // a value like 5.1 used to be rejected, so the reading spot was silently lost.
  const { db, pool } = createDb(E2E_DATABASE_URL);
  try {
    const [block] = await db
      .select({ id: schema.blocks.id, hash: schema.blocks.hash })
      .from(schema.blocks)
      .where(eq(schema.blocks.chapterId, "ch06"))
      .limit(1);
    if (!block) throw new Error("book not loaded");
    const now = new Date().toISOString();
    const res = await request.post("/api/progress", {
      data: {
        bookId: "ddia-2e",
        chapterId: "ch06",
        device: { id: "device-api-0004", label: "Test" },
        position: { blockId: block.id, blockHash: block.hash, offset: 0, readAt: now },
        session: {
          id: crypto.randomUUID(),
          startedAt: now,
          endedAt: now,
          startBlockId: block.id,
          endBlockId: block.id,
          activeSeconds: 5.1,
        },
      },
    });
    expect(res.status()).toBe(204);
  } finally {
    await pool.end();
  }
});
