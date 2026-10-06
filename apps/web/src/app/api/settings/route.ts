import type { NextRequest } from "next/server";
import { cleanPrefs, PREF_COOKIES, type ReaderPrefs } from "@/lib/prefs";
import { savePrefsFor } from "@/lib/prefs-server";
import { getSession } from "@/lib/session";

const YEAR = 60 * 60 * 24 * 365;

/** Saves reading settings to the account, and mirrors them into this device's cookies. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const change = cleanPrefs(body);
  if (Object.keys(change).length === 0) {
    return Response.json({ error: "nothing to save" }, { status: 400 });
  }
  await savePrefsFor(session.user.id, change);
  const headers = new Headers();
  for (const [key, value] of Object.entries(change) as [keyof ReaderPrefs, string][]) {
    headers.append(
      "Set-Cookie",
      `${PREF_COOKIES[key]}=${value}; Path=/; Max-Age=${YEAR}; SameSite=Lax`,
    );
  }
  return new Response(null, { status: 204, headers });
}
