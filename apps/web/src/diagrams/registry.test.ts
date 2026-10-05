import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DIAGRAMS } from "./registry";

const contentDir = join(import.meta.dirname, "../../../../content/ddia-2e/chapters");

describe("diagram registry", () => {
  const all = Object.entries(DIAGRAMS["ddia-2e"] ?? {}).flatMap(([chapterId, list]) =>
    list.map((d) => ({ chapterId, d })),
  );

  it("has unique ids and one diagram per block", () => {
    expect(new Set(all.map(({ d }) => d.id)).size).toBe(all.length);
    expect(new Set(all.map(({ d }) => d.afterBlockId)).size).toBe(all.length);
  });

  // Needs the ingested book (git-ignored). Skipped on a fresh checkout.
  it.skipIf(!existsSync(contentDir))("points at real blocks, in the right place", () => {
    for (const { chapterId, d } of all) {
      const chapter = JSON.parse(readFileSync(join(contentDir, `${chapterId}.json`), "utf8")) as {
        blocks: { hash: string; block: { id: string } }[];
      };
      const after = chapter.blocks.find((b) => b.block.id === d.afterBlockId);
      expect(after?.hash, d.id).toBe(d.blockHash);
    }
  });
});
