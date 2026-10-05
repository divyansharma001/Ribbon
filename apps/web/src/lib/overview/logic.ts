import type { OutlineNode } from "@ribbon/book-schema";

/*
 * Book overview: how far along each chapter and section is, and how well
 * its quick-check questions are remembered. Pure functions, tested on their own.
 */

export interface SectionStats {
  /** Blocks in the section. */
  total: number;
  /** Blocks the reader has read. */
  read: number;
  /** Quick-check questions placed in the section. */
  questions: number;
  answered: number;
  /** Questions in review box 2 or higher: recalled again after a gap. */
  solid: number;
  /** Questions in box 0: missed the last time they came up. */
  weak: number;
}

export type Mastery = "unread" | "reading" | "read" | "checked" | "mastered";

export const MASTERY_LABELS: Record<Mastery, string> = {
  unread: "Unread",
  reading: "Reading",
  read: "Read",
  checked: "Checked",
  mastered: "Mastered",
};

/** Share of blocks read that counts a section or chapter as read. */
export const READ_THRESHOLD = 0.9;

export const EMPTY_STATS: SectionStats = {
  total: 0,
  read: 0,
  questions: 0,
  answered: 0,
  solid: 0,
  weak: 0,
};

export function addStats(a: SectionStats, b: SectionStats): SectionStats {
  return {
    total: a.total + b.total,
    read: a.read + b.read,
    questions: a.questions + b.questions,
    answered: a.answered + b.answered,
    solid: a.solid + b.solid,
    weak: a.weak + b.weak,
  };
}

export function readShare(s: SectionStats): number {
  return s.total > 0 ? Math.min(1, s.read / s.total) : 0;
}

/**
 * Unread -> Reading -> Read -> Checked (every question answered) ->
 * Mastered (every question recalled again in a later review).
 */
export function masteryOf(s: SectionStats): Mastery {
  if (s.questions > 0 && s.answered >= s.questions) {
    return s.solid >= s.questions ? "mastered" : "checked";
  }
  const share = readShare(s);
  if (share >= READ_THRESHOLD) return "read";
  if (share > 0 || s.answered > 0) return "reading";
  return "unread";
}

export interface OverviewNode {
  anchor: string;
  title: string;
  level: number;
  /** Heading block to link to. */
  blockId: string;
  /** This section and everything nested in it. */
  stats: SectionStats;
  mastery: Mastery;
  children: OverviewNode[];
}

/** The section a block belongs to: block ids are "<section anchor>.<n>". */
export function sectionOfBlock(blockId: string): string {
  const dot = blockId.lastIndexOf(".");
  return dot > 0 ? blockId.slice(0, dot) : blockId;
}

/**
 * Builds the section tree for one chapter. `own` holds each section's own
 * numbers (not its subsections'); every node here adds its children up.
 * Text before the first section (the chapter's opening) becomes "Introduction".
 */
export function buildSections(
  chapterAnchor: string,
  outline: readonly OutlineNode[],
  own: ReadonlyMap<string, SectionStats>,
): OverviewNode[] {
  const build = (node: OutlineNode): OverviewNode => {
    const children = node.children.map(build);
    const stats = children.reduce(
      (sum, c) => addStats(sum, c.stats),
      own.get(node.anchor) ?? EMPTY_STATS,
    );
    return {
      anchor: node.anchor,
      title: node.title,
      level: node.level,
      blockId: node.blockId,
      stats,
      mastery: masteryOf(stats),
      children,
    };
  };
  const nodes = outline.map(build);
  const intro = own.get(chapterAnchor);
  if (intro && intro.total > 0) {
    nodes.unshift({
      anchor: chapterAnchor,
      title: "Introduction",
      level: 2,
      blockId: `${chapterAnchor}.0`,
      stats: intro,
      mastery: masteryOf(intro),
      children: [],
    });
  }
  return nodes;
}

/** Whole-chapter numbers: the top-level sections added up. */
export function chapterStats(sections: readonly OverviewNode[]): SectionStats {
  return sections.reduce((sum, s) => addStats(sum, s.stats), EMPTY_STATS);
}
