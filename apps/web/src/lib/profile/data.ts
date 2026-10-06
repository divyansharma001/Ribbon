import "server-only";
import { and, eq, schema } from "@ribbon/db";
import { cache } from "react";
import { db } from "../db";
import { requireEnv } from "../env";
import { getBookProgress } from "../home";
import { getLearningStats } from "../learning/data";
import { type Badge, badgesFor, type Level, levelFor, xpFrom } from "../learning/logic";
import { cleanHandle } from "./logic";

/** The site's public address, for links and images shared elsewhere. */
export function siteUrl(): string {
  return requireEnv("BETTER_AUTH_URL").replace(/\/+$/, "");
}

export interface Profile {
  handle: string;
  enabled: boolean;
  showName: boolean;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db
    .select({
      handle: schema.publicProfiles.handle,
      enabled: schema.publicProfiles.enabled,
      showName: schema.publicProfiles.showName,
    })
    .from(schema.publicProfiles)
    .where(eq(schema.publicProfiles.userId, userId));
  return row ?? null;
}

export type SaveResult = { ok: true } | { ok: false; error: "invalid" | "taken" };

/** Saves the profile. Handles are unique across readers. */
export async function saveProfile(userId: string, input: Profile): Promise<SaveResult> {
  const handle = cleanHandle(input.handle);
  if (!handle) return { ok: false, error: "invalid" };
  const [owner] = await db
    .select({ userId: schema.publicProfiles.userId })
    .from(schema.publicProfiles)
    .where(eq(schema.publicProfiles.handle, handle));
  if (owner && owner.userId !== userId) return { ok: false, error: "taken" };
  const values = { handle, enabled: input.enabled, showName: input.showName };
  await db
    .insert(schema.publicProfiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({
      target: schema.publicProfiles.userId,
      set: { ...values, updatedAt: new Date() },
    });
  return { ok: true };
}

export interface PublicStats {
  handle: string;
  /** The reader's name, or the handle if they chose not to show it. */
  displayName: string;
  level: Level;
  currentStreak: number;
  bestStreak: number;
  hoursRead: number;
  answered: number;
  /** Share of first answers that were right, 0 to 1. */
  accuracy: number;
  book: { title: string; chaptersDone: number; chapters: number; read: number } | null;
  badges: Badge[];
}

/** Totals for one reader, shown under a handle. Never book text, notes, highlights, or email. */
export async function statsFor(
  userId: string,
  handle: string,
  displayName: string,
): Promise<PublicStats> {
  const [stats, books] = await Promise.all([getLearningStats(userId), getBookProgress(userId)]);
  const book = books[0];
  return {
    handle,
    displayName,
    level: levelFor(xpFrom(stats)),
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    hoursRead: Math.floor(stats.minutesRead / 60),
    answered: stats.answered,
    accuracy: stats.answered > 0 ? stats.firstTryCorrect / stats.answered : 0,
    book: book
      ? {
          title: book.title,
          chaptersDone: Math.min(stats.chaptersFinished, book.chapters),
          chapters: book.chapters,
          read: book.read,
        }
      : null,
    badges: badgesFor(stats),
  };
}

/** A public profile by handle. Null unless the reader turned it on. */
export const getPublicStats = cache(async (handle: string): Promise<PublicStats | null> => {
  const clean = cleanHandle(handle);
  if (!clean) return null;
  const [row] = await db
    .select({
      userId: schema.publicProfiles.userId,
      showName: schema.publicProfiles.showName,
      name: schema.user.name,
    })
    .from(schema.publicProfiles)
    .innerJoin(schema.user, eq(schema.user.id, schema.publicProfiles.userId))
    .where(and(eq(schema.publicProfiles.handle, clean), eq(schema.publicProfiles.enabled, true)));
  if (!row) return null;
  return statsFor(row.userId, clean, row.showName ? row.name : clean);
});
