import { count, type Db, eq, schema } from "@ribbon/db";
import { createTestDb } from "@ribbon/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadBook } from "../src/load.ts";
import { fixtureBook } from "./fixtures.ts";

// Needs the local Postgres: `pnpm db:up`.
describe("loadBook", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(() => close());

  const countRows = async (table: typeof schema.blocks | typeof schema.anchors) =>
    (await db.select({ n: count() }).from(table).where(eq(table.bookId, "test-book")))[0]?.n;

  it("loads every block, anchor, and search entry", async () => {
    const content = fixtureBook();
    const result = await loadBook(db, content);
    expect(result.skipped).toBe(false);
    expect(await countRows(schema.blocks)).toBe(content.chapters[0]?.blocks.length);
    expect(await countRows(schema.anchors)).toBe(Object.keys(content.book.anchors).length);

    const [block] = await db
      .select({ id: schema.blocks.id, text: schema.blocks.text })
      .from(schema.blocks)
      .where(eq(schema.blocks.id, "ch_widgets.2"));
    expect(block?.text).toBe("Widgets are small things, see “Kinds”.");
  });

  it("skips a reload of the same content", async () => {
    expect((await loadBook(db, fixtureBook())).skipped).toBe(true);
  });

  it("keeps reading data when the content changes and is reloaded", async () => {
    await db.insert(schema.user).values({ id: "u1", name: "Reader", email: "reader@example.com" });
    await db.insert(schema.readingPositions).values({
      userId: "u1",
      bookId: "test-book",
      deviceId: "d1",
      deviceLabel: "Test",
      chapterId: "ch02",
      blockId: "ch_widgets.2",
      blockHash: "abcdefgh",
      offset: 0.5,
      readAt: new Date(),
    });

    const result = await loadBook(db, fixtureBook("fixture-v2"));
    expect(result.skipped).toBe(false);

    const positions = await db.select().from(schema.readingPositions);
    expect(positions).toHaveLength(1);
    expect(positions[0]?.blockId).toBe("ch_widgets.2");
    expect(await countRows(schema.blocks)).toBe(fixtureBook().chapters[0]?.blocks.length);
  });
});
