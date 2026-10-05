"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { noteDomId, termDomId } from "./inlines";

/*
 * Small popups for citation markers (①, [23]) and glossary terms, so the
 * reader never has to leave their spot. The content is already on the page:
 * the chapter's reference list, and hidden glossary definitions rendered on
 * the server. This only finds it and shows it next to the tap.
 */

interface Popup {
  kind: "note" | "term";
  title: string;
  html: string;
  /** The reference list entry, for "Show in references". */
  noteId?: string;
  trigger: HTMLElement;
}

const GAP = 8;
const MARGIN = 12;

function popupFor(trigger: HTMLElement): Popup | null {
  const noteTarget = trigger.dataset.noteref;
  if (noteTarget) {
    const id = noteDomId(noteTarget);
    const entry = document.getElementById(id);
    const body = entry?.querySelector(":scope > span:last-child");
    if (!entry || !body) return null;
    const label = trigger.textContent?.trim() ?? "";
    return { kind: "note", title: `Reference ${label}`, html: body.innerHTML, noteId: id, trigger };
  }
  const term = trigger.dataset.term;
  if (term) {
    const def = document.getElementById(termDomId(term));
    if (!def) return null;
    return { kind: "term", title: term, html: def.innerHTML, trigger };
  }
  return null;
}

export function ReaderPopups() {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const openRef = useRef<Popup | null>(null);
  openRef.current = popup;

  const close = useCallback((refocus: boolean) => {
    const current = openRef.current;
    setPopup(null);
    setPlace(null);
    if (current && refocus) current.trigger.focus({ preventScroll: true });
  }, []);

  // Open on a tap or click on a marker or term. Runs before book mode's own link handling.
  useEffect(() => {
    const open = (trigger: HTMLElement) => {
      const next = popupFor(trigger);
      if (next) setPopup((current) => (current?.trigger === trigger ? null : next));
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || box.current?.contains(target)) return;
      const trigger = target.closest<HTMLElement>("[data-noteref], [data-term]");
      if (!trigger || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      open(trigger);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // While open: close on Escape, a tap elsewhere, scrolling, a page turn, or resizing.
  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (box.current?.contains(target) || popup.trigger.contains(target)) return;
      close(false);
    };
    const onMove = () => close(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("wheel", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("wheel", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [popup, close]);

  // Place it under the marker, or above when there is no room, inside the screen.
  useLayoutEffect(() => {
    const el = box.current;
    if (!popup || !el) return;
    const at = popup.trigger.getBoundingClientRect();
    const { width, height } = el.getBoundingClientRect();
    const left = Math.min(
      Math.max(MARGIN, at.left + at.width / 2 - width / 2),
      window.innerWidth - width - MARGIN,
    );
    const below = at.bottom + GAP;
    const top =
      below + height <= window.innerHeight - MARGIN
        ? below
        : Math.max(MARGIN, at.top - GAP - height);
    setPlace({ left, top });
    el.focus({ preventScroll: true });
  }, [popup]);

  if (!popup) return null;
  return createPortal(
    <div
      ref={box}
      className="reader-popup"
      role="dialog"
      aria-label={popup.title}
      tabIndex={-1}
      data-kind={popup.kind}
      style={place ? { left: place.left, top: place.top } : { visibility: "hidden" }}
    >
      <div className="reader-popup-head">
        <span className="reader-popup-kind">
          {popup.kind === "note" ? "Reference" : "Glossary"}
        </span>
        <span className="reader-popup-title">
          {popup.kind === "note" ? popup.title.replace(/^Reference /, "") : popup.title}
        </span>
        <button
          type="button"
          className="reader-popup-close"
          aria-label="Close"
          onClick={() => close(true)}
        >
          ×
        </button>
      </div>
      {/* Our own server-rendered markup, copied from this page. */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: content comes from this page's own DOM */}
      <div className="reader-popup-body" dangerouslySetInnerHTML={{ __html: popup.html }} />
      {popup.noteId && (
        <a href={`#${popup.noteId}`} className="reader-popup-more" onClick={() => close(false)}>
          Show in references
        </a>
      )}
    </div>,
    document.body,
  );
}
