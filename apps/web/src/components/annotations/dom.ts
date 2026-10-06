"use client";

import { getReadingSurface } from "@/components/reader/surface";
import { anchorRange, describeRange, type TextRange } from "@/lib/annotations/anchor";

/*
 * Turning a text selection into per-block offsets, and saved offsets back
 * into live DOM ranges. Offsets count characters of the block's text, the
 * same text the reader sees (textContent of the block element).
 */

const BLOCKS = "[data-block-id]";

/** The live block element (book-mode page copies carry no ids). */
export function blockElement(blockId: string): HTMLElement | null {
  const el = document.getElementById(blockId);
  return el?.matches(BLOCKS) ? el : null;
}

/** Characters from the start of `root` to a point inside it. */
function offsetOf(root: Node, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

export interface Segment {
  blockId: string;
  range: TextRange;
}

/** The part of a selection inside each block it touches, as offsets. Skips blank pieces. */
export function segmentsOf(range: Range): Segment[] {
  const out: Segment[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(BLOCKS)) {
    if (!range.intersectsNode(el)) continue;
    const text = el.textContent ?? "";
    const startsInside = el.contains(range.startContainer);
    const endsInside = el.contains(range.endContainer);
    const start = startsInside ? offsetOf(el, range.startContainer, range.startOffset) : 0;
    const end = endsInside ? offsetOf(el, range.endContainer, range.endOffset) : text.length;
    // Trim spaces at either end so the highlight hugs the words.
    let s = start;
    let e = end;
    while (s < e && /\s/.test(text[s] ?? "")) s++;
    while (e > s && /\s/.test(text[e - 1] ?? "")) e--;
    if (e > s && el.dataset.blockId)
      out.push({ blockId: el.dataset.blockId, range: describeRange(text, s, e) });
  }
  return out;
}

/** A DOM range for characters [start, end) of an element's text. */
export function rangeAt(root: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  let seen = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.textContent?.length ?? 0;
    if (!started && start <= seen + len) {
      r.setStart(node, start - seen);
      started = true;
    }
    if (started && end <= seen + len) {
      r.setEnd(node, end - seen);
      return r;
    }
    seen += len;
  }
  return null;
}

/** Finds a saved range in its block as it is on the page now. */
export function liveRange(blockId: string, saved: TextRange): Range | null {
  const el = blockElement(blockId);
  if (!el) return null;
  const found = anchorRange(el.textContent ?? "", saved);
  return found ? rangeAt(el, found.start, found.end) : null;
}

/** The block at the top of what the reader is looking at now. */
export function currentBlockId(): string | null {
  const blocks = [...document.querySelectorAll<HTMLElement>(BLOCKS)];
  const surface = getReadingSurface();
  if (surface) {
    const at = surface.current();
    return at ? (blocks[at.index]?.dataset.blockId ?? null) : null;
  }
  // Scroll mode: the first block whose bottom is below the top bar.
  const top = 64;
  const el = blocks.find((b) => b.getBoundingClientRect().bottom > top);
  return el?.dataset.blockId ?? null;
}
