"use server";

import { refresh } from "next/cache";
import { requireUser } from "../session";
import { saveStreakSettings } from "./data";

/** Changes the daily goal or weekends-off setting. */
export async function updateGoal(input: { goalMinutes?: number; weekendsOff?: boolean }) {
  const user = await requireUser();
  const patch: { goalMinutes?: number; weekendsOff?: boolean } = {};
  if (input.goalMinutes !== undefined) patch.goalMinutes = Number(input.goalMinutes);
  if (input.weekendsOff !== undefined) patch.weekendsOff = Boolean(input.weekendsOff);
  await saveStreakSettings(user.id, patch);
  refresh();
}

/** Stores the reader's time zone, so days start at their own midnight. */
export async function updateTimeZone(timeZone: string) {
  const user = await requireUser();
  await saveStreakSettings(user.id, { timeZone: String(timeZone) });
  refresh();
}
