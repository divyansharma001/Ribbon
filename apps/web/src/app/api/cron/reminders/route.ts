import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/notify/reminders";

export const maxDuration = 60;

/** True when the request carries "Authorization: Bearer <CRON_SECRET>". */
function isScheduler(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const want = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  return want.length === got.length && timingSafeEqual(want, got);
}

/**
 * Sends the reminder emails that are due. Called every 15 minutes by the
 * GitHub Actions workflow in .github/workflows/reminders.yml. Running it more
 * or less often is safe: each reader gets at most one reminder a day.
 */
export async function GET(request: Request) {
  if (!isScheduler(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await sendDueReminders());
}
