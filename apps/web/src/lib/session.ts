import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** The signed-in session, checked against the database. Once per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** The signed-in user. Sends visitors without a valid session to the login page. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}
