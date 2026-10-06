"use client";

import { useEffect, useState } from "react";
import { SURFACE_MOVED } from "@/components/reader/surface";
import { toggleBookmark } from "@/lib/annotations/actions";
import { currentBlockId } from "./dom";
import { annotations, useAnnotations, useIsBookmarked } from "./store";

/** A small ribbon in the margin of a bookmarked block. */
export function BookmarkFlag({ blockId }: { blockId: string }) {
  return useIsBookmarked(blockId) ? (
    <span className="bm-flag" role="img" aria-label="Bookmarked" />
  ) : null;
}

/** The block the reader is on, kept up to date as they scroll or turn pages. */
function useCurrentBlock(): string | null {
  const [here, setHere] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setHere(currentBlockId()));
    };
    update();
    // The book lays out its pages a moment after load.
    const settle = window.setTimeout(update, 800);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener(SURFACE_MOVED, update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", update);
      window.removeEventListener(SURFACE_MOVED, update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return here;
}

/** Top-bar button: bookmark the spot you are reading, or remove its bookmark. */
export function BookmarkButton({ bookId, chapterId }: { bookId: string; chapterId: string }) {
  const here = useCurrentBlock();
  const items = useAnnotations();
  const [busy, setBusy] = useState(false);
  const mark = items.find((a) => a.kind === "bookmark" && a.blockId === here);

  const toggle = async () => {
    const blockId = currentBlockId();
    if (!blockId || busy) return;
    setBusy(true);
    const existing = annotations.get().find((a) => a.kind === "bookmark" && a.blockId === blockId);
    // Show the change at once; undo it if saving fails.
    const temp = `temp-${crypto.randomUUID()}`;
    if (existing) annotations.removeGroup(existing.groupId);
    else
      annotations.add([
        {
          id: temp,
          groupId: temp,
          kind: "bookmark",
          chapterId,
          blockId,
          blockHash: "",
          range: null,
          color: null,
          note: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    try {
      const saved = await toggleBookmark({ bookId, chapterId, blockId });
      annotations.removeGroup(temp);
      if (saved) annotations.add([saved]);
    } catch {
      annotations.removeGroup(temp);
      if (existing) annotations.add([existing]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-text"
      aria-label={mark ? "Remove bookmark" : "Bookmark this spot"}
      aria-pressed={Boolean(mark)}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={mark ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className={mark ? "text-accent" : undefined}
        aria-hidden="true"
      >
        <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />
      </svg>
    </button>
  );
}
