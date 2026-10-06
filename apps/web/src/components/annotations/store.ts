"use client";

import { useSyncExternalStore } from "react";
import type { Annotation } from "@/lib/annotations/types";

/*
 * This chapter's highlights and bookmarks, shared by the highlight layer,
 * the bookmark flags, and the notes list. Changes are shown at once and
 * saved in the background.
 */

const EMPTY: Annotation[] = [];
let items: Annotation[] = EMPTY;
const listeners = new Set<() => void>();

/** Fired on window when highlights change, so book mode can redraw its page copies. */
export const ANNOTATIONS_CHANGED = "ribbon:annotations-changed";

function emit(next: Annotation[]) {
  items = next;
  for (const fn of listeners) fn();
  window.dispatchEvent(new Event(ANNOTATIONS_CHANGED));
}

export const annotations = {
  get: () => items,
  set: (next: Annotation[]) => emit(next),
  add: (more: Annotation[]) => emit([...items, ...more]),
  patchGroup: (groupId: string, patch: Partial<Pick<Annotation, "color" | "note">>) =>
    emit(items.map((a) => (a.groupId === groupId ? { ...a, ...patch } : a))),
  removeGroup: (groupId: string) => emit(items.filter((a) => a.groupId !== groupId)),
};

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAnnotations(): Annotation[] {
  return useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY,
  );
}

export function useIsBookmarked(blockId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => items.some((a) => a.kind === "bookmark" && a.blockId === blockId),
    () => false,
  );
}

// ---------------------------------------------------------------------------
// Painted highlights, for finding which one was tapped.
// ---------------------------------------------------------------------------

let painted: { groupId: string; ranges: Range[] }[] = [];

export function setPainted(next: { groupId: string; ranges: Range[] }[]) {
  painted = next;
}

/** The highlight group under a screen point, if any. */
export function highlightAt(x: number, y: number): string | null {
  for (const p of painted) {
    for (const range of p.ranges) {
      for (const r of range.getClientRects()) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return p.groupId;
      }
    }
  }
  return null;
}
