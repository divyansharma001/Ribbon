import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BOOKS } from "./books.ts";
import { readEpub } from "./epub.ts";
import { type IngestResult, ingest } from "./ingest.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");

async function main() {
  const bookId = process.argv[2] ?? "ddia-2e";
  const config = BOOKS[bookId];
  if (!config) {
    console.error(`Unknown book "${bookId}". Known books: ${Object.keys(BOOKS).join(", ")}`);
    process.exit(1);
  }

  const source = join(repoRoot, config.source);
  const epub = readEpub(new Uint8Array(await readFile(source)));
  const result = ingest(epub, config);

  const outDir = join(repoRoot, "content", config.id);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, "chapters"), { recursive: true });
  await mkdir(join(outDir, "figures"), { recursive: true });

  const json = (data: unknown) => `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(join(outDir, "book.json"), json(result.book));
  await writeFile(join(outDir, "glossary.json"), json(result.glossary));
  for (const chapter of result.chapters) {
    await writeFile(join(outDir, "chapters", `${chapter.id}.json`), json(chapter));
  }
  for (const [path, data] of result.images) await writeFile(join(outDir, path), data);
  await writeFile(join(outDir, "report.md"), renderReport(result));

  const { errors, warnings } = result.report;
  console.log(
    `${config.id}: ${result.chapters.length} chapters, ${result.images.size} figures, ` +
      `${result.glossary.length} glossary terms -> ${outDir}`,
  );
  console.log(`${errors.length} errors, ${warnings.length} warnings (see report.md)`);
  if (errors.length) process.exit(1);
}

function renderReport({ book, chapters, glossary, images, report }: IngestResult): string {
  const lines = [
    `# Ingest report: ${book.title} (edition ${book.edition})`,
    "",
    `- Chapters: ${chapters.length}`,
    `- Words: ${chapters.reduce((s, c) => s + c.words, 0)}`,
    `- Figures: ${images.size}`,
    `- Glossary terms: ${glossary.length}`,
    `- Errors: ${report.errors.length}`,
    `- Warnings: ${report.warnings.length}`,
    "",
    "## Chapters",
    "",
    "| Id | Title | Words | Blocks | Notes | Index terms |",
    "|---|---|---|---|---|---|",
    ...chapters.map(
      (c) =>
        `| ${c.id} | ${c.title} | ${c.words} | ${c.blocks.length} | ${c.notes.length} | ${c.indexTerms.length} |`,
    ),
    "",
    "## Source vs output counts",
    "",
    "| Chapter | Kind | Source | Output | OK |",
    "|---|---|---|---|---|",
    ...report.counts.map(
      (c) =>
        `| ${c.chapterId} | ${c.kind} | ${c.source} | ${c.output} | ${c.source === c.output ? "yes" : "NO"} |`,
    ),
    "",
    "## Errors",
    "",
    ...(report.errors.length ? report.errors.map((e) => `- ${e}`) : ["None."]),
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((w) => `- ${w}`) : ["None."]),
    "",
  ];
  return lines.join("\n");
}

await main();
