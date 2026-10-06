/*
 * Where a highlight sits inside one block's text. Saved as offsets plus the
 * quoted text and a little context on each side, so it can be found again
 * even if the block's text changes slightly after a book re-import.
 */

export interface TextRange {
  start: number;
  end: number;
  quote: string;
  prefix: string;
  suffix: string;
}

/** Characters of context kept on each side of a quote. */
export const CONTEXT = 32;

export function describeRange(text: string, start: number, end: number): TextRange {
  return {
    start,
    end,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
  };
}

/** How many characters match, walking away from the quote. */
function sharedEnd(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}
function sharedStart(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Finds a saved range in the block's current text. Same offsets if the quote
 * is still there; otherwise the copy of the quote whose surroundings match
 * best (nearest to the old spot on a tie); null if the quote is gone.
 */
export function anchorRange(text: string, saved: TextRange): { start: number; end: number } | null {
  if (!saved.quote) return null;
  if (text.slice(saved.start, saved.end) === saved.quote) {
    return { start: saved.start, end: saved.end };
  }
  let best: { start: number; score: number; distance: number } | null = null;
  for (let at = text.indexOf(saved.quote); at !== -1; at = text.indexOf(saved.quote, at + 1)) {
    const end = at + saved.quote.length;
    const score =
      sharedEnd(text.slice(Math.max(0, at - CONTEXT), at), saved.prefix) +
      sharedStart(text.slice(end, end + CONTEXT), saved.suffix);
    const distance = Math.abs(at - saved.start);
    if (!best || score > best.score || (score === best.score && distance < best.distance)) {
      best = { start: at, score, distance };
    }
  }
  return best ? { start: best.start, end: best.start + saved.quote.length } : null;
}
