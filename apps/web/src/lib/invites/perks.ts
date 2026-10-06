import "server-only";
import { and, eq, inArray, schema, sql } from "@ribbon/db";
import { cache } from "react";
import { db } from "../db";

/*
 * Perks from inviting friends, as given (see syncPerks in ./data). Read-only,
 * so XP and streak code can use it without depending on the invite code.
 */

export interface PerkTotals {
  xp: number;
  /** Local dates on which freezes were gifted, one entry per freeze. */
  freezeDates: string[];
  /** XP per local date, for the weekly race. */
  xpByDay: Map<string, number>;
}

export const getPerks = cache(async (userId: string): Promise<PerkTotals> => {
  const rows = await db
    .select({
      xp: schema.perkGrants.xp,
      freezes: schema.perkGrants.freezes,
      on: schema.perkGrants.grantedOn,
    })
    .from(schema.perkGrants)
    .where(eq(schema.perkGrants.userId, userId));
  const xpByDay = new Map<string, number>();
  const freezeDates: string[] = [];
  let xp = 0;
  for (const r of rows) {
    xp += r.xp;
    if (r.xp) xpByDay.set(r.on, (xpByDay.get(r.on) ?? 0) + r.xp);
    for (let i = 0; i < r.freezes; i++) freezeDates.push(r.on);
  }
  return { xp, freezeDates, xpByDay };
});

/** Invited friends who have finished at least one chapter (for the Connector badges). */
export async function countReadingFriends(userId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.perkGrants)
    .where(
      and(
        eq(schema.perkGrants.userId, userId),
        eq(schema.perkGrants.reason, "friend-first-chapter"),
        // Only friends this reader invited, not the one who invited them.
        inArray(
          schema.perkGrants.friendId,
          db
            .select({ id: schema.invites.usedBy })
            .from(schema.invites)
            .where(eq(schema.invites.inviterId, userId)),
        ),
      ),
    );
  return rows[0]?.n ?? 0;
}
