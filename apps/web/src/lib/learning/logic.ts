/*
 * Review schedule, XP, levels, and badges. Pure functions, tested on their own.
 */

// ---------------------------------------------------------------------------
// Spaced review
// ---------------------------------------------------------------------------

/** Days until a card comes back, by box. A right answer moves a card up one box. */
export const BOX_DAYS = [1, 3, 7, 16, 35, 80] as const;
const DAY_MS = 86_400_000;

export function scheduleReview(
  box: number,
  correct: boolean,
  now: Date,
): { box: number; dueAt: Date } {
  const next = correct ? Math.min(box + 1, BOX_DAYS.length - 1) : 0;
  return { box: next, dueAt: new Date(now.getTime() + (BOX_DAYS[next] ?? 1) * DAY_MS) };
}

/** The first answer to a question puts it in the deck: right starts at box 1, wrong at box 0. */
export function firstSchedule(correct: boolean, now: Date): { box: number; dueAt: Date } {
  const box = correct ? 1 : 0;
  return { box, dueAt: new Date(now.getTime() + (BOX_DAYS[box] ?? 1) * DAY_MS) };
}

// ---------------------------------------------------------------------------
// XP and levels
// ---------------------------------------------------------------------------

export interface LearningStats {
  minutesRead: number;
  answered: number;
  firstTryCorrect: number;
  reviews: number;
  currentStreak: number;
  bestStreak: number;
  /** Chapters with at least 90% of blocks read. */
  chaptersFinished: number;
  /** Chapter checks answered all right on the first try. */
  perfectChecks: number;
  /** XP from invite perks. */
  bonusXp: number;
  /** Friends this reader invited who have finished a chapter. */
  readingFriends: number;
}

export const XP_RULES = {
  perMinute: 1,
  firstTryCorrect: 10,
  answeredWrong: 3,
  review: 2,
  chapterFinished: 50,
} as const;

export function xpFrom(s: LearningStats): number {
  return Math.round(
    s.minutesRead * XP_RULES.perMinute +
      s.firstTryCorrect * XP_RULES.firstTryCorrect +
      (s.answered - s.firstTryCorrect) * XP_RULES.answeredWrong +
      s.reviews * XP_RULES.review +
      s.chaptersFinished * XP_RULES.chapterFinished +
      s.bonusXp,
  );
}

/** Levels named after ideas in the book, from one machine to a whole distributed system. */
export const LEVELS = [
  { name: "Single Node", xp: 0 },
  { name: "Replica", xp: 150 },
  { name: "Partition", xp: 400 },
  { name: "Cluster", xp: 900 },
  { name: "Consensus", xp: 1800 },
  { name: "Distributed Systems Expert", xp: 3500 },
] as const;

export interface Level {
  index: number;
  name: string;
  xp: number;
  /** XP where this level starts and the next one starts (null at the top). */
  from: number;
  to: number | null;
  /** Progress to the next level, 0 to 1. */
  progress: number;
}

export function levelFor(xp: number): Level {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= (LEVELS[i]?.xp ?? 0)) index = i;
  const from = LEVELS[index]?.xp ?? 0;
  const to = LEVELS[index + 1]?.xp ?? null;
  return {
    index,
    name: LEVELS[index]?.name ?? "",
    xp,
    from,
    to,
    progress: to === null ? 1 : Math.min(1, (xp - from) / (to - from)),
  };
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface Badge {
  id: string;
  name: string;
  /** How to earn it, in plain words. */
  how: string;
  earned: boolean;
}

export function badgesFor(s: LearningStats): Badge[] {
  const list: Omit<Badge, "earned">[] = [];
  const earned = new Set<string>();
  const add = (id: string, name: string, how: string, got: boolean) => {
    list.push({ id, name, how });
    if (got) earned.add(id);
  };
  add("first-check", "First check", "Answer your first quiz question", s.answered >= 1);
  add("sharp", "Sharp", "Get 25 questions right on the first try", s.firstTryCorrect >= 25);
  add("chapter", "Chapter done", "Read a whole chapter", s.chaptersFinished >= 1);
  add("perfect", "Perfect check", "Ace a chapter check on the first try", s.perfectChecks >= 1);
  add("week", "On a roll", "Reach a 7-day streak", s.bestStreak >= 7);
  add("month", "Habit", "Reach a 30-day streak", s.bestStreak >= 30);
  add("hundred", "Centurion", "Reach a 100-day streak", s.bestStreak >= 100);
  add("reviewer", "Reviewer", "Do 50 reviews", s.reviews >= 50);
  add("hours", "Ten hours", "Read for 10 hours in total", s.minutesRead >= 600);
  add("connector", "Connector", "Invite a friend who finishes a chapter", s.readingFriends >= 1);
  add("circle", "Circle", "Invite 3 friends who finish a chapter", s.readingFriends >= 3);
  add("book-club", "Book club", "Invite 5 friends who finish a chapter", s.readingFriends >= 5);
  return list.map((b) => ({ ...b, earned: earned.has(b.id) }));
}
