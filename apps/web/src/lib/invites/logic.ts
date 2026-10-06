/*
 * Invites: links that let a friend join Ribbon. Pure functions.
 */

/** Days an invite link stays valid. */
export const INVITE_DAYS = 14;
/** Invites each friend can send. The owner has no limit. */
export const FRIEND_INVITES = 3;
/** Cookie that carries an invite code through Google sign-in. */
export const INVITE_COOKIE = "ribbon-invite";
/** XP each of you gets when an invited friend finishes their first chapter. */
export const FRIEND_CHAPTER_XP = 100;
/** Streak a friend must reach for both of you to get a freeze. */
export const FRIEND_STREAK_DAYS = 7;

export type InviteStatus = "pending" | "used" | "expired" | "revoked";

export interface InviteRow {
  expiresAt: Date;
  usedBy: string | null;
  revokedAt: Date | null;
}

export function inviteStatus(invite: InviteRow, now = new Date()): InviteStatus {
  if (invite.usedBy) return "used";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

/** How many more invites someone can create. Cancelled ones give the invite back. */
export function invitesLeft(
  isOwner: boolean,
  invites: readonly InviteRow[],
  now = new Date(),
): number | null {
  if (isOwner) return null; // no limit
  const counted = invites.filter((i) => {
    const s = inviteStatus(i, now);
    return s === "pending" || s === "used";
  }).length;
  return Math.max(0, FRIEND_INVITES - counted);
}

/** A cookie's value from a Cookie header. */
export function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Invite codes: 128 random bits, URL-safe. */
export const CODE = /^[A-Za-z0-9_-]{20,40}$/;
