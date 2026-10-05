import "server-only";
import type { Block, Inline } from "@ribbon/book-schema";
import { and, asc, eq, inArray, schema } from "@ribbon/db";
import { cache } from "react";
import { db } from "./db";

export interface ChapterListItem {
  id: string;
  number: number | null;
  title: string;
  words: number;
  blockCount: number;
}

export const getBook = cache(async (bookId: string) => {
  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId));
  return book ?? null;
});

export const getBooks = cache(async () =>
  db.select().from(schema.books).orderBy(asc(schema.books.title)),
);

export const getChapterList = cache(
  async (bookId: string): Promise<ChapterListItem[]> =>
    db
      .select({
        id: schema.chapters.id,
        number: schema.chapters.number,
        title: schema.chapters.title,
        words: schema.chapters.words,
        blockCount: schema.chapters.blockCount,
      })
      .from(schema.chapters)
      .where(eq(schema.chapters.bookId, bookId))
      .orderBy(asc(schema.chapters.position)),
);

export const getChapter = cache(async (bookId: string, chapterId: string) => {
  const [chapter] = await db
    .select()
    .from(schema.chapters)
    .where(and(eq(schema.chapters.bookId, bookId), eq(schema.chapters.id, chapterId)));
  return chapter ?? null;
});

export interface ChapterBlock {
  id: string;
  sectionAnchor: string;
  hash: string;
  words: number;
  data: Block;
}

export const getChapterBlocks = cache(
  async (bookId: string, chapterId: string): Promise<ChapterBlock[]> =>
    db
      .select({
        id: schema.blocks.id,
        sectionAnchor: schema.blocks.sectionAnchor,
        hash: schema.blocks.hash,
        words: schema.blocks.words,
        data: schema.blocks.data,
      })
      .from(schema.blocks)
      .where(and(eq(schema.blocks.bookId, bookId), eq(schema.blocks.chapterId, chapterId)))
      .orderBy(asc(schema.blocks.position)),
);

/** Where each cross-link target lives (chapter and block). */
export async function resolveAnchors(
  bookId: string,
  targets: string[],
): Promise<Map<string, { chapterId: string; blockId: string }>> {
  if (targets.length === 0) return new Map();
  const rows = await db
    .select()
    .from(schema.anchors)
    .where(and(eq(schema.anchors.bookId, bookId), inArray(schema.anchors.anchor, targets)));
  return new Map(rows.map((r) => [r.anchor, { chapterId: r.chapterId, blockId: r.blockId }]));
}

/** Every cross-link target used in some blocks. */
export function collectXrefTargets(blocks: readonly Block[]): string[] {
  const targets = new Set<string>();
  const visitInlines = (nodes: readonly Inline[]) => {
    for (const n of nodes) {
      if (n.t === "xref") targets.add(n.target);
      if ("children" in n) visitInlines(n.children);
    }
  };
  const visit = (block: Block) => {
    switch (block.type) {
      case "heading":
        visitInlines(block.title);
        break;
      case "paragraph":
        visitInlines(block.content);
        break;
      case "list":
        for (const item of block.items) item.forEach(visit);
        break;
      case "definitions":
        for (const item of block.items) {
          visitInlines(item.term);
          item.body.forEach(visit);
        }
        break;
      case "callouts":
        for (const item of block.items) item.body.forEach(visit);
        break;
      case "figure":
        visitInlines(block.caption);
        break;
      case "table":
        visitInlines(block.caption);
        for (const row of [...block.head, ...block.body])
          for (const cell of row) visitInlines(cell);
        break;
      case "example":
        visitInlines(block.caption);
        block.body.forEach(visit);
        break;
      case "note":
        block.body.forEach(visit);
        break;
      case "sidebar":
        visitInlines(block.title);
        block.body.forEach(visit);
        break;
      case "quote":
        block.body.forEach(visit);
        if (block.attribution) visitInlines(block.attribution);
        break;
      case "code":
        break;
    }
  };
  blocks.forEach(visit);
  return [...targets];
}

/**
 * Index terms per section for one chapter, lower-cased. The book puts a term
 * in italics where it explains it, and the index marker for it sits somewhere
 * in the same section. We use these to tell key terms apart from italics used
 * for emphasis.
 */
export async function getSectionTerms(
  bookId: string,
  chapterId: string,
): Promise<Map<string, Set<string>>> {
  const rows = await db
    .select({ section: schema.blocks.sectionAnchor, primary: schema.indexTerms.primary })
    .from(schema.indexTerms)
    .innerJoin(
      schema.blocks,
      and(
        eq(schema.blocks.bookId, schema.indexTerms.bookId),
        eq(schema.blocks.id, schema.indexTerms.blockId),
      ),
    )
    .where(and(eq(schema.indexTerms.bookId, bookId), eq(schema.blocks.chapterId, chapterId)));
  const terms = new Map<string, Set<string>>();
  for (const r of rows) {
    const set = terms.get(r.section) ?? new Set<string>();
    set.add(r.primary.toLowerCase());
    terms.set(r.section, set);
  }
  return terms;
}
