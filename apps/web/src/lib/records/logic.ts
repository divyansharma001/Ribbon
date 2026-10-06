import { XP_RULES } from "../learning/logic";
import { addDays } from "../streaks/logic";

/*
 * "You vs you": XP per day and per week, this week against last week, your
 * best weeks ranked like a leaderboard, and personal records. Pure functions.
 * Days are local dates ("YYYY-MM-DD") in the reader's time zone; weeks start
 * on Monday.
 */

export interface DayActivity {
  minutes: number;
  /** Questions answered for the first time, and how many of those were right. */
  answered: number;
  right: number;
  reviews: number;
  chaptersFinished: number;
}

const EMPTY: DayActivity = { minutes: 0, answered: 0, right: 0, reviews: 0, chaptersFinished: 0 };

/** XP earned from one day's activity, by the same rules as total XP. */
export function dayXp(d: DayActivity): number {
  return Math.round(
    d.minutes * XP_RULES.perMinute +
      d.right * XP_RULES.firstTryCorrect +
      (d.answered - d.right) * XP_RULES.answeredWrong +
      d.reviews * XP_RULES.review +
      d.chaptersFinished * XP_RULES.chapterFinished,
  );
}

/** The Monday on or before a date. */
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

export interface Week {
  /** Monday of the week. */
  start: string;
  xp: number;
  minutes: number;
  answered: number;
  right: number;
}

export interface Race {
  thisWeek: number;
  /** Last week's XP up to the same weekday as today. */
  lastWeekSoFar: number;
  lastWeek: number;
  /** Days left in this week, today included. */
  daysLeft: number;
}

export interface Records {
  bestWeek: Week | null;
  bestDayMinutes: { date: string; value: number } | null;
  mostRightInDay: { date: string; value: number } | null;
}

export interface YouVsYou {
  race: Race;
  /** Every week with any XP, best first. */
  ranked: Week[];
  /** Rank of this week among them (1 = best), or null if it has no XP yet. */
  thisWeekRank: number | null;
  records: Records;
}

export function youVsYou(days: ReadonlyMap<string, DayActivity>, today: string): YouVsYou {
  const weeks = new Map<string, Week>();
  let bestDayMinutes: Records["bestDayMinutes"] = null;
  let mostRightInDay: Records["mostRightInDay"] = null;

  for (const [date, d] of days) {
    const start = weekStart(date);
    const w = weeks.get(start) ?? { start, xp: 0, minutes: 0, answered: 0, right: 0 };
    w.xp += dayXp(d);
    w.minutes += d.minutes;
    w.answered += d.answered;
    w.right += d.right;
    weeks.set(start, w);
    if (d.minutes > (bestDayMinutes?.value ?? 0)) bestDayMinutes = { date, value: d.minutes };
    if (d.right > (mostRightInDay?.value ?? 0)) mostRightInDay = { date, value: d.right };
  }

  const thisStart = weekStart(today);
  const lastStart = addDays(thisStart, -7);
  const dayIndex = Math.round((Date.parse(today) - Date.parse(thisStart)) / 86_400_000);
  let lastWeekSoFar = 0;
  for (let i = 0; i <= dayIndex; i++)
    lastWeekSoFar += dayXp(days.get(addDays(lastStart, i)) ?? EMPTY);

  const ranked = [...weeks.values()]
    .filter((w) => w.xp > 0)
    .sort((a, b) => b.xp - a.xp || b.start.localeCompare(a.start));
  const rank = ranked.findIndex((w) => w.start === thisStart);

  return {
    race: {
      thisWeek: weeks.get(thisStart)?.xp ?? 0,
      lastWeekSoFar,
      lastWeek: weeks.get(lastStart)?.xp ?? 0,
      daysLeft: 7 - dayIndex,
    },
    ranked,
    thisWeekRank: rank === -1 ? null : rank + 1,
    records: { bestWeek: ranked[0] ?? null, bestDayMinutes, mostRightInDay },
  };
}

/**
 * When a chapter was finished: the moment the reader had read 90% of its
 * blocks. `reads` are the times blocks were first read, in any order.
 */
export function finishedAt(reads: readonly Date[], blockCount: number): Date | null {
  const needed = Math.ceil(blockCount * 0.9);
  if (needed === 0 || reads.length < needed) return null;
  return [...reads].sort((a, b) => a.getTime() - b.getTime())[needed - 1] ?? null;
}
