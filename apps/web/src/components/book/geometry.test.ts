import { describe, expect, it } from "vitest";
import {
  bookGeometry,
  firstBlockOnPage,
  lastStart,
  offsetAtPage,
  pageAt,
  pageForOffset,
  spreadStart,
} from "./geometry";

describe("bookGeometry", () => {
  it("opens as a two-page book on a 14 and 16 inch Mac", () => {
    for (const [w, h] of [
      [1512, 982],
      [1728, 1117],
    ] as const) {
      const g = bookGeometry(w, h);
      expect(g.spread).toBe(true);
      expect(g.pageW * 2).toBeLessThanOrEqual(w - 128);
      expect(g.pageW).toBeGreaterThanOrEqual(600);
    }
  });

  it("shows one full-width page on a phone", () => {
    const g = bookGeometry(390, 844);
    expect(g.spread).toBe(false);
    expect(g.pageW).toBe(390);
    expect(g.padX).toBe(22);
  });

  it("shows one page in a narrow or tall window", () => {
    expect(bookGeometry(900, 1100).spread).toBe(false);
  });
});

describe("pages", () => {
  it("finds the page under a point", () => {
    expect(pageAt(100, 100, 700)).toBe(0);
    expect(pageAt(1500, 100, 700)).toBe(2);
  });

  it("keeps spreads starting on an even page", () => {
    expect(spreadStart(5, true)).toBe(4);
    expect(spreadStart(5, false)).toBe(5);
    expect(lastStart(9, true)).toBe(8);
    expect(lastStart(10, true)).toBe(8);
    expect(lastStart(10, false)).toBe(9);
  });
});

describe("blocks across pages", () => {
  const frags = [
    { page: 3, height: 200 },
    { page: 4, height: 600 },
  ];

  it("finds the page for a point inside a block", () => {
    expect(pageForOffset(frags, 0)).toBe(3);
    expect(pageForOffset(frags, 0.2)).toBe(3);
    expect(pageForOffset(frags, 0.3)).toBe(4);
    expect(pageForOffset(frags, 1)).toBe(4);
  });

  it("measures how far into a block a page starts", () => {
    expect(offsetAtPage(frags, 3)).toBe(0);
    expect(offsetAtPage(frags, 4)).toBe(0.25);
  });

  it("finds the first block that reaches a page", () => {
    const lastPages = [0, 0, 1, 3, 3, 5];
    const lastPageOf = (i: number) => lastPages[i] ?? 0;
    expect(firstBlockOnPage(6, lastPageOf, 0)).toBe(0);
    expect(firstBlockOnPage(6, lastPageOf, 1)).toBe(2);
    expect(firstBlockOnPage(6, lastPageOf, 2)).toBe(3);
    expect(firstBlockOnPage(6, lastPageOf, 5)).toBe(5);
  });
});
