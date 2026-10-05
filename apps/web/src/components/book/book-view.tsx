"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/diagrams/use-steps";
import { SURFACE_MOVED, setReadingSurface } from "../reader/surface";
import { hapticTap, playPageTurn } from "./feedback";
import {
  type BookGeometry,
  bookGeometry,
  type Fragment,
  firstBlockOnPage,
  lastStart,
  offsetAtPage,
  pageAt,
  pageForOffset,
  spreadStart,
} from "./geometry";

const FLIP_MS = 680;
const FLIP_EASE = "cubic-bezier(0.32, 0.72, 0.22, 1)";

interface BookViewProps {
  chapterLabel: string;
  prevHref: string | null;
  nextHref: string | null;
  children: ReactNode;
}

/** A turn in progress: which pages show where, and the flipper's start and end angle. */
interface Turn {
  dir: 1 | -1;
  target: number;
  from: number;
  to: number;
}

/**
 * Shows a chapter as a book: two pages side by side on wide screens, one on
 * phones, with a 3D page turn. The live text is one CSS-column flow; during a
 * turn, static copies of it fill the turning page and the page underneath.
 */
export function BookView({ chapterLabel, prevHref, nextHref, children }: BookViewProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const deskRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const flipperRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const underRef = useRef<HTMLDivElement>(null);

  const [geo, setGeo] = useState<BookGeometry | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const pageRef = useRef(0);
  const countRef = useRef(1);
  const geoRef = useRef<BookGeometry | null>(null);
  const turning = useRef<Turn | null>(null);
  const animation = useRef<Animation | null>(null);
  const copies = useRef<HTMLElement | null>(null);
  /** The paragraph at the top of the current page, so any re-layout keeps the reader there. */
  const anchor = useRef<{ el: HTMLElement; offset: number } | null>(null);

  // ---------------------------------------------------------------------------
  // Size the book to the window.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    document.documentElement.classList.add("book-mode");
    let timer = 0;
    const update = () => setGeo(bookGeometry(window.innerWidth, window.innerHeight));
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 120);
    };
    update();
    window.addEventListener("resize", onResize);
    return () => {
      document.documentElement.classList.remove("book-mode");
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
    };
  }, []);

  const blocks = useCallback(
    () => Array.from(flowRef.current?.querySelectorAll<HTMLElement>("[data-block-id]") ?? []),
    [],
  );

  /** The pieces of an element on each page, in order. */
  const fragmentsOf = useCallback((el: Element): Fragment[] => {
    const flow = flowRef.current;
    const g = geoRef.current;
    if (!flow || !g) return [];
    const origin = flow.getBoundingClientRect().left;
    return Array.from(el.getClientRects())
      .filter((r) => r.height > 0)
      .map((r) => ({ page: pageAt(r.left, origin, g.pageW), height: r.height }));
  }, []);

  /** The block at the top of a page, and how far into it the page starts. */
  const topOf = useCallback(
    (page: number): { el: HTMLElement; offset: number; index: number } | null => {
      const list = blocks();
      if (list.length === 0) return null;
      const index = firstBlockOnPage(
        list.length,
        (j) => fragmentsOf(list[j] as HTMLElement).at(-1)?.page ?? 0,
        page,
      );
      const el = list[index];
      return el ? { el, offset: offsetAtPage(fragmentsOf(el), page), index } : null;
    },
    [blocks, fragmentsOf],
  );

  /** Moves the live text to a page with no animation. */
  const show = useCallback(
    (target: number, keep?: { el: HTMLElement; offset: number }) => {
      const g = geoRef.current;
      const flow = flowRef.current;
      if (!g || !flow) return;
      const start = Math.min(
        Math.max(0, spreadStart(target, g.spread)),
        lastStart(countRef.current, g.spread),
      );
      pageRef.current = start;
      flow.style.transform = `translateX(${-start * g.pageW}px)`;
      anchor.current = keep ?? topOf(start);
      setPage(start);
      window.dispatchEvent(new Event(SURFACE_MOVED));
    },
    [topOf],
  );

  /** Shows the page holding a point inside an element. */
  const goto = useCallback(
    (el: HTMLElement, offset: number) =>
      show(pageForOffset(fragmentsOf(el), offset), { el, offset }),
    [fragmentsOf, show],
  );

  /** Counts pages again (after a resize, fonts, or figures loading) and stays on the same paragraph. */
  const relayout = useCallback(() => {
    const flow = flowRef.current;
    const g = geoRef.current;
    if (!flow || !g) return;
    copies.current = null;
    const end = flow.querySelector("[data-book-end]");
    const origin = flow.getBoundingClientRect().left;
    const last = end ? pageAt(end.getBoundingClientRect().left, origin, g.pageW) : 0;
    countRef.current = last + 1;
    setPageCount(last + 1);
    const keep = anchor.current;
    if (keep?.el.isConnected) goto(keep.el, keep.offset);
    else show(pageRef.current);
  }, [goto, show]);

  // ---------------------------------------------------------------------------
  // Lay out pages whenever the size changes, keeping the reader's place.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (!geo) return;
    const flow = flowRef.current;
    if (!flow) return;
    geoRef.current = geo;
    const desk = deskRef.current;
    if (desk) {
      desk.style.setProperty("--page-w", `${geo.pageW}px`);
      desk.style.setProperty("--page-h", `${geo.pageH}px`);
      desk.style.setProperty("--pad-x", `${geo.padX}px`);
      desk.style.setProperty("--pad-top", `${geo.padTop}px`);
      desk.style.setProperty("--pad-bottom", `${geo.padBottom}px`);
      desk.style.setProperty("--book-font", `${geo.fontSize}px`);
    }
    // Figures load as soon as the chapter opens, so turning never shows a gap.
    for (const img of flow.querySelectorAll("img")) img.loading = "eager";
    relayout();
    // Fonts and figures change the layout when they arrive; count pages again then.
    void document.fonts.ready.then(relayout);
    let timer = 0;
    const onLoad = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(relayout, 60);
    };
    // A figure that fails to load also changes its size.
    flow.addEventListener("load", onLoad, true);
    flow.addEventListener("error", onLoad, true);
    return () => {
      flow.removeEventListener("load", onLoad, true);
      flow.removeEventListener("error", onLoad, true);
      window.clearTimeout(timer);
    };
  }, [geo, relayout]);

  // ---------------------------------------------------------------------------
  // Tell the position tracker where we are, and let it bring us back.
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    setReadingSurface({
      page: () => pageRef.current,
      goto,
      current: () => {
        const top = topOf(pageRef.current);
        return top ? { index: top.index, offset: top.offset } : null;
      },
    });
    return () => setReadingSurface(null);
  }, [goto, topOf]);

  // ---------------------------------------------------------------------------
  // Page turns.
  // ---------------------------------------------------------------------------

  /** Static copies of the text for the turning page and the page underneath. */
  const copyFor = useCallback((holder: HTMLElement | null, target: number | null) => {
    const g = geoRef.current;
    const flow = flowRef.current;
    if (!holder || !g || !flow) return;
    holder.replaceChildren();
    if (target === null || target < 0 || target >= countRef.current) return;
    if (!copies.current) {
      const copy = flow.cloneNode(true) as HTMLElement;
      // Copies must not repeat ids or look like real blocks to the tracker.
      for (const el of copy.querySelectorAll("[id], [data-block-id]")) {
        el.removeAttribute("id");
        el.removeAttribute("data-block-id");
      }
      copy.removeAttribute("data-book-flow");
      copies.current = copy;
    }
    const copy = copies.current.cloneNode(true) as HTMLElement;
    copy.style.transform = `translateX(${-target * g.pageW}px)`;
    holder.append(copy);
  }, []);

  const setFlipper = useCallback((angle: number) => {
    const flipper = flipperRef.current;
    if (flipper) flipper.style.transform = `rotateY(${angle}deg)`;
    // Shade the turning page as it tilts away from the light.
    const tilt = Math.sin((Math.abs(angle) * Math.PI) / 180);
    frontRef.current?.style.setProperty("--shade", String(tilt * 0.45));
    backRef.current?.style.setProperty("--shade", String(tilt * 0.45));
    underRef.current?.style.setProperty("--shade", String((1 - Math.abs(angle) / 180) * 0.35));
  }, []);

  /** Sets up a turn: fills the turning page and the page underneath. Returns null at the ends. */
  const beginTurn = useCallback(
    (dir: 1 | -1): Turn | null => {
      const g = geoRef.current;
      const flipper = flipperRef.current;
      const under = underRef.current;
      if (!g || !flipper || !under || turning.current) return null;
      const k = pageRef.current;
      const step = g.spread ? 2 : 1;
      const target = k + dir * step;
      if (target < 0 || target > lastStart(countRef.current, g.spread)) return null;

      const W = g.pageW;
      let turn: Turn;
      if (g.spread && dir === 1) {
        // Right page lifts and lands on the left. Underneath on the right: the page after.
        copyFor(frontRef.current, k + 1);
        copyFor(backRef.current, k + 2);
        copyFor(under, k + 3);
        flipper.dataset.side = "right";
        under.dataset.side = "right";
        turn = { dir, target, from: 0, to: -180 };
      } else if (g.spread) {
        // Left page lifts and lands on the right. Underneath on the left: the page before.
        copyFor(frontRef.current, k);
        copyFor(backRef.current, k - 1);
        copyFor(under, k - 2);
        flipper.dataset.side = "left";
        under.dataset.side = "left";
        turn = { dir, target, from: 0, to: 180 };
      } else if (dir === 1) {
        // One page: the current page lifts away to the left, the next one is already underneath.
        copyFor(frontRef.current, k);
        copyFor(backRef.current, null);
        copyFor(under, null);
        flipper.dataset.side = "single";
        under.dataset.side = "none";
        show(target);
        turn = { dir, target, from: 0, to: -180 };
      } else {
        // One page, going back: the previous page swings in from the left.
        copyFor(frontRef.current, k - 1);
        copyFor(backRef.current, null);
        copyFor(under, null);
        flipper.dataset.side = "single";
        under.dataset.side = "none";
        turn = { dir, target, from: -180, to: 0 };
      }
      flipper.style.width = `${W}px`;
      flipper.hidden = false;
      under.hidden = under.dataset.side === "none";
      setFlipper(turn.from);
      turning.current = turn;
      return turn;
    },
    [copyFor, setFlipper, show],
  );

  const endTurn = useCallback(
    (completed: boolean) => {
      const turn = turning.current;
      if (!turn) return;
      const g = geoRef.current;
      if (completed) show(turn.target);
      else if (g && !g.spread && turn.dir === 1) show(turn.target - 1); // undo the early move
      if (flipperRef.current) flipperRef.current.hidden = true;
      if (underRef.current) underRef.current.hidden = true;
      turning.current = null;
      animation.current = null;
    },
    [show],
  );

  /** Animates the flipper from one angle to another, then finishes the turn. */
  const animateTo = useCallback(
    (fromAngle: number, toAngle: number, completed: boolean) => {
      const flipper = flipperRef.current;
      if (!flipper || reduced) {
        endTurn(completed);
        return;
      }
      const distance = Math.abs(toAngle - fromAngle) / 180;
      const anim = flipper.animate(
        [{ transform: `rotateY(${fromAngle}deg)` }, { transform: `rotateY(${toAngle}deg)` }],
        { duration: Math.max(160, FLIP_MS * distance), easing: FLIP_EASE, fill: "forwards" },
      );
      // Keep the shading in step with the angle.
      const startTime = performance.now();
      const duration = Math.max(160, FLIP_MS * distance);
      const shade = () => {
        if (animation.current !== anim) return;
        const t = Math.min(1, (performance.now() - startTime) / duration);
        const eased = 1 - (1 - t) ** 3;
        setFlipper(fromAngle + (toAngle - fromAngle) * eased);
        if (t < 1) requestAnimationFrame(shade);
      };
      animation.current = anim;
      requestAnimationFrame(shade);
      anim.onfinish = () => {
        anim.cancel();
        endTurn(completed);
      };
    },
    [endTurn, reduced, setFlipper],
  );

  /** Turns one page (or spread) forward or back, or moves to the next or previous chapter. */
  const turn = useCallback(
    (dir: 1 | -1) => {
      if (turning.current) return;
      const t = beginTurn(dir);
      if (!t) {
        const href = dir === 1 ? nextHref : prevHref;
        if (href) router.push(href as Route);
        return;
      }
      playPageTurn();
      hapticTap();
      animateTo(t.from, t.to, true);
    },
    [animateTo, beginTurn, nextHref, prevHref, router],
  );

  // ---------------------------------------------------------------------------
  // Keys, trackpad and wheel, links.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable], dialog"))
        return;
      if (["ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        turn(1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        turn(-1);
      }
    };

    // Trackpad swipes and mouse wheels turn pages; small movements add up.
    let sum = 0;
    let quietUntil = 0;
    let reset = 0;
    const onWheel = (e: WheelEvent) => {
      if (
        (e.target as HTMLElement | null)?.closest("dialog, .reader-table-scroll, .reader-pre-wrap")
      )
        return;
      e.preventDefault();
      const now = performance.now();
      if (now < quietUntil) return;
      sum += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      window.clearTimeout(reset);
      reset = window.setTimeout(() => {
        sum = 0;
      }, 180);
      if (Math.abs(sum) > 70) {
        turn(sum > 0 ? 1 : -1);
        sum = 0;
        quietUntil = now + FLIP_MS + 120;
      }
    };

    // Links inside the chapter go to the right page instead of scrolling.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || e.defaultPrevented) return;
      const id = decodeURIComponent(link.getAttribute("href")?.slice(1) ?? "");
      const el = id ? document.getElementById(id) : null;
      if (!el || !flowRef.current?.contains(el)) return;
      e.preventDefault();
      history.replaceState(null, "", `#${id}`);
      goto(el, 0);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onWheel);
      document.removeEventListener("click", onClick);
      window.clearTimeout(reset);
    };
  }, [goto, turn]);

  // A link from another page (#block or #end) opens on the right page.
  useEffect(() => {
    if (!geo) return;
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    if (id === "end") show(countRef.current - 1);
    else {
      const el = document.getElementById(id);
      if (el && flowRef.current?.contains(el)) goto(el, 0);
    }
  }, [geo, goto, show]);

  // ---------------------------------------------------------------------------
  // Dragging a page (mouse from the outer edge, touch anywhere).
  // ---------------------------------------------------------------------------
  const drag = useRef<{
    x: number;
    startX: number;
    t: number;
    dir: 1 | -1;
    pointer: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = geoRef.current;
    if (!g || turning.current || e.button !== 0) return;
    if (
      (e.target as HTMLElement).closest(
        "a, button, .diagram, .reader-table-scroll, .reader-pre-wrap",
      )
    )
      return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const edge = Math.min(120, rect.width * 0.14);
    const nearRight = x > rect.width - edge;
    const nearLeft = x < edge;
    if (e.pointerType === "mouse" && !nearRight && !nearLeft) return; // leave text selection alone
    const dir: 1 | -1 =
      e.pointerType === "mouse" ? (nearRight ? 1 : -1) : x > rect.width / 2 ? 1 : -1;
    drag.current = {
      x: e.clientX,
      startX: e.clientX,
      t: performance.now(),
      dir,
      pointer: e.pointerId,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const g = geoRef.current;
    if (!d || !g || e.pointerId !== d.pointer) return;
    const dx = e.clientX - d.startX;
    if (!turning.current) {
      // Start the turn once the finger clearly moves in the turning direction.
      const towards = d.dir === 1 ? -dx : dx;
      if (towards < 12) return;
      const t = beginTurn(d.dir);
      if (!t) {
        drag.current = null;
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const t = turning.current;
    if (!t) return;
    const travel = (g.spread ? g.pageW * 2 : g.pageW) * 0.9;
    const progress = Math.min(1, Math.max(0, (d.dir === 1 ? -dx : dx) / travel));
    d.x = e.clientX;
    setFlipper(t.from + (t.to - t.from) * progress);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    const t = turning.current;
    const g = geoRef.current;
    if (!d || !g) return;
    if (!t) {
      // A tap near an edge (no drag) turns the page.
      if (Math.abs(e.clientX - d.startX) < 6 && performance.now() - d.t < 400) turn(d.dir);
      return;
    }
    const dx = e.clientX - d.startX;
    const travel = (g.spread ? g.pageW * 2 : g.pageW) * 0.9;
    const progress = Math.min(1, Math.max(0, (d.dir === 1 ? -dx : dx) / travel));
    const speed = Math.abs(dx) / Math.max(1, performance.now() - d.t);
    const current = t.from + (t.to - t.from) * progress;
    const complete = progress > 0.33 || (speed > 0.6 && progress > 0.08);
    if (complete) {
      playPageTurn();
      hapticTap();
    }
    animateTo(current, complete ? t.to : t.from, complete);
  };

  // ---------------------------------------------------------------------------

  const spread = geo?.spread ?? false;
  const atStart = page === 0;
  const atEnd = page >= lastStart(pageCount, spread);
  const shown = spread ? `${page + 1}–${Math.min(page + 2, pageCount)}` : `${page + 1}`;

  return (
    <div ref={deskRef} className="book-desk" data-ready={geo ? "true" : "false"}>
      <div className="book-stage">
        <button
          type="button"
          className="book-arrow"
          data-side="left"
          onClick={() => turn(-1)}
          aria-label={atStart ? "Previous chapter" : "Previous page"}
          disabled={atStart && !prevHref}
        >
          <Chevron dir="left" />
        </button>

        <div
          className="book"
          data-spread={spread ? "true" : "false"}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="book-window">
            <div ref={flowRef} className="book-flow reader-body" data-book-flow="">
              {children}
              <span data-book-end="" aria-hidden="true" />
            </div>
          </div>
          {spread && <div className="book-spine" aria-hidden="true" />}
          <div ref={underRef} className="book-under" hidden aria-hidden="true" inert />
          <div ref={flipperRef} className="book-flipper" hidden aria-hidden="true" inert>
            <div ref={frontRef} className="book-face book-face-front" />
            <div ref={backRef} className="book-face book-face-back" />
          </div>
        </div>

        <button
          type="button"
          className="book-arrow"
          data-side="right"
          onClick={() => turn(1)}
          aria-label={atEnd ? "Next chapter" : "Next page"}
          disabled={atEnd && !nextHref}
        >
          <Chevron dir="right" />
        </button>
      </div>

      <footer className="book-footer">
        <span className="book-footer-label">{chapterLabel}</span>
        <span className="book-progress" aria-hidden="true">
          <span
            style={{ width: `${((page + (spread ? 2 : 1)) / Math.max(1, pageCount)) * 100}%` }}
          />
        </span>
        <span className="book-footer-pages">
          {atEnd && nextHref ? "Next chapter →" : `Page ${shown} of ${pageCount}`}
        </span>
      </footer>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
