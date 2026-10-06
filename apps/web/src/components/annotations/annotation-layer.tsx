"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addHighlight, deleteAnnotation, updateHighlight } from "@/lib/annotations/actions";
import {
  type Annotation,
  HIGHLIGHT_COLORS,
  type HighlightColor,
  NOTE_MAX,
} from "@/lib/annotations/types";
import { liveRange, type Segment, segmentsOf } from "./dom";
import { annotations, highlightAt, setPainted, useAnnotations } from "./store";

/*
 * Highlights and notes in the reader. Highlights are painted with the CSS
 * Custom Highlight API, so the book's HTML is never changed. Selecting text
 * shows a small bar (colors, note, copy); tapping a highlight opens it.
 */

const COLOR_NAMES: Record<HighlightColor, string> = {
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  pink: "Pink",
};
const GAP = 10;
const MARGIN = 12;

/*
 * Highlight colors. Kept here rather than in a .css file because the CSS
 * build tool doesn't understand ::highlight() yet and warns on every build.
 * A noted highlight gets a dotted underline; the one being edited, a solid one.
 */
const HIGHLIGHT_STYLES = [
  ...HIGHLIGHT_COLORS.map((c) => `::highlight(ribbon-${c}){background-color:var(--hl-${c})}`),
  "::highlight(ribbon-noted){text-decoration:underline dotted var(--accent);text-decoration-thickness:1.5px;text-underline-offset:0.22em}",
  "::highlight(ribbon-active){text-decoration:underline solid var(--accent);text-decoration-thickness:2px;text-underline-offset:0.22em}",
].join("\n");

const supported = () => typeof CSS !== "undefined" && "highlights" in CSS;

/** Paints every highlight, and remembers the ranges for tap detection. */
function paint(items: Annotation[], active: string | null) {
  if (!supported()) return;
  const byColor = new Map<HighlightColor, Range[]>(HIGHLIGHT_COLORS.map((c) => [c, []]));
  const noted: Range[] = [];
  const current: Range[] = [];
  const groups = new Map<string, Range[]>();
  for (const a of items) {
    if (a.kind !== "highlight" || !a.range) continue;
    const range = liveRange(a.blockId, a.range);
    if (!range) continue;
    byColor.get(a.color ?? "yellow")?.push(range);
    if (a.note) noted.push(range);
    if (a.groupId === active) current.push(range);
    groups.set(a.groupId, [...(groups.get(a.groupId) ?? []), range]);
  }
  for (const [color, ranges] of byColor)
    CSS.highlights.set(`ribbon-${color}`, new Highlight(...ranges));
  CSS.highlights.set("ribbon-noted", new Highlight(...noted));
  CSS.highlights.set("ribbon-active", new Highlight(...current));
  setPainted([...groups].map(([groupId, ranges]) => ({ groupId, ranges })));
}

function clearPaint() {
  if (!supported()) return;
  for (const c of HIGHLIGHT_COLORS) CSS.highlights.delete(`ribbon-${c}`);
  CSS.highlights.delete("ribbon-noted");
  CSS.highlights.delete("ribbon-active");
  setPainted([]);
}

/** A spot on screen to place a floating panel next to. */
interface Anchor {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

function anchorOf(rects: DOMRectList | DOMRect[]): Anchor | null {
  const list = [...rects].filter((r) => r.width > 0 || r.height > 0);
  const first = list[0];
  const last = list.at(-1);
  if (!first || !last) return null;
  return { top: first.top, bottom: last.bottom, left: first.left, right: last.right };
}

/** Places a panel above the anchor, or below it when there is no room or on touch screens. */
function usePlacement(anchor: Anchor | null, preferBelow: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const { width, height } = el.getBoundingClientRect();
    const center = (anchor.left + anchor.right) / 2;
    const left = Math.min(Math.max(MARGIN, center - width / 2), window.innerWidth - width - MARGIN);
    const above = anchor.top - GAP - height;
    const below = anchor.bottom + GAP;
    const fitsAbove = above >= 64;
    const fitsBelow = below + height <= window.innerHeight - MARGIN;
    const top =
      (preferBelow && fitsBelow) || !fitsAbove
        ? Math.min(below, window.innerHeight - height - MARGIN)
        : above;
    setPlace({ left, top: Math.max(MARGIN, top) });
  }, [anchor, preferBelow]);
  return { ref, style: place ?? { visibility: "hidden" as const, left: 0, top: 0 } };
}

const isTouch = () => window.matchMedia("(pointer: coarse)").matches;

export function AnnotationLayer({
  bookId,
  chapterId,
  initial,
}: {
  bookId: string;
  chapterId: string;
  initial: Annotation[];
}) {
  const items = useAnnotations();
  const [selection, setSelection] = useState<{ anchor: Anchor; segments: Segment[] } | null>(null);
  // `key` stays the same while a new highlight's temporary group is swapped for the saved one.
  const [open, setOpen] = useState<{
    key: string;
    groupId: string;
    anchor: Anchor;
    editing: boolean;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useLayoutEffect(() => {
    annotations.set(initial);
  }, [initial]);

  // Paint now, after the page settles (fonts, images), and whenever anything changes.
  useEffect(() => {
    paint(items, open?.groupId ?? null);
    const later = window.setTimeout(() => paint(annotations.get(), open?.groupId ?? null), 600);
    return () => window.clearTimeout(later);
  }, [items, open?.groupId]);
  useEffect(() => clearPaint, []);

  const flash = useCallback((text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2200);
  }, []);

  // ---------------------------------------------------------------------------
  // Selecting text shows the highlight bar.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let pressed = false;
    let timer = 0;
    const read = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || pressed) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const segments = segmentsOf(range);
      const anchor = anchorOf(range.getClientRects());
      setSelection(segments.length && anchor ? { anchor, segments } : null);
    };
    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(read, 120);
    };
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".hl-bar, .hl-editor")) return;
      pressed = true;
      setSelection(null);
    };
    const up = () => {
      pressed = false;
      later();
    };
    document.addEventListener("selectionchange", later);
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", later);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Tapping a highlight opens it.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, textarea, .hl-bar, .hl-editor, .reader-popup")) return;
      if (!document.getSelection()?.isCollapsed) return;
      const groupId = highlightAt(e.clientX, e.clientY);
      if (!groupId) return;
      const ranges = items
        .filter((a) => a.groupId === groupId && a.range)
        .flatMap((a) => {
          const r = a.range ? liveRange(a.blockId, a.range) : null;
          return r ? [...r.getClientRects()] : [];
        });
      const anchor = anchorOf(ranges);
      if (anchor) setOpen({ key: groupId, groupId, anchor, editing: false });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [items]);

  // Scrolling or a page turn moves the text away from a floating bar: hide it.
  useEffect(() => {
    if (!selection && !open) return;
    const hide = () => {
      setSelection(null);
      setOpen((o) => (o?.editing ? o : null));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setSelection(null);
      }
    };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("wheel", hide, { passive: true });
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("wheel", hide);
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKey);
    };
  }, [selection, open]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const highlight = async (color: HighlightColor, thenNote: boolean) => {
    if (!selection) return;
    const { segments, anchor } = selection;
    document.getSelection()?.removeAllRanges();
    setSelection(null);
    // Show it at once; swap in the saved rows when the server answers.
    const temp = `temp-${crypto.randomUUID()}`;
    annotations.add(
      segments.map((s, i) => ({
        id: `${temp}-${i}`,
        groupId: temp,
        kind: "highlight" as const,
        chapterId,
        blockId: s.blockId,
        blockHash: "",
        range: s.range,
        color,
        note: null,
        createdAt: new Date().toISOString(),
      })),
    );
    if (thenNote) setOpen({ key: temp, groupId: temp, anchor, editing: true });
    try {
      const saved = await addHighlight({ bookId, chapterId, color, segments });
      const groupId = saved[0]?.groupId;
      if (!groupId) return;
      // Changes made while it was saving (color, note, or deleting it) carry over.
      const now = annotations.get().find((a) => a.groupId === temp);
      annotations.removeGroup(temp);
      if (!now) {
        await deleteAnnotation({ bookId, groupId });
        return;
      }
      annotations.add(saved.map((a) => ({ ...a, color: now.color, note: now.note })));
      if (now.color !== color || now.note)
        await updateHighlight({
          bookId,
          groupId,
          color: now.color ?? color,
          note: now.note ?? "",
        });
      setOpen((o) => (o?.groupId === temp ? { ...o, groupId } : o));
    } catch {
      annotations.removeGroup(temp);
      setOpen((o) => (o?.groupId === temp ? null : o));
      flash("Couldn't save that highlight. Try again.");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash("Copied");
    } catch {
      flash("Couldn't copy");
    }
  };

  const recolor = (groupId: string, color: HighlightColor) => {
    annotations.patchGroup(groupId, { color });
    if (!groupId.startsWith("temp-"))
      updateHighlight({ bookId, groupId, color }).catch(() => flash("Couldn't save that change."));
  };

  const saveNote = (groupId: string, note: string) => {
    const before = annotations.get().find((a) => a.groupId === groupId)?.note ?? "";
    if (note.trim() === before.trim()) return;
    annotations.patchGroup(groupId, { note: note.trim() || null });
    if (!groupId.startsWith("temp-"))
      updateHighlight({ bookId, groupId, note }).catch(() => flash("Couldn't save your note."));
  };

  const remove = (groupId: string) => {
    const removed = items.filter((a) => a.groupId === groupId);
    annotations.removeGroup(groupId);
    setOpen(null);
    // Still saving: the save sees it gone and deletes it on the server.
    if (groupId.startsWith("temp-")) return;
    deleteAnnotation({ bookId, groupId }).catch(() => {
      annotations.add(removed);
      flash("Couldn't delete that highlight.");
    });
  };

  const openGroup = open ? items.filter((a) => a.groupId === open.groupId) : [];

  return (
    <>
      <style>{HIGHLIGHT_STYLES}</style>
      {selection && (
        <SelectionBar
          anchor={selection.anchor}
          onColor={(c) => highlight(c, false)}
          onNote={() => highlight("yellow", true)}
          onCopy={() => copy(document.getSelection()?.toString() ?? "")}
        />
      )}
      {open && openGroup.length > 0 && (
        <HighlightEditor
          key={open.key}
          anchor={open.anchor}
          color={openGroup[0]?.color ?? "yellow"}
          note={openGroup[0]?.note ?? ""}
          startEditing={open.editing}
          onColor={(c) => recolor(open.groupId, c)}
          groupId={open.groupId}
          onNote={saveNote}
          onCopy={() => copy(openGroup.map((a) => a.range?.quote ?? "").join("\n\n"))}
          onDelete={() => remove(open.groupId)}
          onEditing={() => setOpen((o) => (o ? { ...o, editing: true } : o))}
          onClose={() => setOpen(null)}
        />
      )}
      {message &&
        createPortal(
          <p className="hl-toast" role="status">
            {message}
          </p>,
          document.body,
        )}
    </>
  );
}

function Swatches({
  current,
  onPick,
}: {
  current?: HighlightColor;
  onPick: (c: HighlightColor) => void;
}) {
  return (
    <div className="hl-swatches">
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className="hl-swatch"
          data-color={c}
          aria-label={`Highlight ${COLOR_NAMES[c].toLowerCase()}`}
          aria-pressed={current ? current === c : undefined}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onPick(c)}
        />
      ))}
    </div>
  );
}

function SelectionBar({
  anchor,
  onColor,
  onNote,
  onCopy,
}: {
  anchor: Anchor;
  onColor: (c: HighlightColor) => void;
  onNote: () => void;
  onCopy: () => void;
}) {
  const { ref, style } = usePlacement(anchor, isTouch());
  return createPortal(
    <div ref={ref} className="hl-bar" role="toolbar" aria-label="Highlight" style={style}>
      <Swatches onPick={onColor} />
      <span className="hl-sep" aria-hidden="true" />
      <button
        type="button"
        className="hl-action"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onNote}
      >
        Note
      </button>
      <button
        type="button"
        className="hl-action"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onCopy}
      >
        Copy
      </button>
    </div>,
    document.body,
  );
}

function HighlightEditor(props: {
  /** Can change while open: a new highlight's temporary group becomes the saved one. */
  groupId: string;
  anchor: Anchor;
  color: HighlightColor;
  note: string;
  startEditing: boolean;
  onColor: (c: HighlightColor) => void;
  onNote: (groupId: string, note: string) => void;
  onCopy: () => void;
  onDelete: () => void;
  onEditing: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(props.note);
  const [editing, setEditing] = useState(props.startEditing || props.note !== "");
  const { ref, style } = usePlacement(props.anchor, true);
  const field = useRef<HTMLTextAreaElement>(null);
  const latest = useRef({ note, groupId: props.groupId, onNote: props.onNote, start: props.note });
  latest.current = { ...latest.current, note, groupId: props.groupId, onNote: props.onNote };
  const { onClose } = props;

  // The note is saved once, when the editor closes, however it closes.
  useEffect(
    () => () => {
      const { note, groupId, onNote, start } = latest.current;
      if (note !== start) onNote(groupId, note);
    },
    [],
  );

  useEffect(() => {
    if (props.startEditing) field.current?.focus({ preventScroll: true });
  }, [props.startEditing]);

  // Close on a tap outside.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [ref, onClose]);

  return createPortal(
    <div ref={ref} className="hl-editor" role="dialog" aria-label="Highlight" style={style}>
      <div className="hl-editor-row">
        <Swatches current={props.color} onPick={props.onColor} />
        <span className="hl-editor-tools">
          <button type="button" className="hl-action" onClick={props.onCopy}>
            Copy
          </button>
          <button type="button" className="hl-action is-danger" onClick={props.onDelete}>
            Delete
          </button>
        </span>
      </div>
      {editing ? (
        <div className="hl-note">
          <textarea
            ref={field}
            value={note}
            maxLength={NOTE_MAX}
            rows={3}
            placeholder="Write a note…"
            aria-label="Note"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onClose();
            }}
          />
          <button type="button" className="hl-done" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="hl-add-note"
          onClick={() => {
            setEditing(true);
            props.onEditing();
            requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
          }}
        >
          Add a note
        </button>
      )}
    </div>,
    document.body,
  );
}
