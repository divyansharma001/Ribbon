import { posix } from "node:path";
import {
  type Block,
  Book,
  Chapter,
  type ChapterSummary,
  GlossaryEntry,
  type Inline,
} from "@book-reader/book-schema";
import { load } from "cheerio";
import type { BookConfig } from "./books.ts";
import { type ParseChapterResult, parseChapter } from "./chapter.ts";
import { type Epub, pngSize } from "./epub.ts";

export interface IngestResult {
  book: Book;
  chapters: Chapter[];
  glossary: GlossaryEntry[];
  /** Output path (relative to the book folder) to image bytes. */
  images: Map<string, Uint8Array>;
  report: Report;
}

export interface Report {
  warnings: string[];
  errors: string[];
  /** Per chapter: what the source has vs what we produced. */
  counts: { chapterId: string; kind: string; source: number; output: number }[];
}

/** Turns a parsed EPUB into our book format and checks the result. */
export function ingest(epub: Epub, config: BookConfig): IngestResult {
  const report: Report = { warnings: [], errors: [], counts: [] };
  const images = new Map<string, Uint8Array>();
  const anchors: Book["anchors"] = {};
  const chapters: Chapter[] = [];
  let glossary: GlossaryEntry[] = [];

  for (const item of epub.spine) {
    const $ = load(item.html, { xml: true });
    const root = $("body > section").first();
    const type = root.attr("data-type");
    if (type !== "chapter" && type !== "preface" && type !== "glossary") continue;

    const number =
      type === "chapter"
        ? Number(/^Chapter (\d+)/.exec(root.attr("data-pdf-bookmark") ?? "")?.[1])
        : null;
    if (number !== null && !Number.isInteger(number)) {
      report.errors.push(`${item.path}: could not read the chapter number`);
      continue;
    }
    const id = number !== null ? `ch${String(number).padStart(2, "0")}` : type;
    const dir = posix.dirname(item.path);

    let result: ParseChapterResult;
    try {
      result = parseChapter({
        html: item.html,
        id,
        number,
        imageSize: (source) => {
          const data = epub.file(posix.join(dir, source));
          if (!data) throw new Error(`missing image ${source}`);
          return pngSize(data);
        },
      });
    } catch (error) {
      report.errors.push(`${id}: ${(error as Error).message}`);
      continue;
    }

    report.warnings.push(...result.warnings);
    for (const [anchor, blockId] of result.anchors) {
      if (anchors[anchor])
        report.errors.push(`${id}: anchor "${anchor}" is used twice in the book`);
      anchors[anchor] = { chapterId: id, blockId };
    }
    for (const image of result.images) {
      const data = epub.file(posix.join(dir, image.source));
      if (data) images.set(image.src, data);
      else report.errors.push(`${id}: missing image ${image.source}`);
    }

    if (type === "glossary") {
      glossary = toGlossary(result.chapter, report);
    } else {
      chapters.push(result.chapter);
      report.counts.push(...compareCounts(item.html, result.chapter));
    }
  }

  // Every link inside the book must land somewhere.
  const noteAnchors = new Set(chapters.flatMap((c) => c.notes.map((n) => n.anchor)));
  const checkLinks = (where: string, inlines: Inline[]) => {
    for (const node of walkInlines(inlines)) {
      if (node.t === "xref" && !anchors[node.target]) {
        report.errors.push(`${where}: link to unknown place "${node.target}"`);
      }
      if (node.t === "noteref" && !noteAnchors.has(node.target)) {
        report.errors.push(`${where}: marker for unknown note "${node.target}"`);
      }
    }
  };
  for (const chapter of chapters) {
    for (const placed of chapter.blocks) checkLinks(placed.block.id, blockInlines(placed.block));
    for (const note of chapter.notes) checkLinks(`${chapter.id} note ${note.label}`, note.content);
  }
  for (const entry of glossary)
    checkLinks(`glossary "${entry.term}"`, entry.body.flatMap(blockInlines));

  // Brackets around note markers should be gone.
  for (const chapter of chapters) {
    for (const placed of chapter.blocks) {
      const leftover = countLeftoverBrackets(blockInlines(placed.block));
      if (leftover)
        report.warnings.push(`${placed.block.id}: ${leftover} note marker(s) still in brackets`);
    }
  }

  for (const count of report.counts) {
    if (count.source !== count.output) {
      report.errors.push(
        `${count.chapterId}: ${count.kind} count differs (source ${count.source}, output ${count.output})`,
      );
    }
  }

  const summaries: ChapterSummary[] = chapters.map((c) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    words: c.words,
    blockCount: c.blocks.length,
    figureCount: c.blocks.flatMap((b) => allBlocks(b.block)).filter((b) => b.type === "figure")
      .length,
    outline: c.outline,
  }));

  const book: Book = {
    id: config.id,
    title: epub.meta.title,
    authors: epub.meta.creators.flatMap((c) => c.split(/,\s*|\s+and\s+/)).filter(Boolean),
    edition: config.edition,
    publisher: epub.meta.publisher,
    published: config.published,
    isbn: config.isbn,
    chapters: summaries,
    anchors,
  };

  // Schema check, so the app can trust the files.
  const checks: [string, { success: boolean; error?: unknown }][] = [
    ["book", Book.safeParse(book)],
    ...chapters.map(
      (c) => [c.id, Chapter.safeParse(c)] as [string, { success: boolean; error?: unknown }],
    ),
    ["glossary", GlossaryEntry.array().safeParse(glossary)],
  ];
  for (const [name, check] of checks) {
    if (!check.success) report.errors.push(`${name}: schema check failed: ${String(check.error)}`);
  }

  return { book, chapters, glossary, images, report };
}

function toGlossary(chapter: Chapter, report: Report): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  for (const placed of chapter.blocks) {
    const block = placed.block;
    if (block.type !== "definitions") continue;
    for (const item of block.items) {
      const term = walkInlines(item.term)
        .map((n) => ("text" in n ? n.text : ""))
        .join("")
        .trim();
      entries.push({ term, body: item.body });
    }
  }
  if (entries.length === 0) report.errors.push("glossary: no entries found");
  return entries;
}

/** Counts elements in the source HTML and in our output, so nothing is silently lost. */
function compareCounts(html: string, chapter: Chapter) {
  const $ = load(html, { xml: true });
  const out = chapter.blocks.flatMap((b) => allBlocks(b.block));
  const ofType = (type: Block["type"]) => out.filter((b) => b.type === type).length;
  const pairs: [string, number, number][] = [
    ["figure", $("figure").length, ofType("figure")],
    ["code", $("pre").length, ofType("code")],
    ["table", $("table").length, ofType("table")],
    ["example", $("div[data-type='example']").length, ofType("example")],
    ["sidebar", $("aside[data-type='sidebar']").length, ofType("sidebar")],
    [
      "note box",
      $("div[data-type='note'], div[data-type='warning'], div[data-type='tip']").length,
      ofType("note"),
    ],
    ["section", $("section[data-type^='sect']").length, ofType("heading") - 1],
    ["footnote/reference", $("p[data-type='footnote']").length, chapter.notes.length],
    [
      "paragraph",
      $("p").not("[data-type='footnote'], [data-type='attribution'], td p, th p").length +
        // List items and definitions with bare inline content become one paragraph each.
        $("li, dd").filter((_, el) =>
          el.children.some((c) =>
            c.type === "text"
              ? c.data.trim() !== ""
              : c.type === "tag" &&
                ["a", "em", "strong", "code", "span"].includes(c.name) &&
                c.attribs["data-type"] !== "indexterm",
          ),
        ).length,
      ofType("paragraph"),
    ],
  ];
  return pairs.map(([kind, source, output]) => ({ chapterId: chapter.id, kind, source, output }));
}

/** A block and every block nested inside it. */
export function allBlocks(block: Block): Block[] {
  const nested: Block[] = [];
  switch (block.type) {
    case "list":
      for (const item of block.items) nested.push(...item);
      break;
    case "definitions":
    case "callouts":
      for (const item of block.items) nested.push(...item.body);
      break;
    case "example":
    case "note":
    case "sidebar":
    case "quote":
      nested.push(...block.body);
      break;
  }
  return [block, ...nested.flatMap(allBlocks)];
}

/** All inline content directly in a block and its nested blocks. */
function blockInlines(block: Block): Inline[] {
  return allBlocks(block).flatMap((b): Inline[] => {
    switch (b.type) {
      case "heading":
        return b.title;
      case "paragraph":
        return b.content;
      case "definitions":
        return b.items.flatMap((i) => i.term);
      case "figure":
      case "example":
        return b.caption;
      case "table":
        return [...b.caption, ...[...b.head, ...b.body].flat(2)];
      case "sidebar":
        return b.title;
      case "quote":
        return b.attribution ?? [];
      default:
        return [];
    }
  });
}

function walkInlines(nodes: Inline[]): Inline[] {
  return nodes.flatMap((n) => ("children" in n ? [n, ...walkInlines(n.children)] : [n]));
}

function countLeftoverBrackets(nodes: Inline[]): number {
  let count = 0;
  const visit = (list: Inline[]) => {
    list.forEach((n, i) => {
      const prev = list[i - 1];
      if (n.t === "noteref" && prev?.t === "text" && /\[\s*$/.test(prev.text)) count++;
      if ("children" in n) visit(n.children);
    });
  };
  visit(nodes);
  return count;
}
