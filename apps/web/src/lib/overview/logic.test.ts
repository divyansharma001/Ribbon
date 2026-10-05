import type { OutlineNode } from "@ribbon/book-schema";
import { describe, expect, it } from "vitest";
import {
  buildSections,
  chapterStats,
  EMPTY_STATS,
  masteryOf,
  type SectionStats,
  sectionOfBlock,
} from "./logic";

const stats = (s: Partial<SectionStats>): SectionStats => ({ ...EMPTY_STATS, ...s });

describe("section mastery", () => {
  it("goes from unread to read by the share of blocks read", () => {
    expect(masteryOf(stats({ total: 10 }))).toBe("unread");
    expect(masteryOf(stats({ total: 10, read: 1 }))).toBe("reading");
    expect(masteryOf(stats({ total: 10, read: 9 }))).toBe("read");
  });

  it("is checked once every question is answered, even if some were wrong", () => {
    expect(masteryOf(stats({ total: 10, read: 10, questions: 3, answered: 2 }))).toBe("read");
    expect(masteryOf(stats({ total: 10, read: 10, questions: 3, answered: 3, weak: 1 }))).toBe(
      "checked",
    );
  });

  it("is mastered only when every question was recalled again later", () => {
    expect(masteryOf(stats({ total: 10, read: 10, questions: 3, answered: 3, solid: 2 }))).toBe(
      "checked",
    );
    expect(masteryOf(stats({ total: 10, read: 10, questions: 3, answered: 3, solid: 3 }))).toBe(
      "mastered",
    );
  });

  it("counts answering a question as having started reading", () => {
    expect(masteryOf(stats({ total: 10, questions: 3, answered: 1 }))).toBe("reading");
  });
});

describe("section tree", () => {
  const outline: OutlineNode[] = [
    {
      anchor: "s1",
      blockId: "s1.0",
      level: 2,
      title: "One",
      children: [{ anchor: "s1a", blockId: "s1a.0", level: 3, title: "One A", children: [] }],
    },
    { anchor: "s2", blockId: "s2.0", level: 2, title: "Two", children: [] },
  ];
  const own = new Map([
    ["ch", stats({ total: 4, read: 4 })],
    ["s1", stats({ total: 2, read: 2 })],
    ["s1a", stats({ total: 8, read: 2, questions: 2, answered: 1 })],
  ]);
  const tree = buildSections("ch", outline, own);

  it("adds subsections into their parent", () => {
    const one = tree.find((n) => n.anchor === "s1");
    expect(one?.stats).toEqual(stats({ total: 10, read: 4, questions: 2, answered: 1 }));
    expect(one?.mastery).toBe("reading");
  });

  it("puts the chapter's opening text first, as Introduction", () => {
    expect(tree[0]).toMatchObject({ anchor: "ch", title: "Introduction", mastery: "read" });
  });

  it("treats sections with no numbers as empty", () => {
    expect(tree.find((n) => n.anchor === "s2")?.mastery).toBe("unread");
  });

  it("adds the whole chapter up without counting subsections twice", () => {
    expect(chapterStats(tree)).toEqual(stats({ total: 14, read: 8, questions: 2, answered: 1 }));
  });

  it("finds a block's section from its id", () => {
    expect(sectionOfBlock("sec_introduction_twitter.12")).toBe("sec_introduction_twitter");
    expect(sectionOfBlock("id20.3")).toBe("id20");
  });
});
