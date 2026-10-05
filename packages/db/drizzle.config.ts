import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: "../../.env", quiet: true });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  casing: "snake_case",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
