import "server-only";
import { and, asc, eq, inArray, schema } from "@ribbon/db";
import { db } from "../db";
import type { TextRange } from "./anchor";
import type { Annotation, HighlightColor } from "./types";

type Row = typeof schema.annotations.$inferSelect;

export function toAnnotation(row: Row): Annotation {
  return {
    id: row.id,
    groupId: row.groupId,
    kind: row.kind === "bookmark" ? "bookmark" : "highlight",
    chapterId: row.chapterId,
    blockId: row.blockId,
    blockHash: row.blockHash,
    range: (row.range as TextRange | null) ?? null,
    color: (row.color as HighlightColor | null) ?? null,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

/** The reader's highlights and bookmarks, in book order. One chapter, or the whole book. */
export async function getAnnotations(
  userId: string,
  bookId: string,
  chapterId?: string,
): Promise<Annotation[]> {
  const rows = await db
    .select({ a: schema.annotations })
    .from(schema.annotations)
    .innerJoin(
      schema.blocks,
      and(
        eq(schema.blocks.bookId, schema.annotations.bookId),
        eq(schema.blocks.id, schema.annotations.blockId),
      ),
    )
    .innerJoin(
      schema.chapters,
      and(
        eq(schema.chapters.bookId, schema.blocks.bookId),
        eq(schema.chapters.id, schema.blocks.chapterId),
      ),
    )
    .where(
      and(
        eq(schema.annotations.userId, userId),
        eq(schema.annotations.bookId, bookId),
        chapterId ? eq(schema.annotations.chapterId, chapterId) : undefined,
      ),
    )
    .orderBy(
      asc(schema.chapters.position),
      asc(schema.blocks.position),
      asc(schema.annotations.createdAt),
    );
  return rows.map((r) => toAnnotation(r.a));
}

/** The blocks that really exist in a chapter, with their fingerprints. */
export async function chapterBlockHashes(
  bookId: string,
  chapterId: string,
  blockIds: string[],
): Promise<Map<string, string>> {
  if (blockIds.length === 0) return new Map();
  const rows = await db
    .select({ id: schema.blocks.id, hash: schema.blocks.hash })
    .from(schema.blocks)
    .where(
      and(
        eq(schema.blocks.bookId, bookId),
        eq(schema.blocks.chapterId, chapterId),
        inArray(schema.blocks.id, blockIds),
      ),
    );
  return new Map(rows.map((r) => [r.id, r.hash]));
}

export interface NoteEntry {
  groupId: string;
  kind: Annotation["kind"];
  chapterId: string;
  chapterNumber: number | null;
  chapterTitle: string;
  blockId: string;
  color: Annotation["color"];
  /** The highlighted words, or the start of the bookmarked block. */
  text: string;
  note: string | null;
  createdAt: string;
}

/** Every highlight, note, and bookmark in a book, one entry per highlight, in book order. */
export async function getBookNotes(userId: string, bookId: string): Promise<NoteEntry[]> {
  const rows = await db
    .select({
      a: schema.annotations,
      blockText: schema.blocks.text,
      chapterNumber: schema.chapters.number,
      chapterTitle: schema.chapters.title,
    })
    .from(schema.annotations)
    .innerJoin(
      schema.blocks,
      and(
        eq(schema.blocks.bookId, schema.annotations.bookId),
        eq(schema.blocks.id, schema.annotations.blockId),
      ),
    )
    .innerJoin(
      schema.chapters,
      and(
        eq(schema.chapters.bookId, schema.blocks.bookId),
        eq(schema.chapters.id, schema.blocks.chapterId),
      ),
    )
    .where(and(eq(schema.annotations.userId, userId), eq(schema.annotations.bookId, bookId)))
    .orderBy(
      asc(schema.chapters.position),
      asc(schema.blocks.position),
      asc(schema.annotations.createdAt),
    );
  const groups = new Map<string, NoteEntry>();
  for (const r of rows) {
    const a = toAnnotation(r.a);
    const quote = a.range?.quote ?? "";
    const seen = groups.get(a.groupId);
    if (seen) {
      seen.text = `${seen.text} … ${quote}`;
      continue;
    }
    const start = r.blockText.replace(/\s+/g, " ").trim();
    groups.set(a.groupId, {
      groupId: a.groupId,
      kind: a.kind,
      chapterId: a.chapterId,
      chapterNumber: r.chapterNumber,
      chapterTitle: r.chapterTitle,
      blockId: a.blockId,
      color: a.color,
      text:
        a.kind === "bookmark"
          ? start.length > 160
            ? `${start.slice(0, 160).replace(/\s+\S*$/, "")}…`
            : start
          : quote,
      note: a.note,
      createdAt: a.createdAt,
    });
  }
  return [...groups.values()];
}
