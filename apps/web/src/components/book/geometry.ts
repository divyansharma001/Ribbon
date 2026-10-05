/*
 * Book mode geometry. Pure functions, no DOM, so they are easy to test.
 *
 * The chapter text flows into CSS columns. Each column is one page's text
 * area; columns are exactly one page width apart, so page i is shown by
 * moving the text left by i page widths.
 */

export interface BookGeometry {
  /** Two pages side by side (open book) or one page. */
  spread: boolean;
  /** One page, in CSS pixels. */
  pageW: number;
  pageH: number;
  /** Inner margins of a page. */
  padX: number;
  padTop: number;
  padBottom: number;
  /** Base text size. */
  fontSize: number;
}

const TOP_BAR = 56;
const FOOTER = 48;

/** Fits the book to the window: an open two-page book on wide screens, one page on narrow ones. */
export function bookGeometry(viewportW: number, viewportH: number): BookGeometry {
  const phone = viewportW < 640;
  const sideRoom = phone ? 0 : 128; // room for the turn arrows beside the book
  const vertRoom = TOP_BAR + FOOTER + (phone ? 0 : 24);
  const availW = Math.max(280, viewportW - sideRoom);
  const availH = Math.max(320, viewportH - vertRoom);
  const spread = !phone && availW >= 960 && availW / availH >= 1.2;

  let pageW: number;
  if (phone) pageW = viewportW;
  else if (spread) pageW = Math.min(availW / 2, availH * 0.8, 780);
  else pageW = Math.min(availW, 760);
  pageW = Math.floor(pageW);
  const pageH = Math.floor(availH);

  const padX = phone ? 22 : Math.round(Math.min(72, Math.max(40, pageW * 0.085)));
  const padTop = phone ? 24 : 52;
  const padBottom = phone ? 24 : 48;
  const fontSize = phone ? 17.5 : pageW >= 640 ? 19 : 18;
  return { spread, pageW, pageH, padX, padTop, padBottom, fontSize };
}

/** Which page a point at `left` (screen x) is on, given where page 0's text starts. */
export function pageAt(left: number, page0Left: number, pageW: number): number {
  return Math.max(0, Math.round((left - page0Left) / pageW));
}

/** The page shown on the left of the spread (or the only page) for any page. */
export function spreadStart(page: number, spread: boolean): number {
  return spread ? page - (page % 2) : page;
}

/** Index of the last page that can be the start of a view. */
export function lastStart(pageCount: number, spread: boolean): number {
  return spreadStart(Math.max(0, pageCount - 1), spread);
}

export interface Fragment {
  page: number;
  height: number;
}

/**
 * A block can run across pages. Given its pieces in order and how far into
 * the block we are (0 to 1), returns the page holding that point.
 */
export function pageForOffset(fragments: Fragment[], offset: number): number {
  if (fragments.length === 0) return 0;
  const total = fragments.reduce((s, f) => s + f.height, 0);
  if (total <= 0) return fragments[0]?.page ?? 0;
  let target = Math.min(Math.max(offset, 0), 1) * total;
  for (const f of fragments) {
    if (target < f.height) return f.page;
    target -= f.height;
  }
  return fragments.at(-1)?.page ?? 0;
}

/** How far into a block (0 to 1) the start of `page` is. */
export function offsetAtPage(fragments: Fragment[], page: number): number {
  const total = fragments.reduce((s, f) => s + f.height, 0);
  if (total <= 0) return 0;
  const before = fragments.filter((f) => f.page < page).reduce((s, f) => s + f.height, 0);
  return Math.min(1, before / total);
}

/**
 * The first block that reaches `page`. `lastPageOf(i)` is the last page block
 * i appears on; that number never goes down as i grows, so binary search works.
 */
export function firstBlockOnPage(
  count: number,
  lastPageOf: (i: number) => number,
  page: number,
): number {
  let lo = 0;
  let hi = count - 1;
  let found = count - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lastPageOf(mid) >= page) {
      found = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return Math.max(0, found);
}
