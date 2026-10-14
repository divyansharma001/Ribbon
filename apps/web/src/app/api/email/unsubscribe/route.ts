import { stopReminders } from "@/lib/notify/reminders";
import { isUnsubscribeToken } from "@/lib/notify/token";

/**
 * Turns reminder emails off. Mail apps POST here directly when someone uses
 * their built-in "Unsubscribe" button (RFC 8058); the /unsubscribe page posts
 * here from its button. No session needed: the signed token is the proof.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";

  const valid = Boolean(userId && secret && isUnsubscribeToken(userId, token, secret));
  if (valid) await stopReminders(userId);
  if (oneClick) return new Response(null, { status: valid ? 200 : 400 });

  // From the page's button: back to the page, which says what happened.
  const back = new URL("/unsubscribe", url);
  if (valid) back.searchParams.set("done", "1");
  return Response.redirect(back, 303);
}
