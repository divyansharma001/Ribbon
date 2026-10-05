import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Book, blockText, Chapter, figureStoragePath, GlossaryEntry } from "@ribbon/book-schema";
import { type Db, eq, schema } from "@ribbon/db";
import { list, put } from "@vercel/blob";

export interface BookContent {
  book: Book;
  chapters: Chapter[];
  glossary: GlossaryEntry[];
  /** Hash of all content files, so loading the same content twice is a no-op. */
  hash: string;
}

/** Reads and validates the ingest output for one book. */
export async function readBookContent(dir: string): Promise<BookContent> {
  const hash = createHash("sha256");
  const readJson = async (path: string) => {
    const text = await readFile(join(dir, path), "utf8");
    hash.update(path).update(text);
    return JSON.parse(text) as unknown;
  };

  const book = Book.parse(await readJson("book.json"));
  const chapters = [];
  for (const summary of book.chapters) {
    const chapter = Chapter.parse(await readJson(`chapters/${summary.id}.json`));
    if (chapter.id !== summary.id)
      throw new Error(`chapters/${summary.id}.json has id ${chapter.id}`);
    chapters.push(chapter);
  }
  const glossary = GlossaryEntry.array().parse(await readJson("glossary.json"));
  return { book, chapters, glossary, hash: hash.digest("hex") };
}

export interface LoadResult {
  skipped: boolean;
  chapters: number;
  blocks: number;
  anchors: number;
  glossary: number;
  indexTerms: number;
}

const CHUNK = 500;

async function insertChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

/**
 * Loads book content into the database in one transaction.
 *
 * Only content tables are replaced. Reading data (positions, notes, ...) points
 * at the book row, which is updated in place, so it is never deleted by a reload.
 */
export async function loadBook(
  db: Db,
  content: BookContent,
  options: { force?: boolean } = {},
): Promise<LoadResult> {
  const { book, chapters, glossary } = content;
  const blockRows = chapters.flatMap((chapter) =>
    chapter.blocks.map((placed, position) => ({
      bookId: book.id,
      id: placed.block.id,
      chapterId: chapter.id,
      position,
      sectionAnchor: placed.sectionAnchor,
      type: placed.block.type,
      hash: placed.hash,
      words: placed.words,
      data: placed.block,
      text: blockText(placed.block),
    })),
  );
  const anchorRows = Object.entries(book.anchors).map(([anchor, target]) => ({
    bookId: book.id,
    anchor,
    ...target,
  }));
  const termKeys = new Set<string>();
  const termRows = chapters
    .flatMap((c) => c.indexTerms)
    .map((t) => ({
      bookId: book.id,
      blockId: t.blockId,
      primary: t.primary,
      secondary: t.secondary ?? "",
    }))
    .filter((t) => {
      const key = JSON.stringify([t.blockId, t.primary, t.secondary]);
      if (termKeys.has(key)) return false;
      termKeys.add(key);
      return true;
    });
  const result: LoadResult = {
    skipped: false,
    chapters: chapters.length,
    blocks: blockRows.length,
    anchors: anchorRows.length,
    glossary: glossary.length,
    indexTerms: termRows.length,
  };

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ contentHash: schema.books.contentHash })
      .from(schema.books)
      .where(eq(schema.books.id, book.id));
    if (existing?.contentHash === content.hash && !options.force)
      return { ...result, skipped: true };

    const bookRow = {
      id: book.id,
      title: book.title,
      authors: book.authors,
      edition: book.edition,
      publisher: book.publisher,
      published: book.published,
      isbn: book.isbn,
      contentHash: content.hash,
      loadedAt: new Date(),
    };
    await tx
      .insert(schema.books)
      .values(bookRow)
      .onConflictDoUpdate({ target: schema.books.id, set: bookRow });

    for (const table of [
      schema.chapters,
      schema.blocks,
      schema.anchors,
      schema.glossaryEntries,
      schema.indexTerms,
    ]) {
      await tx.delete(table).where(eq(table.bookId, book.id));
    }

    await tx.insert(schema.chapters).values(
      chapters.map((c, position) => ({
        bookId: book.id,
        id: c.id,
        position,
        number: c.number,
        title: c.title,
        anchor: c.anchor,
        words: c.words,
        blockCount: c.blocks.length,
        outline: c.outline,
        notes: c.notes,
      })),
    );
    await insertChunks(blockRows, (rows) => tx.insert(schema.blocks).values(rows));
    await insertChunks(anchorRows, (rows) => tx.insert(schema.anchors).values(rows));
    if (glossary.length) {
      await tx.insert(schema.glossaryEntries).values(
        glossary.map((g, position) => ({
          bookId: book.id,
          term: g.term,
          position,
          body: g.body,
        })),
      );
    }
    await insertChunks(termRows, (rows) => tx.insert(schema.indexTerms).values(rows));
    return result;
  });
}

export interface FigureUploadResult {
  uploaded: number;
  unchanged: number;
}

/** Uploads figures to the private Blob store, skipping files that are already there. */
export async function uploadFigures(
  dir: string,
  bookId: string,
  token: string,
): Promise<FigureUploadResult> {
  const prefix = figureStoragePath(bookId, "figures/x").replace(/x$/, "");
  const existing = new Map<string, number>();
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, token, ...(cursor ? { cursor } : {}) });
    for (const blob of page.blobs) existing.set(blob.pathname, blob.size);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const result: FigureUploadResult = { uploaded: 0, unchanged: 0 };
  for (const name of (await readdir(join(dir, "figures"))).sort()) {
    const data = await readFile(join(dir, "figures", name));
    const pathname = figureStoragePath(bookId, `figures/${name}`);
    if (existing.get(pathname) === data.byteLength) {
      result.unchanged++;
      continue;
    }
    await put(pathname, data, {
      access: "private",
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/png",
    });
    result.uploaded++;
  }
  return result;
}
