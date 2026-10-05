import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { books } from "./content.ts";

/*
 * Per-user reading data.
 *
 * Each device writes only its own position row, so two devices never
 * overwrite each other. "Where was I" reads the newest row across devices.
 */

const userId = () =>
  text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const bookId = () =>
  text()
    .notNull()
    .references(() => books.id, { onDelete: "cascade" });

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const readingPositions = pgTable(
  "reading_positions",
  {
    userId: userId(),
    bookId: bookId(),
    /** Random id the browser keeps, one per device. */
    deviceId: text().notNull(),
    /** E.g. "iPhone · Safari". */
    deviceLabel: text().notNull(),
    chapterId: text().notNull(),
    blockId: text().notNull(),
    /** Fingerprint of the block's text, to find it again if ids change. */
    blockHash: text().notNull(),
    /** How far into the block the top of the screen is, 0 to 1. */
    offset: real().notNull().default(0),
    /** When the reader was at this spot, by the device's clock. */
    readAt: timestamp({ withTimezone: true }).notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bookId, t.deviceId] }),
    index("reading_positions_latest_idx").on(t.userId, t.bookId, t.readAt),
    check("reading_positions_offset_range", sql`${t.offset} >= 0 and ${t.offset} <= 1`),
  ],
);

/** One continuous stretch of reading on one device. Feeds streaks and history. */
export const readingSessions = pgTable(
  "reading_sessions",
  {
    id: uuid().primaryKey(),
    userId: userId(),
    bookId: bookId(),
    deviceId: text().notNull(),
    chapterId: text().notNull(),
    startBlockId: text().notNull(),
    endBlockId: text().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull(),
    endedAt: timestamp({ withTimezone: true }).notNull(),
    /** Seconds the page was visible and the reader was active. */
    activeSeconds: integer().notNull().default(0),
  },
  (t) => [
    index("reading_sessions_user_started_idx").on(t.userId, t.startedAt),
    check("reading_sessions_active_seconds", sql`${t.activeSeconds} >= 0`),
  ],
);

/** Blocks the reader has actually read (seen long enough to read them). */
export const blockReads = pgTable(
  "block_reads",
  {
    userId: userId(),
    bookId: bookId(),
    blockId: text().notNull(),
    chapterId: text().notNull(),
    firstReadAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bookId, t.blockId] }),
    index("block_reads_chapter_idx").on(t.userId, t.bookId, t.chapterId),
  ],
);

/** A text range inside one block, kept as both offsets and the quoted text. */
export interface TextRange {
  start: number;
  end: number;
  quote: string;
  prefix: string;
  suffix: string;
}

export const annotations = pgTable(
  "annotations",
  {
    id: uuid().primaryKey(),
    userId: userId(),
    bookId: bookId(),
    kind: text().$type<"bookmark" | "highlight" | "note">().notNull(),
    chapterId: text().notNull(),
    blockId: text().notNull(),
    blockHash: text().notNull(),
    /** Null for bookmarks and notes on a whole block. */
    range: jsonb().$type<TextRange>(),
    color: text().$type<"yellow" | "green" | "blue" | "pink">(),
    note: text(),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("annotations_user_book_idx").on(t.userId, t.bookId, t.chapterId),
    check("annotations_kind", sql`${t.kind} in ('bookmark', 'highlight', 'note')`),
  ],
);

export interface ReaderSettings {
  theme: "light" | "dark" | "sepia" | "system";
  fontSize: number;
  lineWidth: "narrow" | "medium" | "wide";
}

export const userSettings = pgTable("user_settings", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  reader: jsonb().$type<ReaderSettings>().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
