"use client";

import { anchorRange } from "@/lib/annotations/anchor";
import { rangeAt } from "./dom";
import { annotations } from "./store";

/*
 * Book mode turns pages using copies of the text. CSS highlights only paint
 * the live page, so the copies get real <mark> elements instead, or the
 * highlights would vanish halfway through a page turn.
 */

function wrap(range: Range, make: () => HTMLElement) {
  const root = range.commonAncestorContainer;
  const walker = document.createTreeWalker(
    root.nodeType === Node.TEXT_NODE ? (root.parentNode ?? root) : root,
    NodeFilter.SHOW_TEXT,
  );
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (range.intersectsNode(n)) nodes.push(n as Text);
  }
  for (const node of nodes) {
    let target = node;
    if (node === range.endContainer && range.endOffset < node.length)
      node.splitText(range.endOffset);
    if (node === range.startContainer && range.startOffset > 0)
      target = node.splitText(range.startOffset);
    if (!target.textContent) continue;
    const mark = make();
    target.replaceWith(mark);
    mark.append(target);
  }
}

/** Marks every highlight inside a copy of the book text. Call before its ids are removed. */
export function paintCopy(copy: HTMLElement) {
  for (const a of annotations.get()) {
    if (a.kind !== "highlight" || !a.range) continue;
    const block = copy.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(a.blockId)}"]`);
    if (!block) continue;
    const found = anchorRange(block.textContent ?? "", a.range);
    const range = found ? rangeAt(block, found.start, found.end) : null;
    if (!range) continue;
    wrap(range, () => {
      const mark = document.createElement("mark");
      mark.className = "hl-copy";
      mark.dataset.color = a.color ?? "yellow";
      if (a.note) mark.dataset.noted = "";
      return mark;
    });
  }
}
