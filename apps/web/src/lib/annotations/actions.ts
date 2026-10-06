"use server";

import { and, eq, schema } from "@ribbon/db";
import { z } from "zod";
import { db } from "../db";
import { requireUser } from "../session";
import { chapterBlockHashes, toAnnotation } from "./data";
import { type Annotation, HIGHLIGHT_COLORS, NOTE_MAX } from "./types";

const id = z.string().min(1).max(200);
const color = z.enum(HIGHLIGHT_COLORS);
const range = z
  .object({
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    quote: z.string().min(1).max(20_000),
    prefix: z.string().max(200),
    suffix: z.string().max(200),
  })
  .refine((r) => r.end > r.start, "empty range");

const NewHighlight = z.object({
  bookId: id,
  chapterId: id,
  color,
  segments: z
    .array(z.object({ blockId: id, range }))
    .min(1)
    .max(200),
});

/** Saves a highlight. A selection across paragraphs becomes one row per paragraph, in one group. */
export async function addHighlight(input: z.input<typeof NewHighlight>): Promise<Annotation[]> {
  const user = await requireUser();
  const h = NewHighlight.parse(input);
  const hashes = await chapterBlockHashes(
    h.bookId,
    h.chapterId,
    h.segments.map((s) => s.blockId),
  );
  const segments = h.segments.filter((s) => hashes.has(s.blockId));
  if (segments.length === 0) throw new Error("Nothing to highlight");
  const groupId = crypto.randomUUID();
  const rows = await db
    .insert(schema.annotations)
    .values(
      segments.map((s) => ({
        id: crypto.randomUUID(),
        groupId,
        userId: user.id,
        bookId: h.bookId,
        kind: "highlight" as const,
        chapterId: h.chapterId,
        blockId: s.blockId,
        blockHash: hashes.get(s.blockId) ?? "",
        range: s.range,
        color: h.color,
      })),
    )
    .returning();
  return rows.map(toAnnotation);
}

const Change = z.object({
  bookId: id,
  groupId: z.uuid(),
  color: color.optional(),
  /** Empty text removes the note. */
  note: z.string().max(NOTE_MAX).optional(),
});

/** Changes a highlight's color or note. */
export async function updateHighlight(input: z.input<typeof Change>): Promise<void> {
  const user = await requireUser();
  const c = Change.parse(input);
  const set: Partial<typeof schema.annotations.$inferInsert> = { updatedAt: new Date() };
  if (c.color) set.color = c.color;
  if (c.note !== undefined) set.note = c.note.trim() || null;
  await db
    .update(schema.annotations)
    .set(set)
    .where(
      and(
        eq(schema.annotations.userId, user.id),
        eq(schema.annotations.bookId, c.bookId),
        eq(schema.annotations.groupId, c.groupId),
      ),
    );
}

const Remove = z.object({ bookId: id, groupId: z.uuid() });

/** Deletes a highlight (every paragraph of it) or a bookmark. */
export async function deleteAnnotation(input: z.input<typeof Remove>): Promise<void> {
  const user = await requireUser();
  const r = Remove.parse(input);
  await db
    .delete(schema.annotations)
    .where(
      and(
        eq(schema.annotations.userId, user.id),
        eq(schema.annotations.bookId, r.bookId),
        eq(schema.annotations.groupId, r.groupId),
      ),
    );
}

const Bookmark = z.object({ bookId: id, chapterId: id, blockId: id });

/** Bookmarks a block, or removes the bookmark if it has one. Returns the new bookmark, if any. */
export async function toggleBookmark(input: z.input<typeof Bookmark>): Promise<Annotation | null> {
  const user = await requireUser();
  const b = Bookmark.parse(input);
  const where = and(
    eq(schema.annotations.userId, user.id),
    eq(schema.annotations.bookId, b.bookId),
    eq(schema.annotations.blockId, b.blockId),
    eq(schema.annotations.kind, "bookmark"),
  );
  const removed = await db
    .delete(schema.annotations)
    .where(where)
    .returning({ id: schema.annotations.id });
  if (removed.length > 0) return null;

  const hash = (await chapterBlockHashes(b.bookId, b.chapterId, [b.blockId])).get(b.blockId);
  if (!hash) throw new Error("Unknown block");
  const groupId = crypto.randomUUID();
  const [row] = await db
    .insert(schema.annotations)
    .values({
      id: groupId,
      groupId,
      userId: user.id,
      bookId: b.bookId,
      kind: "bookmark",
      chapterId: b.chapterId,
      blockId: b.blockId,
      blockHash: hash,
    })
    .returning();
  return row ? toAnnotation(row) : null;
}
