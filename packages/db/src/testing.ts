import { join } from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb, type Db } from "./index.ts";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://ribbon:ribbon@localhost:5433/ribbon_test";

/**
 * Connects to the test database, applies migrations, and empties every table.
 * Needs the local Postgres from docker-compose.yml.
 */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const { db, pool } = createDb(TEST_DATABASE_URL);
  await migrate(db, { migrationsFolder: join(import.meta.dirname, "../migrations") });
  const { rows } = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public'",
  );
  if (rows.length) {
    const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
    await db.execute(sql.raw(`truncate ${tables} cascade`));
  }
  return { db, close: () => pool.end() };
}
