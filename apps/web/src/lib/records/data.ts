import "server-only";
import { and, eq, gt, isNotNull, schema } from "@ribbon/db";
import { cache } from "react";
import { db } from "../db";
import { getPerks } from "../invites/perks";
import { getStreak } from "../streaks/data";
import { minutesPerDay } from "../streaks/logic";
import { type DayActivity, finishedAt, type YouVsYou, youVsYou } from "./logic";

export interface FastestChapter {
  chapterNumber: number;
  chapterTitle: string;
  /** Whole days from first page to 90% read, at least 1. */
  days: number;
}

export interface RecordsView extends YouVsYou {
  today: string;
  currentStreak: number;
  bestStreak: number;
  fastestChapter: FastestChapter | null;
}

/** Everything for the "you vs you" leaderboard, over the last 400 days. */
export const getRecords = cache(async (userId: string): Promise<RecordsView> => {
  const streak = await getStreak(userId);
  const { timeZone } = streak.settings;
  const since = new Date(Date.now() - 400 * 86_400_000);
  const dayOf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const [sessions, answers, reviews, reads] = await Promise.all([
    db
      .select({
        startedAt: schema.readingSessions.startedAt,
        activeSeconds: schema.readingSessions.activeSeconds,
      })
      .from(schema.readingSessions)
      .where(
        and(eq(schema.readingSessions.userId, userId), gt(schema.readingSessions.startedAt, since)),
      ),
    db
      .select({
        at: schema.quizAnswers.firstAnsweredAt,
        firstCorrect: schema.quizAnswers.firstCorrect,
      })
      .from(schema.quizAnswers)
      .where(eq(schema.quizAnswers.userId, userId)),
    db
      .select({ at: schema.reviewEvents.reviewedAt })
      .from(schema.reviewEvents)
      .where(
        and(eq(schema.reviewEvents.userId, userId), gt(schema.reviewEvents.reviewedAt, since)),
      ),
    db
      .select({
        chapterId: schema.blockReads.chapterId,
        bookId: schema.blockReads.bookId,
        at: schema.blockReads.firstReadAt,
        blockCount: schema.chapters.blockCount,
        number: schema.chapters.number,
        title: schema.chapters.title,
      })
      .from(schema.blockReads)
      .innerJoin(
        schema.chapters,
        and(
          eq(schema.chapters.bookId, schema.blockReads.bookId),
          eq(schema.chapters.id, schema.blockReads.chapterId),
        ),
      )
      .where(and(eq(schema.blockReads.userId, userId), isNotNull(schema.chapters.number))),
  ]);

  const days = new Map<string, DayActivity>();
  const bump = (date: string, add: Partial<DayActivity>) => {
    const d: Required<DayActivity> = {
      minutes: 0,
      answered: 0,
      right: 0,
      reviews: 0,
      chaptersFinished: 0,
      bonusXp: 0,
      ...days.get(date),
    };
    for (const [k, v] of Object.entries(add) as [keyof DayActivity, number][]) d[k] += v;
    days.set(date, d);
  };
  for (const [date, minutes] of minutesPerDay(sessions, timeZone)) bump(date, { minutes });
  for (const a of answers) bump(dayOf.format(a.at), { answered: 1, right: a.firstCorrect ? 1 : 0 });
  for (const r of reviews) bump(dayOf.format(r.at), { reviews: 1 });
  for (const [date, xp] of (await getPerks(userId)).xpByDay) bump(date, { bonusXp: xp });

  // Each finished chapter counts on the day it was finished, and may be the fastest.
  const byChapter = new Map<string, typeof reads>();
  for (const r of reads) {
    const key = `${r.bookId}/${r.chapterId}`;
    byChapter.set(key, [...(byChapter.get(key) ?? []), r]);
  }
  let fastestChapter: FastestChapter | null = null;
  for (const list of byChapter.values()) {
    const first = list[0];
    if (!first || first.number === null) continue;
    const times = list.map((r) => r.at);
    const done = finishedAt(times, first.blockCount);
    if (!done) continue;
    bump(dayOf.format(done), { chaptersFinished: 1 });
    const start = Math.min(...times.map((t) => t.getTime()));
    const daysTaken = Math.max(1, Math.ceil((done.getTime() - start) / 86_400_000));
    if (!fastestChapter || daysTaken < fastestChapter.days) {
      fastestChapter = { chapterNumber: first.number, chapterTitle: first.title, days: daysTaken };
    }
  }

  return {
    ...youVsYou(days, streak.today),
    today: streak.today,
    currentStreak: streak.current,
    bestStreak: streak.best,
    fastestChapter,
  };
});
