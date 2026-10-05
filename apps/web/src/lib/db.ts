import "server-only";
import { createDb, type Db } from "@ribbon/db";
import { requireEnv } from "./env";

// Reuse one pool per server instance (and across hot reloads in development).
const globalForDb = globalThis as unknown as { ribbonDb?: Db };

export const db: Db = globalForDb.ribbonDb ?? createDb(requireEnv("DATABASE_URL")).db;
if (process.env.NODE_ENV !== "production") globalForDb.ribbonDb = db;
