import { join, resolve } from "node:path";
import { createDb } from "@ribbon/db";
import { config } from "dotenv";
import { loadBook, readBookContent, uploadFigures } from "./load.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");
config({ path: join(repoRoot, ".env"), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const bookId = args.find((a) => !a.startsWith("--")) ?? "ddia-2e";

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const dir = join(repoRoot, "content", bookId);
  const content = await readBookContent(dir);
  const { db, pool } = createDb(url);
  try {
    const result = await loadBook(db, content, { force });
    console.log(
      result.skipped
        ? `${bookId}: content unchanged, database not touched (use --force to reload)`
        : `${bookId}: loaded ${result.chapters} chapters, ${result.blocks} blocks, ` +
            `${result.anchors} anchors, ${result.glossary} glossary terms, ${result.indexTerms} index terms`,
    );
  } finally {
    await pool.end();
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.log(
      "BLOB_READ_WRITE_TOKEN is not set: figures not uploaded (local dev serves them from content/)",
    );
    return;
  }
  const figures = await uploadFigures(dir, bookId, token);
  console.log(
    `${bookId}: figures uploaded ${figures.uploaded}, already there ${figures.unchanged}`,
  );
}

await main();
