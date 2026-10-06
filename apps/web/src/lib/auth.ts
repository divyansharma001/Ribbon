import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { schema } from "@ribbon/db";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { requireEnv } from "./env";
import { claimInvite, isOwner, isUsableInvite } from "./invites/data";
import { INVITE_COOKIE, readCookie } from "./invites/logic";

/** The invite code carried through Google sign-in, if any. */
function inviteCode(context: { headers?: Headers; request?: Request } | null): string | null {
  const cookies = context?.headers?.get("cookie") ?? context?.request?.headers.get("cookie");
  return readCookie(cookies, INVITE_COOKIE);
}

export const auth = betterAuth({
  baseURL: requireEnv("BETTER_AUTH_URL"),
  secret: requireEnv("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      prompt: "select_account",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the expiry once a day of use
  },
  /*
   * Who may create an account: the owner (ALLOWED_EMAIL), or a friend who
   * arrives with a valid invite. Everyone else is turned away at sign-up.
   */
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (!user.emailVerified) return false;
          if (isOwner(user.email)) return true;
          const code = inviteCode(context);
          return code ? await isUsableInvite(code) : false;
        },
        after: async (user, context) => {
          const code = isOwner(user.email) ? null : inviteCode(context);
          if (code) await claimInvite(code, user.id);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
