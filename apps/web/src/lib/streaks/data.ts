import "server-only";
import { and, eq, gt, schema } from "@ribbon/db";
import { cache } from "react";
import { db } from "../db";
import { getPerks } from "../invites/perks";
import { computeStreak, localDate, minutesPerDay, type StreakSummary } from "./logic";

export interface StreakSettings {
  goalMinutes: number;
  weekendsOff: boolean;
  timeZone: string;
  reminderAt: string | null;
  /** The daily goal must be read in one run, without leaving Ribbon. */
  strictFocus: boolean;
}

const DEFAULTS: StreakSettings = {
  goalMinutes: 10,
  weekendsOff: false,
  strictFocus: false,
  timeZone: "UTC",
  reminderAt: null,
};

export const getStreakSettings = cache(async (userId: string): Promise<StreakSettings> => {
  const [row] = await db
    .select()
    .from(schema.streakSettings)
    .where(eq(schema.streakSettings.userId, userId));
  return row
    ? {
        goalMinutes: row.goalMinutes,
        weekendsOff: row.weekendsOff,
        timeZone: row.timeZone,
        reminderAt: row.reminderAt,
        strictFocus: row.strictFocus,
      }
    : DEFAULTS;
});

/** Active reading minutes per local day (in the reader's time zone), for the last ~13 months. */
async function minutesByDay(userId: string, timeZone: string): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 400 * 86_400_000);
  const sessions = await db
    .select({
      startedAt: schema.readingSessions.startedAt,
      activeSeconds: schema.readingSessions.activeSeconds,
    })
    .from(schema.readingSessions)
    .where(
      and(eq(schema.readingSessions.userId, userId), gt(schema.readingSessions.startedAt, since)),
    );
  return minutesPerDay(sessions, timeZone);
}

/** Strict focus: each local day's longest reading run, in minutes (a run counts on the day it began). */
async function longestRunByDay(userId: string, timeZone: string): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 400 * 86_400_000);
  const runs = await db
    .select({ startedAt: schema.focusRuns.startedAt, seconds: schema.focusRuns.seconds })
    .from(schema.focusRuns)
    .where(and(eq(schema.focusRuns.userId, userId), gt(schema.focusRuns.startedAt, since)));
  const dayOf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const out = new Map<string, number>();
  for (const r of runs) {
    const day = dayOf.format(r.startedAt);
    out.set(day, Math.max(out.get(day) ?? 0, r.seconds / 60));
  }
  return out;
}

export interface StreakView extends StreakSummary {
  settings: StreakSettings;
  today: string;
}

/** The streak, worked out fresh. Most callers want the cached `getStreak`. */
export async function loadStreak(userId: string): Promise<StreakView> {
  const settings = await getStreakSettings(userId);
  const today = localDate(settings.timeZone);
  const [minutes, perks, runs] = await Promise.all([
    minutesByDay(userId, settings.timeZone),
    getPerks(userId),
    settings.strictFocus ? longestRunByDay(userId, settings.timeZone) : undefined,
  ]);
  const summary = computeStreak(minutes, settings, today, perks.freezeDates, runs);
  return { ...summary, settings, today };
}

/** The streak, once per request. */
export const getStreak = cache(loadStreak);

/** Saves goal settings. Values are checked here, since this is called from a server action. */
export async function saveStreakSettings(
  userId: string,
  patch: Partial<StreakSettings>,
): Promise<void> {
  const current = await getStreakSettings(userId);
  const next: StreakSettings = { ...current, ...patch };
  if (!Number.isInteger(next.goalMinutes) || next.goalMinutes < 1 || next.goalMinutes > 240) {
    throw new Error("Daily goal must be 1 to 240 minutes");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: next.timeZone });
  } catch {
    throw new Error("Unknown time zone");
  }
  if (next.reminderAt !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(next.reminderAt)) {
    throw new Error("Reminder time must be HH:MM");
  }
  const values = { userId, ...next, updatedAt: new Date() };
  await db
    .insert(schema.streakSettings)
    .values(values)
    .onConflictDoUpdate({ target: schema.streakSettings.userId, set: values });
}
