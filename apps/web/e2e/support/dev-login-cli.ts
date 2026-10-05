// Prints session cookies for a test user in the dev database (for local screenshots).
import { createTestLogin } from "./test-auth.ts";

const { cookies } = await createTestLogin({
  databaseUrl: process.env.DATABASE_URL ?? "",
  secret: process.env.BETTER_AUTH_SECRET ?? "",
  baseURL: "http://localhost:3210",
});
console.log(JSON.stringify(cookies));
