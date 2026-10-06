import type { TextRange } from "./anchor";

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

/** A highlight (one row per block it covers) or a bookmark on a block. */
export interface Annotation {
  id: string;
  /** Rows saved together (one highlight across paragraphs) share a group. */
  groupId: string;
  kind: "highlight" | "bookmark";
  chapterId: string;
  blockId: string;
  blockHash: string;
  range: TextRange | null;
  color: HighlightColor | null;
  note: string | null;
  createdAt: string;
}

/** Longest note, in characters. */
export const NOTE_MAX = 4000;
