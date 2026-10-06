"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteAnnotation } from "@/lib/annotations/actions";
import type { Annotation } from "@/lib/annotations/types";
import { blockElement } from "./dom";
import { annotations, useAnnotations } from "./store";

interface Entry {
  groupId: string;
  kind: Annotation["kind"];
  blockId: string;
  color: Annotation["color"];
  quote: string;
  note: string | null;
}

/** One entry per highlight (however many paragraphs it covers) or bookmark, in page order. */
function entriesOf(items: Annotation[]): Entry[] {
  const groups = new Map<string, Entry>();
  for (const a of items) {
    const quote = a.range?.quote ?? "";
    const seen = groups.get(a.groupId);
    if (seen) seen.quote = `${seen.quote} … ${quote}`;
    else
      groups.set(a.groupId, {
        groupId: a.groupId,
        kind: a.kind,
        blockId: a.blockId,
        color: a.color,
        quote,
        note: a.note,
      });
  }
  return [...groups.values()];
}

/** The first words of a block, for bookmarks. Read from the page after it loads. */
function useSnippets(blockIds: string[]): Record<string, string> {
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const key = blockIds.join(" ");
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const id of key.split(" ").filter(Boolean)) {
      const text = blockElement(id)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      next[id] = text.length > 140 ? `${text.slice(0, 140).replace(/\s+\S*$/, "")}…` : text;
    }
    setSnippets(next);
  }, [key]);
  return snippets;
}

/** This chapter's highlights, notes, and bookmarks, for the drawer. */
export function NotesList({ bookId }: { bookId: string }) {
  const items = useAnnotations();
  const entries = entriesOf(items);
  const snippets = useSnippets(entries.filter((e) => e.kind === "bookmark").map((e) => e.blockId));

  if (entries.length === 0) {
    return (
      <div className="notes-empty">
        <p className="font-medium">No highlights or bookmarks in this chapter yet.</p>
        <p>
          Select any text to highlight it or add a note. The ribbon button at the top bookmarks your
          spot.
        </p>
      </div>
    );
  }

  const remove = (entry: Entry) => {
    const removed = items.filter((a) => a.groupId === entry.groupId);
    annotations.removeGroup(entry.groupId);
    if (entry.groupId.startsWith("temp-")) return;
    deleteAnnotation({ bookId, groupId: entry.groupId }).catch(() => annotations.add(removed));
  };

  return (
    <ul className="notes-list">
      {entries.map((e) => (
        <li key={e.groupId} className="notes-item" data-color={e.color ?? undefined}>
          <a href={`#${e.blockId}`} className="notes-link">
            {e.kind === "bookmark" ? (
              <>
                <span className="notes-kind">Bookmark</span>
                <span className="notes-quote">{snippets[e.blockId] ?? ""}</span>
              </>
            ) : (
              <>
                <span className="notes-quote is-highlight">{e.quote}</span>
                {e.note && <span className="notes-note">{e.note}</span>}
              </>
            )}
          </a>
          <button
            type="button"
            className="notes-delete"
            aria-label={e.kind === "bookmark" ? "Remove bookmark" : "Delete highlight"}
            onClick={() => remove(e)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Link to every note in the book, under the list. */
export function AllNotesLink({ bookId }: { bookId: string }) {
  return (
    <Link
      href={`/books/${bookId}#notes`}
      className="text-sm font-medium text-accent hover:underline"
    >
      All notes in this book
    </Link>
  );
}
