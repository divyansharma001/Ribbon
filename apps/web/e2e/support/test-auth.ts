/**
 * Test-only sign-in. Creates a user and a session directly in the database with
 * Better Auth's test-utils plugin, so browser tests never need Google.
 * Never imported by the app itself.
 */
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createDb, eq, schema } from "@ribbon/db";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";

export interface TestCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
  expires: number;
}

export async function createTestLogin(options: {
  databaseUrl: string;
  secret: string;
  baseURL: string;
  email?: string;
}): Promise<{ userId: string; cookies: TestCookie[] }> {
  const { db, pool } = createDb(options.databaseUrl);
  try {
    const auth = betterAuth({
      baseURL: options.baseURL,
      secret: options.secret,
      database: drizzleAdapter(db, { provider: "pg", schema }),
      plugins: [testUtils()],
    });
    const test = (await auth.$context).test;
    const email = options.email ?? "reader@example.com";
    const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, email));
    const user =
      existing ??
      (await test.saveUser(test.createUser({ email, name: "Test Reader", emailVerified: true })));
    const { cookies } = await test.login({ userId: user.id });
    const domain = new URL(options.baseURL).hostname;
    return {
      userId: user.id,
      cookies: cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain,
        path: c.path ?? "/",
        httpOnly: c.httpOnly ?? true,
        secure: false,
        sameSite: "Lax",
        expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      })),
    };
  } finally {
    await pool.end();
  }
}
