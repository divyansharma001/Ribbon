/*
 * Reminder and notification rules. Pure functions, so they are easy to test.
 *
 * - A reminder is due from its local time until REMINDER_WINDOW_MINUTES later,
 *   so a job that runs every 15 minutes, or runs late, still catches it, and
 *   choosing 9:00 at 15:00 does not send one straight away.
 * - The window never runs past midnight: a new day is a new goal.
 * - At most one reminder a day (the caller keys it on the local date).
 */

export const REMINDER_WINDOW_MINUTES = 3 * 60;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "19:30" -> 1170 minutes after midnight, or null if not "HH:MM". */
export function minutesOf(time: string): number | null {
  const m = TIME.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** The local date and minutes after midnight in a time zone. */
export function localClock(timeZone: string, now: Date): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** The local date the reminder is for, if it is due right now; otherwise null. */
export function reminderDueOn(reminderAt: string, timeZone: string, now: Date): string | null {
  const at = minutesOf(reminderAt);
  if (at === null) return null;
  const clock = localClock(timeZone, now);
  return clock.minutes >= at && clock.minutes < at + REMINDER_WINDOW_MINUTES ? clock.date : null;
}

/** "19:30" -> "7:30 PM". */
export function timeLabel(time: string): string {
  const at = minutesOf(time) ?? 0;
  const h = Math.floor(at / 60);
  const m = at % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Every half hour of the day, "00:00" to "23:30", for the reminder picker. */
export const REMINDER_TIMES: string[] = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);

// ---------------------------------------------------------------------------
// The reminder email
// ---------------------------------------------------------------------------

export interface ReminderInput {
  firstName: string;
  goalMinutes: number;
  /** What counts towards today's goal so far, in minutes. */
  progress: number;
  streak: number;
  strictFocus: boolean;
  /** Where "Continue reading" goes. */
  readUrl: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

export function reminderEmail(r: ReminderInput): {
  subject: string;
  /** The message in one line, also used for the in-app notification. */
  line: string;
  text: string;
  html: string;
} {
  const left = Math.max(1, Math.ceil(r.goalMinutes - r.progress));
  const minutes = (n: number) => `${n} ${n === 1 ? "minute" : "minutes"}`;
  const subject =
    r.streak > 0
      ? `Keep your ${r.streak}-day streak: ${minutes(left)} to go`
      : `${minutes(left)} of reading today`;
  const ask = r.strictFocus
    ? `Read ${minutes(r.goalMinutes)} in one go to reach today's goal.`
    : r.progress > 0
      ? `You're ${minutes(left)} away from today's goal.`
      : `Today's goal is ${minutes(r.goalMinutes)}.`;
  const streakLine =
    r.streak > 0 ? `You've read ${r.streak} ${r.streak === 1 ? "day" : "days"} in a row.` : "";
  const line = [ask, streakLine].filter(Boolean).join(" ");
  const lines = [`Hi ${r.firstName},`, "", line];

  const text = [
    ...lines,
    "",
    `Continue reading: ${r.readUrl}`,
    "",
    "--",
    `Change the reminder time: ${r.settingsUrl}`,
    `Stop these emails: ${r.unsubscribeUrl}`,
  ].join("\n");

  const p = "margin:0 0 16px;font-size:16px;line-height:1.55;color:#1f1d1a";
  const small = "margin:0;font-size:12.5px;line-height:1.6;color:#6b665e";
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fbfaf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:480px;margin:0 auto;padding:28px;background:#ffffff;border:1px solid #e7e3da;border-radius:14px">
<p style="margin:0 0 20px;font-family:Georgia,serif;font-size:20px;font-weight:600;color:#a8323e">Ribbon</p>
<p style="${p}">Hi ${escapeHtml(r.firstName)},</p>
<p style="${p}">${escapeHtml(line)}</p>
<p style="margin:24px 0"><a href="${escapeHtml(r.readUrl)}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#a8323e;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none">Continue reading</a></p>
<hr style="margin:24px 0 16px;border:0;border-top:1px solid #e7e3da">
<p style="${small}"><a href="${escapeHtml(r.settingsUrl)}" style="color:#6b665e">Change the reminder time</a> · <a href="${escapeHtml(r.unsubscribeUrl)}" style="color:#6b665e">Stop these emails</a></p>
</div>
</body></html>`;

  return { subject, line, text, html };
}
