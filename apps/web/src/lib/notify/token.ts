import { createHmac, timingSafeEqual } from "node:crypto";

/* Unsubscribe links are signed, so only the reader's own link turns their reminders off. */

export function unsubscribeToken(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("base64url");
}

export function isUnsubscribeToken(userId: string, token: string, secret: string): boolean {
  const want = Buffer.from(unsubscribeToken(userId, secret));
  const got = Buffer.from(token);
  return want.length === got.length && timingSafeEqual(want, got);
}
