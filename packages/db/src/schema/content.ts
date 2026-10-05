import type { Block, Note, OutlineNode } from "@ribbon/book-schema";
import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/*
 * Book content, loaded from the ingest output by the `load` command.
 * The same for every user. Never edited by the app.
 */

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const books = pgTable("books", {
  id: text().primaryKey(),
  title: text().notNull(),
  authors: text().array().notNull(),
  edition: integer().notNull(),
  publisher: text().notNull(),
  published: text().notNull(),
  isbn: text().notNull(),
  /** Hash of the loaded content, so re-loading the same content is a no-op. */
  contentHash: text().notNull(),
  loadedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const chapters = pgTable(
  "chapters",
  {
    bookId: text()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    id: text().notNull(),
    /** Reading order within the book. */
    position: integer().notNull(),
    /** Null for front matter such as the preface. */
    number: integer(),
    title: text().notNull(),
    anchor: text().notNull(),
    words: integer().notNull(),
    blockCount: integer().notNull(),
    outline: jsonb().$type<OutlineNode[]>().notNull(),
    notes: jsonb().$type<Note[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.id] })],
);

export const blocks = pgTable(
  "blocks",
  {
    bookId: text()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    id: text().notNull(),
    chapterId: text().notNull(),
    /** Order within the chapter. */
    position: integer().notNull(),
    sectionAnchor: text().notNull(),
    type: text().$type<Block["type"]>().notNull(),
    hash: text().notNull(),
    words: integer().notNull(),
    data: jsonb().$type<Block>().notNull(),
    /** Plain text, for search and AI context. */
    text: text().notNull(),
    search: tsvector().notNull().generatedAlwaysAs(sql`to_tsvector('english', "text")`),
  },
  (t) => [
    primaryKey({ columns: [t.bookId, t.id] }),
    index("blocks_chapter_position_idx").on(t.bookId, t.chapterId, t.position),
    index("blocks_hash_idx").on(t.bookId, t.hash),
    index("blocks_search_idx").using("gin", t.search),
  ],
);

/** Every element id in the book, mapped to the block that holds it. Used by cross-links. */
export const anchors = pgTable(
  "anchors",
  {
    bookId: text()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    anchor: text().notNull(),
    chapterId: text().notNull(),
    blockId: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.anchor] })],
);

export const glossaryEntries = pgTable(
  "glossary_entries",
  {
    bookId: text()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    term: text().notNull(),
    position: integer().notNull(),
    body: jsonb().$type<Block[]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookId, t.term] })],
);

export const indexTerms = pgTable(
  "index_terms",
  {
    bookId: text()
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    blockId: text().notNull(),
    primary: text().notNull(),
    secondary: text().notNull().default(""),
  },
  (t) => [
    primaryKey({ columns: [t.bookId, t.blockId, t.primary, t.secondary] }),
    index("index_terms_primary_idx").on(t.bookId, t.primary),
  ],
);
