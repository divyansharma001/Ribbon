"use client";

/*
 * A "reading surface" lets the position tracker work in book mode. The book
 * registers one; scroll mode registers none and the tracker measures scrolling.
 */

export interface ReadingSurface {
  /** Index (into the page's [data-block-id] elements) and offset at the top of the current page. */
  current(): { index: number; offset: number } | null;
  /** Show the page holding this point of the block. */
  goto(element: HTMLElement, offset: number): void;
  /** Page currently shown, used to fade the "You stopped here" marker. */
  page(): number;
}

/** Fired on window whenever the book shows a different page. */
export const SURFACE_MOVED = "ribbon:surface-moved";

let active: ReadingSurface | null = null;

export function setReadingSurface(surface: ReadingSurface | null): void {
  active = surface;
}

export function getReadingSurface(): ReadingSurface | null {
  return active;
}

/** Fired on window about once a second with this page's active reading seconds. */
export const ACTIVE_SECONDS_EVENT = "ribbon:active-seconds";
