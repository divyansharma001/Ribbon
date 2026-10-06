import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, or, schema, sql } from "@ribbon/db";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";
import { requireEnv } from "../env";
import { countFinishedChapters } from "../learning/data";
import { getStreakSettings, loadStreak } from "../streaks/data";
import { localDate } from "../streaks/logic";
import {
  FRIEND_CHAPTER_XP,
  FRIEND_STREAK_DAYS,
  INVITE_DAYS,
  type InviteStatus,
  inviteStatus,
  invitesLeft,
} from "./logic";

/** The owner of this Ribbon: the one account that can always sign in and read every book. */
export function isOwner(email: string): boolean {
  return email.trim().toLowerCase() === requireEnv("ALLOWED_EMAIL").trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export interface InviteView {
  id: string;
  code: string;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
  /** First name of the friend who joined with it. */
  usedByName: string | null;
}

export async function listInvites(userId: string): Promise<InviteView[]> {
  const rows = await db
    .select({ invite: schema.invites, friend: schema.user.name })
    .from(schema.invites)
    .leftJoin(schema.user, eq(schema.user.id, schema.invites.usedBy))
    .where(eq(schema.invites.inviterId, userId))
    .orderBy(desc(schema.invites.createdAt));
  return rows.map(({ invite, friend }) => ({
    id: invite.id,
    code: invite.code,
    status: inviteStatus(invite),
    createdAt: invite.createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
    usedByName: friend ? firstName(friend) : null,
  }));
}

export async function getInvitesLeft(userId: string, email: string): Promise<number | null> {
  const rows = await db
    .select({
      expiresAt: schema.invites.expiresAt,
      usedBy: schema.invites.usedBy,
      revokedAt: schema.invites.revokedAt,
    })
    .from(schema.invites)
    .where(eq(schema.invites.inviterId, userId));
  return invitesLeft(isOwner(email), rows);
}

export type CreateResult = { ok: true; code: string } | { ok: false; error: "limit" };

export async function createInvite(userId: string, email: string): Promise<CreateResult> {
  const left = await getInvitesLeft(userId, email);
  if (left !== null && left <= 0) return { ok: false, error: "limit" };
  const code = randomBytes(16).toString("base64url");
  await db.insert(schema.invites).values({
    id: crypto.randomUUID(),
    code,
    inviterId: userId,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
  });
  return { ok: true, code };
}

/** Cancels an unused invite. */
export async function revokeInvite(userId: string, inviteId: string): Promise<void> {
  await db
    .update(schema.invites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.invites.id, inviteId),
        eq(schema.invites.inviterId, userId),
        isNull(schema.invites.usedBy),
        isNull(schema.invites.revokedAt),
      ),
    );
}

/** What the invite page shows: who sent it, and whether it can still be used. */
export async function getInvite(
  code: string,
): Promise<{ inviterName: string; status: InviteStatus } | null> {
  const [row] = await db
    .select({ invite: schema.invites, name: schema.user.name })
    .from(schema.invites)
    .innerJoin(schema.user, eq(schema.user.id, schema.invites.inviterId))
    .where(eq(schema.invites.code, code));
  return row ? { inviterName: firstName(row.name), status: inviteStatus(row.invite) } : null;
}

/** True if this code can still let someone join. Checked when Google sign-in creates the account. */
export async function isUsableInvite(code: string): Promise<boolean> {
  const invite = await getInvite(code);
  return invite?.status === "pending";
}

/** Marks the invite as used by the new account. Only the first claim wins. */
export async function claimInvite(code: string, userId: string): Promise<boolean> {
  const claimed = await db
    .update(schema.invites)
    .set({ usedBy: userId, usedAt: new Date() })
    .where(
      and(
        eq(schema.invites.code, code),
        isNull(schema.invites.usedBy),
        isNull(schema.invites.revokedAt),
        gt(schema.invites.expiresAt, new Date()),
      ),
    )
    .returning({ id: schema.invites.id });
  return claimed.length > 0;
}

// ---------------------------------------------------------------------------
// Book access: friends confirm they own a copy.
// ---------------------------------------------------------------------------

export async function hasBookAccess(
  user: { id: string; email: string },
  bookId: string,
): Promise<boolean> {
  if (isOwner(user.email)) return true;
  const [row] = await db
    .select({ at: schema.bookAccess.confirmedAt })
    .from(schema.bookAccess)
    .where(and(eq(schema.bookAccess.userId, user.id), eq(schema.bookAccess.bookId, bookId)));
  return Boolean(row);
}

export async function confirmOwnership(userId: string, bookId: string): Promise<void> {
  await db.insert(schema.bookAccess).values({ userId, bookId }).onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Friends: the circle of who invited whom, and the perks it brings.
// ---------------------------------------------------------------------------

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export interface Friend {
  id: string;
  name: string;
  /** "invited-you" or "you-invited". */
  relation: "invited-you" | "you-invited";
}

/** The reader's friends: whoever invited them, and everyone they invited. */
export const getFriends = cache(async (userId: string): Promise<Friend[]> => {
  const rows = await db
    .select({
      inviterId: schema.invites.inviterId,
      usedBy: schema.invites.usedBy,
    })
    .from(schema.invites)
    .where(
      and(
        or(eq(schema.invites.inviterId, userId), eq(schema.invites.usedBy, userId)),
        sql`${schema.invites.usedBy} is not null`,
      ),
    );
  const ids = new Map<string, Friend["relation"]>();
  for (const r of rows) {
    if (r.usedBy === userId) ids.set(r.inviterId, "invited-you");
    else if (r.usedBy) ids.set(r.usedBy, "you-invited");
  }
  if (ids.size === 0) return [];
  const users = await db
    .select({ id: schema.user.id, name: schema.user.name })
    .from(schema.user)
    .where(inArray(schema.user.id, [...ids.keys()]));
  return users.map((u) => ({
    id: u.id,
    name: firstName(u.name),
    relation: ids.get(u.id) ?? "you-invited",
  }));
});

/**
 * Gives any perks earned since last time, once each: when an invited friend
 * finishes their first chapter, both get XP; when they reach a 7-day streak,
 * both get a streak freeze. Safe to call on every page view.
 */
export async function syncPerks(userId: string): Promise<void> {
  const friends = await getFriends(userId);
  // Perks come from the invited friend's progress, whichever side of the invite this reader is on.
  const pairs = friends.map((f) =>
    f.relation === "you-invited"
      ? { inviter: userId, friend: f.id }
      : { inviter: f.id, friend: userId },
  );
  for (const { inviter, friend } of pairs) {
    // Read fresh, not from this page's cache, so a perk earned just now shows at once.
    const [chapters, streak] = await Promise.all([
      countFinishedChapters(friend),
      loadStreak(friend),
    ]);
    const grants: (typeof schema.perkGrants.$inferInsert)[] = [];
    const dayFor = async (id: string) => localDate((await getStreakSettings(id)).timeZone);
    if (chapters >= 1) {
      grants.push(
        {
          id: crypto.randomUUID(),
          userId: inviter,
          friendId: friend,
          reason: "friend-first-chapter",
          xp: FRIEND_CHAPTER_XP,
          grantedOn: await dayFor(inviter),
        },
        {
          id: crypto.randomUUID(),
          userId: friend,
          friendId: inviter,
          reason: "friend-first-chapter",
          xp: FRIEND_CHAPTER_XP,
          grantedOn: await dayFor(friend),
        },
      );
    }
    if (streak.best >= FRIEND_STREAK_DAYS) {
      grants.push(
        {
          id: crypto.randomUUID(),
          userId: inviter,
          friendId: friend,
          reason: "friend-week-streak",
          freezes: 1,
          grantedOn: await dayFor(inviter),
        },
        {
          id: crypto.randomUUID(),
          userId: friend,
          friendId: inviter,
          reason: "friend-week-streak",
          freezes: 1,
          grantedOn: await dayFor(friend),
        },
      );
    }
    if (grants.length) await db.insert(schema.perkGrants).values(grants).onConflictDoNothing();
  }
}

/** Sends a reader who hasn't confirmed they own the book to the unlock page. */
export async function requireBookAccess(
  user: { id: string; email: string },
  bookId: string,
): Promise<void> {
  if (!(await hasBookAccess(user, bookId)))
    redirect(`/books/${encodeURIComponent(bookId)}/unlock` as Route);
}
