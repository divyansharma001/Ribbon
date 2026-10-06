import { expect, test } from "@playwright/test";
import { createDb, sql } from "@ribbon/db";
import { E2E_DATABASE_URL, E2E_SECRET, E2E_URL } from "../playwright.config";
import { createTestLogin } from "./support/test-auth";

test.describe.configure({ mode: "serial" });

test("a friend joins with an invite, confirms the book, and both get perks", async ({
  page,
  browser,
}) => {
  const { db, pool } = createDb(E2E_DATABASE_URL);
  try {
    // The owner makes an invite link.
    await page.goto("/invite");
    await page.getByRole("button", { name: "Create invite link" }).click();
    const link = (await page.locator(".invite-fresh .share-code").textContent())?.trim() ?? "";
    expect(link).toMatch(/\/invite\/[A-Za-z0-9_-]{20,}$/);
    const code = link.split("/invite/")[1] ?? "";

    // A visitor sees who invited them, and the button to join.
    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const v = await visitor.newPage();
    await v.goto(`${E2E_URL}/invite/${code}`);
    await expect(v.getByRole("heading", { level: 1 })).toContainText("invited you");
    await expect(v.getByRole("button", { name: "Join with Google" })).toBeVisible();

    // The friend signs up. (Google can't run in tests: the account is made directly, and the
    // invite is claimed the way the sign-up hook claims it.)
    const friend = await createTestLogin({
      databaseUrl: E2E_DATABASE_URL,
      secret: E2E_SECRET,
      baseURL: E2E_URL,
      email: "friend@example.com",
      name: "Fran Friend",
    });
    await db.execute(
      sql`update invites set used_by = ${friend.userId}, used_at = now() where code = ${code}`,
    );
    await v.goto(`${E2E_URL}/invite/${code}`);
    await expect(v.getByRole("heading", { level: 1 })).toHaveText("This invite was already used");
    await visitor.close();

    // The friend must confirm they own the book before reading it.
    const friendContext = await browser.newContext({
      storageState: { cookies: friend.cookies, origins: [] },
    });
    const f = await friendContext.newPage();
    const figure = await f.request.get(`${E2E_URL}/api/books/ddia-2e/figures/ddia_0101.png`);
    expect(figure.status()).toBe(403);
    await f.goto(`${E2E_URL}/books/ddia-2e/ch01`);
    await expect(f).toHaveURL(/\/books\/ddia-2e\/unlock$/);
    const start = f.getByRole("button", { name: "Start reading" });
    await expect(start).toBeDisabled();
    await f.getByRole("checkbox").check();
    await start.click();
    await expect(f).toHaveURL(/\/books\/ddia-2e$/);
    await f.goto(`${E2E_URL}/books/ddia-2e/ch01`);
    await expect(f).toHaveURL(/\/books\/ddia-2e\/ch01$/);

    // Friends have 3 invites.
    await f.goto(`${E2E_URL}/invite`);
    await expect(f.getByText("3 invites left.")).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await f.getByRole("button", { name: "Create invite link" }).click();
      await expect(f.locator(".invite-row")).toHaveCount(i + 1);
    }
    await expect(f.getByText("0 invites left.")).toBeVisible();
    await expect(f.getByRole("button", { name: "Create invite link" })).toBeDisabled();

    // The friend finishes chapter 1: both get 100 XP, and the owner earns Connector.
    await page.goto("/");
    const xpBefore = Number(
      (
        await page
          .locator(".home-card", { hasText: "Level" })
          .locator(".home-muted")
          .first()
          .textContent()
      )
        ?.replace(/[^\d].*$/, "")
        .replace(/,/g, "") ?? 0,
    );
    await db.execute(sql`
      insert into block_reads (user_id, book_id, block_id, chapter_id)
      select ${friend.userId}, book_id, id, chapter_id from blocks
      where book_id = 'ddia-2e' and chapter_id = 'ch01'
      on conflict do nothing
    `);
    await page.goto("/leaderboard");
    await expect(page.locator(".league")).toContainText("Fran");
    await page.goto("/");
    await expect(page.locator(".badge", { hasText: "Connector" })).toHaveAttribute(
      "data-earned",
      "true",
    );
    const xpAfter = Number(
      (
        await page
          .locator(".home-card", { hasText: "Level" })
          .locator(".home-muted")
          .first()
          .textContent()
      )
        ?.replace(/[^\d].*$/, "")
        .replace(/,/g, "") ?? 0,
    );
    expect(xpAfter - xpBefore).toBeGreaterThanOrEqual(100);
    const grants = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from perk_grants where reason = 'friend-first-chapter'`,
    );
    expect(grants.rows[0]?.n).toBe(2);
    await friendContext.close();
  } finally {
    await pool.end();
  }
});
