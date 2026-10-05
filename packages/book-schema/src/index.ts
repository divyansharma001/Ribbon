import { z } from "zod";

/*
 * The book format shared by the ingest tool and the web app.
 *
 * A book is split into chapters. Each chapter is a flat list of blocks
 * (headings, paragraphs, figures, ...). Every block has a stable `id` so
 * reading position, notes, and highlights can point at it.
 */

// ---------------------------------------------------------------------------
// Inline content (text inside a paragraph, caption, list item, ...)
// ---------------------------------------------------------------------------

export type Inline =
  | { t: "text"; text: string }
  | { t: "em" | "strong" | "sub" | "sup"; children: Inline[] }
  | { t: "code"; text: string }
  | { t: "link"; href: string; children: Inline[] }
  /** Link to another place in the book, by the book's element id. */
  | { t: "xref"; target: string; children: Inline[] }
  /**
   * Marker pointing to a footnote or reference, shown like "[23]".
   * `suffix` holds extra text inside the brackets, e.g. ", Table 3" in "[18, Table 3]".
   */
  | { t: "noteref"; target: string; label: string; suffix?: string }
  | { t: "br" };

export const Inline: z.ZodType<Inline> = z.lazy(() =>
  z.discriminatedUnion("t", [
    z.object({ t: z.literal("text"), text: z.string() }),
    z.object({
      t: z.enum(["em", "strong", "sub", "sup"]),
      children: z.array(Inline),
    }),
    z.object({ t: z.literal("code"), text: z.string() }),
    z.object({ t: z.literal("link"), href: z.string(), children: z.array(Inline) }),
    z.object({ t: z.literal("xref"), target: z.string(), children: z.array(Inline) }),
    z.object({
      t: z.literal("noteref"),
      target: z.string(),
      label: z.string(),
      suffix: z.string().exactOptional(),
    }),
    z.object({ t: z.literal("br") }),
  ]),
);

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

interface BlockBase {
  /** Stable id, e.g. "sec_replication_sync_async.3". */
  id: string;
}

export interface HeadingBlock extends BlockBase {
  type: "heading";
  /** 1 = chapter title, 2-4 = section depth. */
  level: 1 | 2 | 3 | 4;
  /** The book's own element id for this section, used by xrefs. */
  anchor: string;
  /** E.g. "Chapter 6." for chapter titles. */
  label?: string;
  title: Inline[];
}

export interface ParagraphBlock extends BlockBase {
  type: "paragraph";
  content: Inline[];
}

export interface ListBlock extends BlockBase {
  type: "list";
  ordered: boolean;
  items: Block[][];
}

export interface DefinitionsBlock extends BlockBase {
  type: "definitions";
  items: { term: Inline[]; body: Block[] }[];
}

export interface CodeBlock extends BlockBase {
  type: "code";
  language?: string;
  code: string;
  /** Numbered markers inside the code, explained by a following "callouts" block. */
  callouts?: { number: number; line: number }[];
}

export interface CalloutsBlock extends BlockBase {
  type: "callouts";
  items: { number: number; body: Block[] }[];
}

export interface FigureBlock extends BlockBase {
  type: "figure";
  anchor?: string;
  /** E.g. "Figure 6-1." */
  label?: string;
  caption: Inline[];
  image: { src: string; alt: string; width: number; height: number };
}

export interface TableBlock extends BlockBase {
  type: "table";
  anchor?: string;
  label?: string;
  caption: Inline[];
  head: Inline[][][];
  body: Inline[][][];
}

export interface ExampleBlock extends BlockBase {
  type: "example";
  anchor?: string;
  label?: string;
  caption: Inline[];
  body: Block[];
}

export interface CalloutBoxBlock extends BlockBase {
  type: "note";
  kind: "note" | "warning" | "tip";
  body: Block[];
}

export interface SidebarBlock extends BlockBase {
  type: "sidebar";
  anchor?: string;
  title: Inline[];
  body: Block[];
}

export interface QuoteBlock extends BlockBase {
  type: "quote";
  kind: "epigraph" | "blockquote";
  body: Block[];
  attribution?: Inline[];
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | DefinitionsBlock
  | CodeBlock
  | CalloutsBlock
  | FigureBlock
  | TableBlock
  | ExampleBlock
  | CalloutBoxBlock
  | SidebarBlock
  | QuoteBlock;

export type BlockType = Block["type"];

const id = z.string().min(1);
const inlines = z.array(Inline);
const cells = z.array(z.array(inlines));

export const Block: z.ZodType<Block> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      id,
      type: z.literal("heading"),
      level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
      anchor: id,
      label: z.string().exactOptional(),
      title: inlines,
    }),
    z.object({ id, type: z.literal("paragraph"), content: inlines }),
    z.object({
      id,
      type: z.literal("list"),
      ordered: z.boolean(),
      items: z.array(z.array(Block)),
    }),
    z.object({
      id,
      type: z.literal("definitions"),
      items: z.array(z.object({ term: inlines, body: z.array(Block) })),
    }),
    z.object({
      id,
      type: z.literal("code"),
      language: z.string().exactOptional(),
      code: z.string(),
      callouts: z
        .array(z.object({ number: z.int().positive(), line: z.int().nonnegative() }))
        .exactOptional(),
    }),
    z.object({
      id,
      type: z.literal("callouts"),
      items: z.array(z.object({ number: z.int().positive(), body: z.array(Block) })),
    }),
    z.object({
      id,
      type: z.literal("figure"),
      anchor: z.string().exactOptional(),
      label: z.string().exactOptional(),
      caption: inlines,
      image: z.object({
        src: z.string(),
        alt: z.string(),
        width: z.int().positive(),
        height: z.int().positive(),
      }),
    }),
    z.object({
      id,
      type: z.literal("table"),
      anchor: z.string().exactOptional(),
      label: z.string().exactOptional(),
      caption: inlines,
      head: cells,
      body: cells,
    }),
    z.object({
      id,
      type: z.literal("example"),
      anchor: z.string().exactOptional(),
      label: z.string().exactOptional(),
      caption: inlines,
      body: z.array(Block),
    }),
    z.object({
      id,
      type: z.literal("note"),
      kind: z.enum(["note", "warning", "tip"]),
      body: z.array(Block),
    }),
    z.object({
      id,
      type: z.literal("sidebar"),
      anchor: z.string().exactOptional(),
      title: inlines,
      body: z.array(Block),
    }),
    z.object({
      id,
      type: z.literal("quote"),
      kind: z.enum(["epigraph", "blockquote"]),
      body: z.array(Block),
      attribution: inlines.exactOptional(),
    }),
  ]),
);

// ---------------------------------------------------------------------------
// Chapter
// ---------------------------------------------------------------------------

export interface OutlineNode {
  /** The section's element id (same as its heading block's anchor). */
  anchor: string;
  /** Id of the section's heading block. */
  blockId: string;
  level: 2 | 3 | 4;
  title: string;
  children: OutlineNode[];
}

export const OutlineNode: z.ZodType<OutlineNode> = z.lazy(() =>
  z.object({
    anchor: id,
    blockId: id,
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    title: z.string(),
    children: z.array(OutlineNode),
  }),
);

/** A top-level block plus where it sits in the chapter. */
export const PlacedBlock = z.object({
  /** Anchor of the innermost section that holds this block. */
  sectionAnchor: id,
  /** Short hash of the block's text. Lets the app find a saved position again if ids change. */
  hash: z.string().length(8),
  /** Word count, used for reading time and progress. */
  words: z.int().nonnegative(),
  block: Block,
});
export type PlacedBlock = z.infer<typeof PlacedBlock>;

export const Note = z.object({
  /** The note's element id, which `noteref.target` points to. */
  anchor: id,
  label: z.string(),
  kind: z.enum(["footnote", "reference"]),
  content: inlines,
});
export type Note = z.infer<typeof Note>;

export const IndexTerm = z.object({
  primary: z.string(),
  secondary: z.string().exactOptional(),
  /** Top-level block where the term appears. */
  blockId: id,
});
export type IndexTerm = z.infer<typeof IndexTerm>;

export const Chapter = z.object({
  /** E.g. "ch06" or "preface". */
  id,
  /** Null for front matter such as the preface. */
  number: z.int().positive().nullable(),
  title: z.string(),
  anchor: id,
  words: z.int().nonnegative(),
  outline: z.array(OutlineNode),
  blocks: z.array(PlacedBlock),
  notes: z.array(Note),
  indexTerms: z.array(IndexTerm),
});
export type Chapter = z.infer<typeof Chapter>;

// ---------------------------------------------------------------------------
// Glossary and book
// ---------------------------------------------------------------------------

export const GlossaryEntry = z.object({
  term: z.string(),
  body: z.array(Block),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;

export const ChapterSummary = z.object({
  id,
  number: z.int().positive().nullable(),
  title: z.string(),
  words: z.int().nonnegative(),
  blockCount: z.int().nonnegative(),
  figureCount: z.int().nonnegative(),
  outline: z.array(OutlineNode),
});
export type ChapterSummary = z.infer<typeof ChapterSummary>;

export const Book = z.object({
  /** E.g. "ddia-2e". */
  id,
  title: z.string(),
  authors: z.array(z.string()),
  edition: z.int().positive(),
  publisher: z.string(),
  published: z.string(),
  isbn: z.string(),
  chapters: z.array(ChapterSummary),
  /** Maps every element id in the book to its chapter id and top-level block id. */
  anchors: z.record(z.string(), z.object({ chapterId: id, blockId: id })),
});
export type Book = z.infer<typeof Book>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Plain text of inline content. Note markers are left out. */
export function inlineText(nodes: readonly Inline[]): string {
  let out = "";
  for (const n of nodes) {
    switch (n.t) {
      case "text":
      case "code":
        out += n.text;
        break;
      case "br":
        out += "\n";
        break;
      case "noteref":
        break;
      default:
        out += inlineText(n.children);
    }
  }
  return out;
}

/** Plain text of a block, for search, AI context, and word counts. */
export function blockText(block: Block): string {
  const join = (blocks: readonly Block[]) => blocks.map(blockText).join("\n");
  switch (block.type) {
    case "heading":
      return inlineText(block.title);
    case "paragraph":
      return inlineText(block.content);
    case "list":
      return block.items.map(join).join("\n");
    case "definitions":
      return block.items.map((i) => `${inlineText(i.term)}\n${join(i.body)}`).join("\n");
    case "code":
      return block.code;
    case "callouts":
      return block.items.map((i) => `(${i.number}) ${join(i.body)}`).join("\n");
    case "figure":
      return [block.label, inlineText(block.caption)].filter(Boolean).join(" ");
    case "table": {
      const rows = [...block.head, ...block.body].map((r) => r.map(inlineText).join(" | "));
      return [block.label, inlineText(block.caption), ...rows].filter(Boolean).join("\n");
    }
    case "example":
      return [block.label, inlineText(block.caption), join(block.body)].filter(Boolean).join("\n");
    case "note":
      return join(block.body);
    case "sidebar":
      return `${inlineText(block.title)}\n${join(block.body)}`;
    case "quote":
      return [join(block.body), block.attribution && inlineText(block.attribution)]
        .filter(Boolean)
        .join("\n");
  }
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
