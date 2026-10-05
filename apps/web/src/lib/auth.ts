import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { schema } from "@ribbon/db";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import { requireEnv } from "./env";

/** Ribbon is a personal app: only this Google account may have a user. */
const allowedEmail = requireEnv("ALLOWED_EMAIL").trim().toLowerCase();

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
  databaseHooks: {
    user: {
      create: {
        before: async (user) =>
          user.emailVerified && user.email.trim().toLowerCase() === allowedEmail,
      },
    },
  },
  plugins: [nextCookies()],
});
