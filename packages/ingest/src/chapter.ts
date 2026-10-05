import { createHash } from "node:crypto";
import {
  type Block,
  blockText,
  type Chapter,
  countWords,
  type IndexTerm,
  type Inline,
  inlineText,
  type Note,
  type OutlineNode,
  type PlacedBlock,
} from "@ribbon/book-schema";
import { load } from "cheerio";
import { type AnyNode, type Element, isTag, isText } from "domhandler";

/** A figure image used by the chapter, to be copied to the output. */
export interface ImageRef {
  /** Path of the image inside the EPUB, relative to the chapter file. */
  source: string;
  /** Path written into the block, relative to the book output folder. */
  src: string;
}

export interface ParseChapterInput {
  html: string;
  id: string;
  number: number | null;
  /** Looks up an image's size by its path relative to the chapter file. */
  imageSize(source: string): { width: number; height: number };
}

export interface ParseChapterResult {
  chapter: Chapter;
  /** Every element id in the chapter, mapped to the top-level block that holds it. */
  anchors: Map<string, string>;
  images: ImageRef[];
  /** Things the parser did not understand. Should be empty. */
  warnings: string[];
}

const SECTION_TYPES: Record<string, 2 | 3 | 4> = { sect1: 2, sect2: 3, sect3: 4 };

/** Element ids that are not worth tracking as anchors. */
function isNoiseId(id: string): boolean {
  return /^id\d+$/.test(id);
}

export function parseChapter(input: ParseChapterInput): ParseChapterResult {
  const $ = load(input.html, { xml: true });
  const warnings: string[] = [];
  const images: ImageRef[] = [];
  const blocks: PlacedBlock[] = [];
  const notes: Note[] = [];
  const indexTerms: IndexTerm[] = [];
  const anchors = new Map<string, string>();
  const outline: OutlineNode[] = [];
  const outlineStack: OutlineNode[] = [];

  /** Index terms seen since the last top-level block. They belong to the next one. */
  let pendingTerms: Omit<IndexTerm, "blockId">[] = [];
  /** Per-section block counter, so ids look like "sec_x.1", "sec_x.2", ... */
  const sectionCounters = new Map<string, number>();

  const where = (el: Element) => {
    const id = el.attribs.id ?? $(el).closest("[id]").attr("id");
    return `${input.id}${id ? `#${id}` : ""} <${el.name}>`;
  };
  const warn = (el: Element, message: string) => warnings.push(`${where(el)}: ${message}`);

  // -------------------------------------------------------------------------
  // Inline content
  // -------------------------------------------------------------------------

  const hrefTarget = (href: string) => {
    const hash = href.indexOf("#");
    return hash === -1 ? "" : href.slice(hash + 1);
  };

  function parseInlines(nodes: readonly AnyNode[]): Inline[] {
    const out: Inline[] = [];
    for (const node of nodes) {
      if (isText(node)) {
        out.push({ t: "text", text: node.data.replace(/\s+/g, " ") });
        continue;
      }
      if (!isTag(node)) continue;
      const kind = node.attribs["data-type"];
      switch (node.name) {
        case "em":
        case "i":
          out.push({ t: "em", children: parseInlines(node.children) });
          break;
        case "strong":
        case "b":
          out.push({ t: "strong", children: parseInlines(node.children) });
          break;
        case "sub":
        case "sup":
          out.push({ t: node.name as "sub" | "sup", children: parseInlines(node.children) });
          break;
        case "code":
          out.push({ t: "code", text: $(node).text().replace(/\s+/g, " ") });
          break;
        case "br":
          out.push({ t: "br" });
          break;
        case "span":
          out.push(...parseInlines(node.children));
          break;
        case "a": {
          const href = node.attribs.href ?? "";
          if (kind === "indexterm") {
            const primary = node.attribs["data-primary"];
            const secondary = node.attribs["data-secondary"];
            if (primary) pendingTerms.push(secondary ? { primary, secondary } : { primary });
          } else if (kind === "noteref") {
            out.push({ t: "noteref", target: hrefTarget(href), label: $(node).text().trim() });
          } else if (kind === "xref" || /^(ch\d+|preface\d*|glossary\d*)\.html#|^#/.test(href)) {
            out.push({
              t: "xref",
              target: hrefTarget(href),
              children: parseInlines(node.children),
            });
          } else if (/^(https?|mailto):/.test(href)) {
            out.push({ t: "link", href, children: parseInlines(node.children) });
          } else {
            warn(node, `link with unknown target "${href}"`);
            out.push(...parseInlines(node.children));
          }
          break;
        }
        default:
          warn(node, "unknown inline element");
          out.push(...parseInlines(node.children));
      }
    }
    return tidyInlines(out);
  }

  // -------------------------------------------------------------------------
  // Blocks
  // -------------------------------------------------------------------------

  const tagChildren = (el: Element) => el.children.filter(isTag);
  const hasText = (node: AnyNode) => isText(node) && node.data.trim() !== "";

  /** Splits a caption like "<span class=label>Figure 6-1. </span>Text" into label and text. */
  function parseCaption(el: Element | undefined): { label?: string; caption: Inline[] } {
    if (!el) return { caption: [] };
    const labelEl = tagChildren(el).find((c) => c.name === "span" && c.attribs.class === "label");
    const rest = el.children.filter((c) => c !== labelEl);
    const caption = parseInlines(rest);
    const label = labelEl ? $(labelEl).text().trim() : undefined;
    return label ? { label, caption } : { caption };
  }

  /** Parses the children of a container into blocks. Ids are filled in later. */
  function parseBlocks(nodes: readonly AnyNode[]): Block[] {
    const out: Block[] = [];
    const loose: AnyNode[] = [];
    const flushLoose = () => {
      const content = parseInlines(loose);
      if (inlineText(content).trim()) out.push({ id: "", type: "paragraph", content });
      loose.length = 0;
    };
    for (const node of nodes) {
      if (isTag(node) && isBlockElement(node)) {
        flushLoose();
        const block = parseBlock(node);
        if (block) out.push(block);
      } else if (isTag(node) || hasText(node)) {
        // Inline content directly inside a container (e.g. <li>text</li>).
        loose.push(node);
      }
    }
    flushLoose();
    return out;
  }

  function isBlockElement(el: Element): boolean {
    if (el.name === "a" && el.attribs["data-type"] === "indexterm") return false;
    return !INLINE_TAGS.has(el.name);
  }

  function parseBlock(el: Element): Block | undefined {
    const kind = el.attribs["data-type"];
    switch (el.name) {
      case "p":
        return { id: "", type: "paragraph", content: parseInlines(el.children) };
      case "ul":
      case "ol":
        return {
          id: "",
          type: "list",
          ordered: el.name === "ol",
          items: tagChildren(el)
            .filter((li) => li.name === "li")
            .map((li) => parseBlocks(li.children)),
        };
      case "dl":
        return el.attribs.class === "calloutlist" ? parseCalloutList(el) : parseDefinitions(el);
      case "pre":
        return parseCode(el);
      case "figure":
        return parseFigure(el);
      case "table":
        return parseTable(el);
      case "blockquote": {
        const attribution = tagChildren(el).find((c) => c.attribs["data-type"] === "attribution");
        const body = parseBlocks(el.children.filter((c) => c !== attribution));
        return {
          id: "",
          type: "quote",
          kind: kind === "epigraph" ? "epigraph" : "blockquote",
          body,
          ...(attribution ? { attribution: parseInlines(attribution.children) } : {}),
        };
      }
      case "aside":
        if (kind === "sidebar") return parseSidebar(el);
        break;
      case "div":
        if (kind === "note" || kind === "warning" || kind === "tip") {
          const body = el.children.filter((c) => !(isTag(c) && /^h\d$/.test(c.name)));
          return { id: "", type: "note", kind, body: parseBlocks(body) };
        }
        if (kind === "example") {
          const heading = tagChildren(el).find((c) => /^h\d$/.test(c.name));
          return {
            id: "",
            type: "example",
            ...anchorOf(el),
            ...parseCaption(heading),
            body: parseBlocks(el.children.filter((c) => c !== heading)),
          };
        }
        break;
    }
    warn(el, "unknown block element, skipped");
    return undefined;
  }

  const anchorOf = (el: Element | undefined) => {
    const anchor = el?.attribs.id;
    return anchor ? { anchor } : {};
  };

  function parseDefinitions(el: Element): Block {
    const items: { term: Inline[]; body: Block[] }[] = [];
    for (const child of tagChildren(el)) {
      if (child.name === "dt") items.push({ term: parseInlines(child.children), body: [] });
      else if (child.name === "dd") {
        const last = items.at(-1);
        if (last) last.body.push(...parseBlocks(child.children));
        else warn(child, "<dd> without <dt>");
      }
    }
    return { id: "", type: "definitions", items };
  }

  function parseCalloutList(el: Element): Block {
    const items: { number: number; body: Block[] }[] = [];
    for (const child of tagChildren(el)) {
      if (child.name === "dt") {
        items.push({ number: Number($(child).find("img").attr("alt")), body: [] });
      } else if (child.name === "dd") {
        const last = items.at(-1);
        if (last) last.body.push(...parseBlocks(child.children));
      }
    }
    for (const item of items) {
      if (!Number.isInteger(item.number) || item.number < 1) warn(el, "callout without a number");
    }
    return { id: "", type: "callouts", items };
  }

  function parseCode(el: Element): Block {
    let code = "";
    const callouts: { number: number; line: number }[] = [];
    const walk = (nodes: readonly AnyNode[]) => {
      for (const node of nodes) {
        if (isText(node)) code += node.data;
        else if (isTag(node)) {
          if (node.name === "a" && node.attribs.class === "co") {
            const number = Number($(node).find("img").attr("alt"));
            callouts.push({ number, line: code.split("\n").length - 1 });
          } else if (node.name === "a" && node.attribs["data-type"] === "indexterm") {
            // Index markers have no text.
          } else walk(node.children);
        }
      }
    };
    walk(el.children);
    // Drop trailing spaces (left where callout markers were) and blank edge lines.
    const lines = code.split("\n").map((l) => l.replace(/\s+$/, ""));
    let start = 0;
    while (start < lines.length && lines[start] === "") start++;
    while (lines.length > start && lines.at(-1) === "") lines.pop();
    const language = el.attribs["data-code-language"];
    return {
      id: "",
      type: "code",
      ...(language ? { language } : {}),
      code: lines.slice(start).join("\n"),
      ...(callouts.length
        ? { callouts: callouts.map((c) => ({ ...c, line: c.line - start })) }
        : {}),
    };
  }

  function parseFigure(el: Element): Block | undefined {
    const inner = tagChildren(el).find((c) => c.name === "div") ?? el;
    const img = $(inner).find("img").first().get(0);
    const source = img?.attribs.src;
    if (!img || !source) {
      warn(el, "figure without an image, skipped");
      return undefined;
    }
    const src = `figures/${source.split("/").at(-1)}`;
    images.push({ source, src });
    const heading = tagChildren(inner).find((c) => /^h\d$/.test(c.name));
    return {
      id: "",
      type: "figure",
      ...anchorOf(inner),
      ...parseCaption(heading),
      image: { src, alt: img.attribs.alt ?? "", ...input.imageSize(source) },
    };
  }

  function parseTable(el: Element): Block {
    const caption = tagChildren(el).find((c) => c.name === "caption");
    const head: Inline[][][] = [];
    const body: Inline[][][] = [];
    $(el)
      .find("tr")
      .each((_, tr) => {
        const cells = tagChildren(tr).filter((c) => c.name === "td" || c.name === "th");
        const row = cells.map((cell) => {
          const parts = parseBlocks(cell.children).map((b) =>
            b.type === "paragraph" ? b.content : [{ t: "text", text: blockText(b) } as Inline],
          );
          return parts.flatMap((p, i) => (i === 0 ? p : [{ t: "br" } as Inline, ...p]));
        });
        const inHead = $(tr).parent().is("thead") || cells.every((c) => c.name === "th");
        (inHead ? head : body).push(row);
      });
    return { id: "", type: "table", ...anchorOf(el), ...parseCaption(caption), head, body };
  }

  function parseSidebar(el: Element): Block {
    const inner = tagChildren(el).find((c) => c.name === "div") ?? el;
    const heading = tagChildren(inner).find((c) => /^h\d$/.test(c.name));
    return {
      id: "",
      type: "sidebar",
      ...anchorOf(inner),
      title: heading ? parseInlines(heading.children) : [],
      body: parseBlocks(inner.children.filter((c) => c !== heading)),
    };
  }

  // -------------------------------------------------------------------------
  // Sections, notes, and placement
  // -------------------------------------------------------------------------

  function place(block: Block, sectionAnchor: string, source: Element | undefined) {
    const n = sectionCounters.get(sectionAnchor) ?? 0;
    sectionCounters.set(sectionAnchor, n + 1);
    assignIds(block, `${sectionAnchor}.${n}`);
    const text = blockText(block);
    blocks.push({
      sectionAnchor,
      hash: createHash("sha1").update(text).digest("hex").slice(0, 8),
      words: countWords(text),
      block,
    });
    for (const term of pendingTerms) indexTerms.push({ ...term, blockId: block.id });
    pendingTerms = [];
    if (source) {
      if (source.attribs.id && !isNoiseId(source.attribs.id))
        anchors.set(source.attribs.id, block.id);
      $(source)
        .find("[id]")
        .each((_, d) => {
          const id = d.attribs.id;
          if (id && !isNoiseId(id) && d.attribs["data-type"] !== "indexterm")
            anchors.set(id, block.id);
        });
    }
  }

  function parseNotes(el: Element) {
    const title = $(el).children("h5").first().text().trim().toLowerCase();
    const kind = title === "references" ? "reference" : "footnote";
    for (const p of tagChildren(el)) {
      if (p.attribs["data-type"] !== "footnote") continue;
      const anchor = p.attribs.id;
      if (!anchor) {
        warn(p, "note without an id");
        continue;
      }
      // Notes start with "[<a href=...-marker>12</a>]". Pull the label out of the text.
      const backlink = tagChildren(p).find(
        (c) => c.name === "a" && c.attribs.href?.endsWith("-marker"),
      );
      const label = backlink ? $(backlink).text().trim() : "";
      const rest = p.children.filter((c) => c !== backlink);
      const content = parseInlines(rest);
      stripLeadingBrackets(content);
      notes.push({ anchor, label, kind, content });
    }
    pendingTerms = [];
  }

  /** Walks a chapter or section container. */
  function walkSection(container: Element, sectionAnchor: string) {
    for (const node of container.children) {
      if (!isTag(node)) {
        if (hasText(node)) warnings.push(`${input.id}#${sectionAnchor}: loose text in section`);
        continue;
      }
      const kind = node.attribs["data-type"] ?? "";
      if (node.name === "section" && kind in SECTION_TYPES) {
        walkSubsection(node, SECTION_TYPES[kind] as 2 | 3 | 4);
      } else if (node.name === "div" && kind === "footnotes") {
        parseNotes(node);
      } else if (/^h\d$/.test(node.name)) {
        // Headings are handled by walkSubsection / the chapter title code.
      } else if (node.name === "a" && kind === "indexterm") {
        parseInlines([node]);
      } else {
        const block = parseBlock(node);
        if (block) place(block, sectionAnchor, node);
      }
    }
  }

  function walkSubsection(section: Element, level: 2 | 3 | 4) {
    const inner = tagChildren(section).find((c) => c.name === "div") ?? section;
    const anchor = inner.attribs.id;
    const heading = tagChildren(inner).find((c) => /^h\d$/.test(c.name));
    if (!anchor || !heading) {
      warn(section, "section without an id or heading, skipped");
      return;
    }
    const title = parseInlines(heading.children);
    const block: Block = { id: "", type: "heading", level, anchor, title };
    place(block, anchor, heading);
    anchors.set(anchor, block.id);

    const node: OutlineNode = {
      anchor,
      blockId: block.id,
      level,
      title: inlineText(title),
      children: [],
    };
    while ((outlineStack.at(-1)?.level ?? 0) >= level) outlineStack.pop();
    (outlineStack.at(-1)?.children ?? outline).push(node);
    outlineStack.push(node);

    walkSection(inner, anchor);
  }

  // -------------------------------------------------------------------------
  // Chapter root
  // -------------------------------------------------------------------------

  const root = $(
    "section[data-type='chapter'], section[data-type='preface'], section[data-type='glossary']",
  )
    .first()
    .get(0);
  if (!root) throw new Error(`${input.id}: no chapter, preface, or glossary section found`);
  const inner = tagChildren(root).find((c) => c.name === "div") ?? root;
  const chapterAnchor = inner.attribs.id ?? input.id;
  const h1 = tagChildren(inner).find((c) => c.name === "h1");
  const { label, caption: title } = parseCaption(h1);
  const heading: Block = {
    id: "",
    type: "heading",
    level: 1,
    anchor: chapterAnchor,
    ...(label ? { label } : {}),
    title,
  };
  place(heading, chapterAnchor, h1);
  anchors.set(chapterAnchor, heading.id);
  walkSection(inner, chapterAnchor);

  // Index terms after the last block belong to it.
  const last = blocks.at(-1);
  if (last) for (const term of pendingTerms) indexTerms.push({ ...term, blockId: last.block.id });

  // Notes point back to the block holding their marker.
  for (const note of notes) {
    const blockId = anchors.get(`${note.anchor}-marker`);
    if (blockId) anchors.set(note.anchor, blockId);
  }

  return {
    chapter: {
      id: input.id,
      number: input.number,
      title: inlineText(title),
      anchor: chapterAnchor,
      words: blocks.reduce((sum, b) => sum + b.words, 0),
      outline,
      blocks,
      notes,
      indexTerms,
    },
    anchors,
    images,
    warnings,
  };
}

const INLINE_TAGS = new Set(["a", "em", "i", "strong", "b", "code", "span", "sub", "sup", "br"]);

/** Gives nested blocks ids based on their parent, e.g. "sec_x.3.0.1". */
export function assignIds(block: Block, id: string): void {
  block.id = id;
  const children = (list: Block[], prefix: string) =>
    list.forEach((child, i) => {
      assignIds(child, `${prefix}.${i}`);
    });
  switch (block.type) {
    case "list":
      block.items.forEach((item, i) => {
        children(item, `${id}.${i}`);
      });
      break;
    case "definitions":
    case "callouts":
      block.items.forEach((item, i) => {
        children(item.body, `${id}.${i}`);
      });
      break;
    case "example":
    case "note":
    case "sidebar":
    case "quote":
      children(block.body, id);
      break;
  }
}

/**
 * Cleans up inline content:
 * - merges neighbouring text,
 * - drops the "[" "," "]" around note markers, since the reader draws its own,
 * - trims space at the start and end.
 */
export function tidyInlines(nodes: Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const node of nodes) {
    const prev = merged.at(-1);
    if (node.t === "text" && prev?.t === "text") prev.text += node.text;
    else if (node.t !== "text" || node.text !== "") merged.push(node);
  }

  for (let i = 0; i < merged.length; i++) {
    if (merged[i]?.t !== "noteref") continue;
    // Find the run of markers: ref (", " ref)*
    let end = i;
    while (merged[end + 1]?.t === "text" && merged[end + 2]?.t === "noteref") {
      const sep = merged[end + 1] as { text: string };
      if (!/^\s*,\s*$/.test(sep.text)) break;
      end += 2;
    }
    const before = merged[i - 1];
    const after = merged[end + 1];
    const opens = before?.t === "text" && /\[\s*$/.test(before.text);
    const close = after?.t === "text" ? /^(,[^\]]*)?\]/.exec(after.text) : null;
    const last = merged[end];
    if (opens && close && after?.t === "text" && before?.t === "text" && last?.t === "noteref") {
      before.text = before.text.replace(/\s*\[\s*$/, "");
      after.text = after.text.slice(close[0].length);
      // "[18, Table 3]": keep ", Table 3" with the marker.
      const suffix = close[1]?.trim();
      if (suffix && end === i) last.suffix = suffix;
      else if (suffix) continue;
      for (let j = i + 1; j < end; j += 2) (merged[j] as { text: string }).text = "";
    }
    i = end;
  }

  const out = merged.filter((n) => n.t !== "text" || n.text !== "");
  trimEdge(out, "start");
  trimEdge(out, "end");
  return out.filter((n) => n.t !== "text" || n.text !== "");
}

function trimEdge(nodes: Inline[], edge: "start" | "end"): void {
  const node = edge === "start" ? nodes[0] : nodes.at(-1);
  if (!node) return;
  if (node.t === "text") {
    node.text = edge === "start" ? node.text.trimStart() : node.text.trimEnd();
  } else if ("children" in node) {
    trimEdge(node.children, edge);
  }
}

/** Removes the "[" and "] " left at the start of a note after its label is pulled out. */
function stripLeadingBrackets(content: Inline[]): void {
  const first = content[0];
  if (first?.t === "text") {
    first.text = first.text.replace(/^\s*\[\s*\]?\s*/, "").replace(/^\]\s*/, "");
    if (first.text === "") content.shift();
  }
}
