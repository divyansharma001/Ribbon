import "server-only";
import { eq, schema, sql } from "@ribbon/db";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { cleanPrefs, DEFAULT_PREFS, PREF_COOKIES, type ReaderPrefs } from "./prefs";
import { getSession } from "./session";

/** The account's saved settings, or none if it never changed any. */
export async function getSavedPrefs(userId: string): Promise<Partial<ReaderPrefs>> {
  const [row] = await db
    .select({ reader: schema.userSettings.reader })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  return cleanPrefs(row?.reader);
}

/**
 * Settings for this request: the account's saved settings win, so they follow
 * the reader to every device. This device's cookies fill any gaps (and are all
 * there is on the login page). Once per request.
 */
export const getReaderPrefs = cache(async (): Promise<ReaderPrefs> => {
  const jar = await cookies();
  const fromCookies = cleanPrefs(
    Object.fromEntries(
      Object.entries(PREF_COOKIES).map(([key, name]) => [key, jar.get(name)?.value]),
    ),
  );
  const session = await getSession();
  const saved = session ? await getSavedPrefs(session.user.id) : {};
  return { ...DEFAULT_PREFS, ...fromCookies, ...saved };
});

/**
 * Merges a change into the account's saved settings, in one statement, so two
 * quick changes (theme, then text size) can't overwrite each other.
 */
export async function savePrefsFor(userId: string, change: Partial<ReaderPrefs>) {
  await db
    .insert(schema.userSettings)
    .values({ userId, reader: change })
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: {
        reader: sql`${schema.userSettings.reader} || excluded.reader`,
        updatedAt: new Date(),
      },
    });
}
