import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createTestDb } from "@ribbon/db/testing";
import { loadBook, readBookContent } from "@ribbon/ingest/load";
import { E2E_DATABASE_URL, E2E_SECRET, E2E_URL } from "../playwright.config";
import { createTestLogin } from "./support/test-auth";

/** Fresh test database with the real book loaded, and a signed-in test reader. */
export default async function globalSetup() {
  const repoRoot = resolve(import.meta.dirname, "../../..");
  const { db, close } = await createTestDb();
  try {
    await loadBook(db, await readBookContent(join(repoRoot, "content", "ddia-2e")));
  } finally {
    await close();
  }
  const { cookies } = await createTestLogin({
    databaseUrl: E2E_DATABASE_URL,
    secret: E2E_SECRET,
    baseURL: E2E_URL,
  });
  await mkdir(join(import.meta.dirname, ".auth"), { recursive: true });
  await writeFile(
    join(import.meta.dirname, ".auth/state.json"),
    JSON.stringify({ cookies, origins: [] }),
  );
}
