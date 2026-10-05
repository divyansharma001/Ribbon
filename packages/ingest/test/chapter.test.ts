import { blockText, Chapter, type Inline } from "@ribbon/book-schema";
import { describe, expect, it } from "vitest";
import { tidyInlines } from "../src/chapter.ts";
import { parseFixture } from "./fixtures.ts";

const parse = parseFixture;

describe("parseChapter", () => {
  it("produces a chapter that passes the schema with no warnings", () => {
    const result = parse();
    expect(result.warnings).toEqual([]);
    expect(Chapter.safeParse(result.chapter).success).toBe(true);
  });

  it("builds the outline from nested sections", () => {
    const { chapter } = parse();
    expect(chapter.title).toBe("Widgets");
    expect(chapter.outline.map((o) => o.title)).toEqual(["Kinds of Widgets", "Summary"]);
    expect(chapter.outline[0]?.children.map((o) => o.title)).toEqual(["Small Widgets"]);
  });

  it("gives blocks stable ids based on their section", () => {
    const ids = parse().chapter.blocks.map((b) => b.block.id);
    expect(ids.slice(0, 3)).toEqual(["ch_widgets.0", "ch_widgets.1", "ch_widgets.2"]);
    expect(ids).toContain("sec_widgets_kinds.0");
    expect(ids).toContain("sec_widgets_small.1");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cleans whitespace, keeps links, and drops brackets around note markers", () => {
    const para = parse().chapter.blocks[2]?.block;
    expect(para?.type).toBe("paragraph");
    if (para?.type !== "paragraph") return;
    expect(blockText(para)).toBe("Widgets are small things, see “Kinds”.");
    expect(para.content.filter((n) => n.t === "noteref").map((n) => n.label)).toEqual(["1", "2"]);
    expect(para.content.some((n) => n.t === "xref" && n.target === "sec_widgets_kinds")).toBe(true);
  });

  it("keeps extra text inside citation brackets as a suffix", () => {
    const para = parse().chapter.blocks.find((b) => b.block.id === "sec_widgets_kinds.1")?.block;
    if (para?.type !== "paragraph") throw new Error("expected a paragraph");
    expect(para.content).toEqual([
      { t: "text", text: "Big ones exist" },
      { t: "noteref", target: "Ref1", label: "1", suffix: ", Table 3" },
      { t: "text", text: "." },
    ]);
  });

  it("parses figures, code with callouts, tables, notes, and sidebars", () => {
    const result = parse();
    const types = result.chapter.blocks.map((b) => b.block.type);
    expect(types).toEqual([
      "heading",
      "quote",
      "paragraph",
      "heading",
      "paragraph",
      "figure",
      "heading",
      "list",
      "code",
      "callouts",
      "table",
      "note",
      "heading",
      "sidebar",
    ]);
    const code = result.chapter.blocks.find((b) => b.block.type === "code")?.block;
    expect(code).toMatchObject({
      language: "sql",
      code: "SELECT 1\nFROM t;",
      callouts: [{ number: 1, line: 0 }],
    });
    const table = result.chapter.blocks.find((b) => b.block.type === "table")?.block;
    expect(table).toMatchObject({
      label: "Table 2-1.",
      head: [[[{ text: "Name" }], [{ text: "Size" }]]],
    });
    expect(result.images).toEqual([{ source: "assets/w1.png", src: "figures/w1.png" }]);
  });

  it("wraps bare list item text in a paragraph", () => {
    const list = parse().chapter.blocks.find((b) => b.block.type === "list")?.block;
    if (list?.type !== "list") throw new Error("expected a list");
    expect(list.items.map((item) => item.map(blockText))).toEqual([["One"], ["Two"]]);
    expect(list.items[1]?.[0]?.id).toBe(`${list.id}.1.0`);
  });

  it("reads references and maps anchors to blocks", () => {
    const { chapter, anchors } = parse();
    expect(chapter.notes.map((n) => [n.anchor, n.label, n.kind])).toEqual([
      ["Ref1", "1", "reference"],
      ["Ref2", "2", "reference"],
    ]);
    expect(chapter.notes[0]?.content[0]).toEqual({ t: "text", text: "A. Author. " });
    expect(anchors.get("fig_widget")).toBe("sec_widgets_kinds.2");
    expect(anchors.get("sec_widgets_small")).toBe("sec_widgets_small.0");
    expect(anchors.get("sidebar_w")).toBe("sec_widgets_summary.1");
  });

  it("attaches index terms to the block they appear in", () => {
    expect(parse().chapter.indexTerms).toEqual([{ primary: "widgets", blockId: "ch_widgets.2" }]);
  });
});

describe("tidyInlines", () => {
  const text = (t: string): Inline => ({ t: "text", text: t });
  const ref = (label: string): Inline => ({ t: "noteref", target: `R${label}`, label });

  it("leaves brackets alone when they are not around note markers", () => {
    expect(tidyInlines([text("an array [1, 2] here")])).toEqual([text("an array [1, 2] here")]);
  });

  it("merges text and trims the edges", () => {
    expect(tidyInlines([text("  a "), text(" b  ")])).toEqual([text("a  b")]);
  });

  it("strips brackets and commas around a run of markers", () => {
    expect(tidyInlines([text("see ["), ref("1"), text(", "), ref("2"), text("]. Next")])).toEqual([
      text("see"),
      ref("1"),
      ref("2"),
      text(". Next"),
    ]);
  });
});
