import { parseChapter } from "../src/chapter.ts";
import type { BookContent } from "../src/load.ts";

// Made-up HTML in the same shape as O'Reilly EPUB chapters. No book text here.
export const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
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

export function parseFixture() {
  return parseChapter({
    html: chapterHtml,
    id: "ch02",
    number: 2,
    imageSize: () => ({ width: 600, height: 200 }),
  });
}

/** A one-chapter book built from the fixture, in the shape the loader reads. */
export function fixtureBook(hash = "fixture-v1"): BookContent {
  const { chapter, anchors } = parseFixture();
  return {
    book: {
      id: "test-book",
      title: "Widgets",
      authors: ["A. Author"],
      edition: 1,
      publisher: "Test",
      published: "2026-01",
      isbn: "0000000000",
      chapters: [
        {
          id: chapter.id,
          number: chapter.number,
          title: chapter.title,
          words: chapter.words,
          blockCount: chapter.blocks.length,
          figureCount: 1,
          outline: chapter.outline,
        },
      ],
      anchors: Object.fromEntries(
        [...anchors].map(([a, blockId]) => [a, { chapterId: chapter.id, blockId }]),
      ),
    },
    chapters: [chapter],
    glossary: [{ term: "widget", body: [] }],
    hash,
  };
}
