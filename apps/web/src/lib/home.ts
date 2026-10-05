import "server-only";
import type { OutlineNode } from "@ribbon/book-schema";
import { and, count, desc, eq, isNotNull, schema } from "@ribbon/db";
import { db } from "./db";

export interface ContinueReading {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterNumber: number | null;
  chapterTitle: string;
  sectionTitle: string;
  blockId: string;
  /** The start of the paragraph where the reader stopped. */
  snippet: string;
  deviceLabel: string;
  readAt: string;
  /** How far through the chapter, 0 to 1. */
  chapterProgress: number;
}

function sectionTitle(outline: OutlineNode[], anchor: string): string | null {
  for (const node of outline) {
    if (node.anchor === anchor) return node.title;
    const inner = sectionTitle(node.children, anchor);
    if (inner) return inner;
  }
  return null;
}

/** The newest reading spot across all devices, with enough context to show it. */
export async function getContinueReading(userId: string): Promise<ContinueReading | null> {
  const [spot] = await db
    .select()
    .from(schema.readingPositions)
    .where(eq(schema.readingPositions.userId, userId))
    .orderBy(desc(schema.readingPositions.readAt))
    .limit(1);
  if (!spot) return null;

  const [row] = await db
    .select({
      bookTitle: schema.books.title,
      chapterNumber: schema.chapters.number,
      chapterTitle: schema.chapters.title,
      outline: schema.chapters.outline,
      blockCount: schema.chapters.blockCount,
      section: schema.blocks.sectionAnchor,
      position: schema.blocks.position,
      text: schema.blocks.text,
    })
    .from(schema.blocks)
    .innerJoin(
      schema.chapters,
      and(
        eq(schema.chapters.bookId, schema.blocks.bookId),
        eq(schema.chapters.id, schema.blocks.chapterId),
      ),
    )
    .innerJoin(schema.books, eq(schema.books.id, schema.blocks.bookId))
    .where(and(eq(schema.blocks.bookId, spot.bookId), eq(schema.blocks.id, spot.blockId)));
  if (!row) return null;

  const snippet = row.text.replace(/\s+/g, " ").trim();
  return {
    bookId: spot.bookId,
    bookTitle: row.bookTitle,
    chapterId: spot.chapterId,
    chapterNumber: row.chapterNumber,
    chapterTitle: row.chapterTitle,
    sectionTitle: sectionTitle(row.outline, row.section) ?? row.chapterTitle,
    blockId: spot.blockId,
    snippet: snippet.length > 280 ? `${snippet.slice(0, 280).replace(/\s+\S*$/, "")}…` : snippet,
    deviceLabel: spot.deviceLabel,
    readAt: spot.readAt.toISOString(),
    chapterProgress: row.blockCount > 0 ? Math.min(1, (row.position + 1) / row.blockCount) : 0,
  };
}

export interface BookProgress {
  id: string;
  title: string;
  authors: string[];
  chapters: number;
  /** Share of the book's blocks the reader has actually read, 0 to 1. */
  read: number;
}

export async function getBookProgress(userId: string): Promise<BookProgress[]> {
  const books = await db.select().from(schema.books);
  const out: BookProgress[] = [];
  for (const book of books) {
    const [[total], [read], [chapters]] = await Promise.all([
      db.select({ n: count() }).from(schema.blocks).where(eq(schema.blocks.bookId, book.id)),
      db
        .select({ n: count() })
        .from(schema.blockReads)
        .where(and(eq(schema.blockReads.userId, userId), eq(schema.blockReads.bookId, book.id))),
      db
        .select({ n: count() })
        .from(schema.chapters)
        .where(and(eq(schema.chapters.bookId, book.id), isNotNull(schema.chapters.number))),
    ]);
    out.push({
      id: book.id,
      title: book.title,
      authors: book.authors,
      chapters: chapters?.n ?? 0,
      read: total?.n ? (read?.n ?? 0) / total.n : 0,
    });
  }
  return out;
}
