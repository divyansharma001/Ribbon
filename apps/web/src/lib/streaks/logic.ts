/*
 * Streak rules. Pure functions: the streak is worked out from how many
 * minutes were read on each day, so nothing extra needs to be stored and the
 * rules are easy to test.
 *
 * - A day counts when its reading minutes reach the daily goal.
 * - Every 7 counted days in a row earn a freeze (at most 2 held).
 * - Freezes can also be gifted (invite perks). A gift is usable from the day
 *   it is given, does not count towards the limit of 2, and is used only once
 *   earned freezes run out.
 * - A missed day uses a freeze automatically, if there is one.
 * - With no freeze, reading double the goal on the next day repairs a missed
 *   day, once per calendar month.
 * - With "weekends off", Saturday and Sunday never break the streak.
 * - Today never breaks the streak; it only adds to it once the goal is met.
 * - In strict focus mode, what must reach the goal is the day's longest
 *   unbroken reading run, not the day's total minutes.
 */

export interface StreakRules {
  goalMinutes: number;
  weekendsOff: boolean;
}

export type DayStatus = "met" | "frozen" | "repaired" | "missed" | "off" | "pending" | "none";

export interface Day {
  /** Local date, "YYYY-MM-DD". */
  date: string;
  minutes: number;
  status: DayStatus;
}

export interface StreakSummary {
  current: number;
  best: number;
  freezes: number;
  todayMinutes: number;
  /** What counts towards today's goal: today's minutes, or in strict mode today's longest run. */
  todayProgress: number;
  goalMinutes: number;
  todayMet: boolean;
  /** Yesterday was missed with no freeze; reading this many minutes today repairs it. */
  repairMinutes: number | null;
  /** Every day from the first day of reading to today, oldest first. */
  days: Day[];
}

export const MAX_FREEZES = 2;
const FREEZE_EVERY = 7;

const DAY_MS = 86_400_000;

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** Today's date in a time zone, "YYYY-MM-DD". */
export function localDate(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function computeStreak(
  minutesByDay: ReadonlyMap<string, number>,
  rules: StreakRules,
  today: string,
  /** Local dates on which a freeze was gifted. */
  giftedOn: readonly string[] = [],
  /** Strict focus: each day's longest unbroken run, in minutes. Judged instead of total minutes. */
  runsByDay?: ReadonlyMap<string, number>,
): StreakSummary {
  const goal = rules.goalMinutes;
  const minutes = (date: string) => minutesByDay.get(date) ?? 0;
  const progress = (date: string) => (runsByDay ? (runsByDay.get(date) ?? 0) : minutes(date));
  const firstDay = [...minutesByDay.keys()].filter((d) => d <= today).sort()[0] ?? today;

  let streak = 0;
  let best = 0;
  let freezes = 0;
  let metInRow = 0;
  let gifted = 0;
  const gifts = [...giftedOn].sort();
  let nextGift = 0;
  /** Takes in every gift given on or before this date. */
  const receiveGifts = (date: string) => {
    while (nextGift < gifts.length && (gifts[nextGift] ?? "") <= date) {
      gifted++;
      nextGift++;
    }
  };
  const repairedMonths = new Set<string>();
  const days: Day[] = [];

  for (let date = firstDay; date < today; date = addDays(date, 1)) {
    receiveGifts(date);
    const mins = minutes(date);
    const met = progress(date) >= goal;
    let status: DayStatus;

    if (met) {
      streak++;
      metInRow++;
      status = "met";
      if (metInRow % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (rules.weekendsOff && isWeekend(date)) {
      status = "off";
    } else if (streak > 0 && freezes > 0) {
      freezes--;
      status = "frozen";
    } else if (streak > 0 && gifted > 0) {
      gifted--;
      status = "frozen";
    } else {
      const next = addDays(date, 1);
      const month = next.slice(0, 7);
      if (streak > 0 && progress(next) >= goal * 2 && !repairedMonths.has(month)) {
        repairedMonths.add(month);
        status = "repaired";
      } else {
        status = "missed";
        streak = 0;
        metInRow = 0;
      }
    }
    best = Math.max(best, streak);
    days.push({ date, minutes: mins, status });
  }

  receiveGifts(today);
  const todayMinutes = minutes(today);
  const todayProgress = progress(today);
  const todayMet = todayProgress >= goal;
  if (todayMet) streak++;
  best = Math.max(best, streak);
  days.push({ date: today, minutes: todayMinutes, status: todayMet ? "met" : "pending" });

  // Yesterday was lost, but today can still save it with double the goal.
  const yesterday = days.at(-2);
  const beforeThat = days.at(-3)?.status;
  const lostYesterday =
    yesterday?.status === "missed" &&
    (beforeThat === "met" || beforeThat === "frozen" || beforeThat === "repaired");
  const repairMinutes =
    lostYesterday && !repairedMonths.has(today.slice(0, 7)) && !todayMet ? goal * 2 : null;

  return {
    current: streak,
    best,
    freezes: freezes + gifted,
    todayMinutes,
    todayProgress,
    goalMinutes: goal,
    todayMet,
    repairMinutes,
    days,
  };
}

/** The last `count` days ending today, with "none" for days before reading started. */
export function lastDays(summary: StreakSummary, today: string, count: number): Day[] {
  const byDate = new Map(summary.days.map((d) => [d.date, d]));
  const out: Day[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    out.push(byDate.get(date) ?? { date, minutes: 0, status: "none" });
  }
  return out;
}

/**
 * Adds up reading minutes per local day. Done here with Intl rather than in
 * the database, because browsers report time zone names (like the old
 * "Asia/Calcutta") that Postgres does not always know.
 */
export function minutesPerDay(
  sessions: readonly { startedAt: Date; activeSeconds: number }[],
  timeZone: string,
): Map<string, number> {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out = new Map<string, number>();
  for (const s of sessions) {
    const day = format.format(s.startedAt);
    out.set(day, (out.get(day) ?? 0) + s.activeSeconds / 60);
  }
  return out;
}
