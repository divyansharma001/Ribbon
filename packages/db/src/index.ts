import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.ts";

// Query helpers, re-exported so every package uses this one copy of drizzle-orm.
export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  max,
  or,
  sql,
} from "drizzle-orm";
export { schema };
export type Db = NodePgDatabase<typeof schema>;

/**
 * Creates a pooled database client.
 *
 * On Vercel, `attachDatabasePool` closes idle connections before the function
 * is suspended, which is what Neon recommends for Fluid compute.
 */
export function createDb(url: string): { db: Db; pool: Pool } {
  const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 10_000 });
  attachDatabasePool(pool);
  return { db: drizzle({ client: pool, schema, casing: "snake_case" }), pool };
}
