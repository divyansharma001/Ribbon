import { blockText, Chapter, type Inline } from "@book-reader/book-schema";
import { describe, expect, it } from "vitest";
import { parseChapter, tidyInlines } from "../src/chapter.ts";

// Made-up HTML in the same shape as O'Reilly EPUB chapters. No book text here.
const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><body data-type="book">
<section data-type="chapter" data-pdf-bookmark="Chapter 2. Widgets"><div class="chapter" id="ch_widgets">
<h1><span class="label">Chapter 2. </span>Widgets</h1>
<blockquote data-type="epigraph"><p><em>A short quote.</em></p><p data-type="attribution">Someone (2000)</p></blockquote>
<p><a data-type="indexterm" data-primary="widgets" id="id100"/>
<em>Widgets</em> are   small
things, see <a data-type="xref" href="ch02.html#sec_widgets_kinds">“Kinds”</a> [<a data-type="noteref" href="ch02.html#Ref1">1</a>, <a data-type="noteref" href="ch02.html#Ref2">2</a>].</p>
<section data-type="sect1"><div class="sect1" id="sec_widgets_kinds">
<h1>Kinds of Widgets</h1>
<p>Big ones exist [<a data-type="noteref" href="ch02.html#Ref1">1</a>, Table 3].</p>
<figure><div id="fig_widget" class="figure">
<img src="assets/w1.png" alt="A widget"/>
<h6><span class="label">Figure 2-1. </span>A widget.</h6>
</div></figure>
<section data-type="sect2"><div class="sect2" id="sec_widgets_small">
<h2>Small Widgets</h2>
<ul><li><p>One</p></li><li>Two</li></ul>
<pre data-type="programlisting" data-code-language="sql"><code class="k">SELECT</code> 1 <a class="co" id="co_1" href="#c_1"><img src="assets/1.png" alt="1"/></a>
<code>FROM</code> t;</pre>
<dl class="calloutlist"><dt><a class="co" id="c_1" href="#co_1"><img src="assets/1.png" alt="1"/></a></dt><dd><p>Picks one.</p></dd></dl>
<table id="tab_w"><caption><span class="label">Table 2-1. </span>Sizes</caption>
<thead><tr><th>Name</th><th>Size</th></tr></thead>
<tbody><tr><td><p>A</p></td><td><p>1</p><p>2</p></td></tr></tbody></table>
<div data-type="note"><h6>Note</h6><p>Careful.</p></div>
</div></section>
</div></section>
<section data-type="sect1"><div class="sect1" id="sec_widgets_summary">
<h1>Summary</h1>
<aside data-type="sidebar"><div class="sidebar" id="sidebar_w"><h1>Aside</h1><p>Extra.</p></div></aside>
</div></section>
<div data-type="footnotes"><h5>References</h5>
<p data-type="footnote" id="Ref1">[<a href="ch02.html#Ref1-marker">1</a>] A. Author. <a href="https://example.com">“A Paper.”</a> 2020.</p>
<p data-type="footnote" id="Ref2">[<a href="ch02.html#Ref2-marker">2</a>] B. Author. 2021.</p>
</div>
</div></section></body></html>`;

function parse() {
  return parseChapter({
    html,
    id: "ch02",
    number: 2,
    imageSize: () => ({ width: 600, height: 200 }),
  });
}

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
