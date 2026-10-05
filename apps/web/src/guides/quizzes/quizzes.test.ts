import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { QUIZZES } from "./index";

const contentDir = join(import.meta.dirname, "../../../../../content/ddia-2e/chapters");

describe("quiz bank", () => {
  const all = Object.entries(QUIZZES["ddia-2e"] ?? {}).flatMap(([chapterId, sets]) =>
    sets.map((set) => ({ chapterId, set })),
  );

  it("has unique question ids and valid answers", () => {
    const ids = new Set<string>();
    for (const { set } of all) {
      expect(set.questions.length).toBeGreaterThan(0);
      for (const q of set.questions) {
        expect(ids.has(q.id), q.id).toBe(false);
        ids.add(q.id);
        if (q.kind === "choice" || q.kind === "blank") {
          expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
          expect(q.answer, q.id).toBeLessThan(q.options.length);
          expect(new Set(q.options).size, q.id).toBe(q.options.length);
        }
        if (q.kind === "blank") expect(q.prompt, q.id).toContain("___");
        if (q.kind === "order") expect(q.items.length, q.id).toBeGreaterThanOrEqual(3);
        if (q.kind === "match") expect(q.pairs.length, q.id).toBeGreaterThanOrEqual(3);
      }
    }
  });

  // Needs the ingested book (git-ignored). Skipped on a fresh checkout.
  it.skipIf(!existsSync(contentDir))("points at real blocks, in the right place", () => {
    for (const { chapterId, set } of all) {
      const chapter = JSON.parse(readFileSync(join(contentDir, `${chapterId}.json`), "utf8")) as {
        blocks: { hash: string; block: { id: string } }[];
      };
      const ids = new Set<string>();
      const collect = (b: unknown) => {
        if (b && typeof b === "object") {
          const o = b as { id?: unknown };
          if (typeof o.id === "string") ids.add(o.id);
          for (const v of Object.values(b)) collect(v);
        }
      };
      collect(chapter.blocks);
      const after = chapter.blocks.find((p) => p.block.id === set.afterBlockId);
      expect(after?.hash, set.id).toBe(set.blockHash);
      for (const q of set.questions) expect(ids.has(q.source), `${q.id} -> ${q.source}`).toBe(true);
    }
  });
});
