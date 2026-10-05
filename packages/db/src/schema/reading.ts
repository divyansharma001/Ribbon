import { sql } from "drizzle-orm";
import {
  boolean,
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

/** Daily goal and streak settings. Streaks themselves are worked out from reading_sessions. */
export const streakSettings = pgTable(
  "streak_settings",
  {
    userId: text()
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Minutes of active reading that complete a day. */
    goalMinutes: integer().notNull().default(10),
    /** Saturdays and Sundays never break the streak. */
    weekendsOff: boolean().notNull().default(false),
    /** IANA time zone (e.g. "Asia/Kolkata"); days start at midnight here. */
    timeZone: text().notNull().default("UTC"),
    /** "HH:MM" local time for the reminder email, or null for none. */
    reminderAt: text(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("streak_settings_goal", sql`${t.goalMinutes} between 1 and 240`)],
);

/** The reader's answer to each quiz question (the first answer is what counts for XP). */
export const quizAnswers = pgTable(
  "quiz_answers",
  {
    userId: userId(),
    bookId: bookId(),
    questionId: text().notNull(),
    chapterId: text().notNull(),
    firstCorrect: boolean().notNull(),
    attempts: integer().notNull().default(1),
    firstAnsweredAt: createdAt(),
    lastAnsweredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bookId, t.questionId] }),
    index("quiz_answers_chapter_idx").on(t.userId, t.bookId, t.chapterId),
  ],
);

/**
 * Spaced review: every answered question becomes a card that comes back
 * after growing gaps (box 0 = 1 day ... box 5 = 80 days). A miss resets it.
 */
export const reviewCards = pgTable(
  "review_cards",
  {
    userId: userId(),
    bookId: bookId(),
    questionId: text().notNull(),
    box: integer().notNull().default(0),
    dueAt: timestamp({ withTimezone: true }).notNull(),
    reviews: integer().notNull().default(0),
    lapses: integer().notNull().default(0),
    lastReviewedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bookId, t.questionId] }),
    index("review_cards_due_idx").on(t.userId, t.dueAt),
    check("review_cards_box", sql`${t.box} between 0 and 5`),
  ],
);
