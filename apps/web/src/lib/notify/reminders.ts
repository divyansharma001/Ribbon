import "server-only";
import { and, eq, isNotNull, schema } from "@ribbon/db";
import { db } from "../db";
import { requireEnv } from "../env";
import { loadStreak } from "../streaks/data";
import { isWeekend } from "../streaks/logic";
import { notify, unnotify } from "./data";
import { emailReady, sendEmail } from "./email";
import { reminderDueOn, reminderEmail } from "./logic";
import { unsubscribeToken } from "./token";

export interface ReminderRun {
  /** Readers whose reminder time has come. */
  due: number;
  sent: number;
  /** Goal already met, weekend off, or already reminded today. */
  skipped: number;
  failed: number;
}

/** The link that turns reminders off without signing in. */
export function unsubscribeUrl(userId: string): string {
  const base = requireEnv("BETTER_AUTH_URL");
  const token = unsubscribeToken(userId, requireEnv("BETTER_AUTH_SECRET"));
  return `${base}/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}`;
}

/**
 * Emails every reader whose reminder time has come and who hasn't met today's
 * goal yet. Each reader gets at most one a day, however often this runs: the
 * day's in-app notification is written first and acts as the lock.
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { due: 0, sent: 0, skipped: 0, failed: 0 };
  if (!emailReady()) return run;

  const base = requireEnv("BETTER_AUTH_URL");
  const readers = await db
    .select({
      userId: schema.streakSettings.userId,
      reminderAt: schema.streakSettings.reminderAt,
      timeZone: schema.streakSettings.timeZone,
      weekendsOff: schema.streakSettings.weekendsOff,
      email: schema.user.email,
      name: schema.user.name,
    })
    .from(schema.streakSettings)
    .innerJoin(schema.user, eq(schema.user.id, schema.streakSettings.userId))
    .where(and(isNotNull(schema.streakSettings.reminderAt), eq(schema.user.emailVerified, true)));

  for (const r of readers) {
    const day = r.reminderAt ? reminderDueOn(r.reminderAt, r.timeZone, now) : null;
    if (!day) continue;
    run.due++;
    if (r.weekendsOff && isWeekend(day)) {
      run.skipped++;
      continue;
    }
    try {
      const streak = await loadStreak(r.userId);
      if (streak.todayMet) {
        run.skipped++;
        continue;
      }
      const stop = unsubscribeUrl(r.userId);
      const email = reminderEmail({
        firstName: r.name.trim().split(/\s+/)[0] || "there",
        goalMinutes: streak.goalMinutes,
        progress: streak.todayProgress,
        streak: streak.current,
        strictFocus: streak.settings.strictFocus,
        readUrl: `${base}/`,
        settingsUrl: `${base}/settings#reminder`,
        unsubscribeUrl: stop,
      });
      const key = `reminder:${day}`;
      const [added] = await notify(r.userId, [
        { kind: "reminder", key, title: email.subject, body: email.line, href: "/" },
      ]);
      if (!added) {
        run.skipped++;
        continue;
      }
      try {
        await sendEmail({
          to: r.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
          idempotencyKey: `reminder/${r.userId}/${day}`,
          unsubscribeUrl: stop,
        });
        run.sent++;
      } catch (error) {
        // Let the next run try again.
        await unnotify(r.userId, key);
        throw error;
      }
    } catch (error) {
      run.failed++;
      console.error(`Reminder for ${r.userId} failed:`, error);
    }
  }
  return run;
}

/** Turns reminder emails off for a reader. */
export async function stopReminders(userId: string): Promise<void> {
  await db
    .update(schema.streakSettings)
    .set({ reminderAt: null, updatedAt: new Date() })
    .where(eq(schema.streakSettings.userId, userId));
}
