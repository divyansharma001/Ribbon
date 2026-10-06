"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type Device, getDevice } from "@/lib/reading/device";
import {
  awayLabel,
  type FocusRun,
  GRACE_MS,
  newRun,
  RUN_KEY,
  restoreRun,
  resume,
} from "@/lib/reading/focus";
import {
  type BlockRef,
  type DevicePosition,
  newestSpot,
  pickCurrentBlock,
  type ReadingSpot,
  readingLine,
  readThresholdMs,
  resolveSpot,
  scrollTargetFor,
  timeAgo,
} from "@/lib/reading/logic";
import { ACTIVE_SECONDS_EVENT, FOCUS_RUN_EVENT, getReadingSurface, SURFACE_MOVED } from "./surface";

export interface OtherDeviceSpot extends DevicePosition {
  chapterTitle: string;
  sectionTitle: string;
}

interface ReadingTrackerProps {
  bookId: string;
  chapterId: string;
  /** This device's last saved spot in the book (any chapter), from the server. */
  saved: ReadingSpot | null;
  /** A newer spot from another device, if any. */
  otherDevice: OtherDeviceSpot | null;
  /** Strict focus: leaving restarts the run that counts towards the daily goal. */
  strict?: boolean;
}

const SEND_EVERY_MS = 5000;
const LOCAL_SAVE_EVERY_MS = 1000;
const ACTIVE_WINDOW_MS = 60_000;
/** Reading for this long without touching anything still counts as "reading here". */
const DWELL_ENGAGE_MS = 8000;

const localKey = (bookId: string) => `ribbon:pos:${bookId}`;

function readLocal(bookId: string): ReadingSpot | null {
  try {
    return JSON.parse(localStorage.getItem(localKey(bookId)) ?? "null") as ReadingSpot | null;
  } catch {
    return null;
  }
}

function writeLocal(bookId: string, spot: ReadingSpot) {
  try {
    localStorage.setItem(localKey(bookId), JSON.stringify(spot));
  } catch {
    // Storage full or blocked: the server copy still works.
  }
}

function sendProgress(payload: unknown, closing: boolean): Promise<boolean> {
  const body = JSON.stringify(payload);
  try {
    return fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: closing,
      credentials: "same-origin",
    }).then(
      (r) => r.ok,
      () => false,
    );
  } catch {
    // Some browsers throw on keepalive bodies; fall back to a beacon.
    const ok = navigator.sendBeacon?.(
      "/api/progress",
      new Blob([body], { type: "application/json" }),
    );
    return Promise.resolve(Boolean(ok));
  }
}

/**
 * Tracks where you are in the chapter, saves it (locally and to the server),
 * brings you back to your spot when you return, and offers a newer spot
 * from another device.
 */
export function ReadingTracker({
  bookId,
  chapterId,
  saved,
  otherDevice,
  strict = false,
}: ReadingTrackerProps) {
  const [banner, setBanner] = useState<OtherDeviceSpot | null>(otherDevice);
  // Shown for a few seconds after coming back from somewhere else.
  const [awayNote, setAwayNote] = useState<string | null>(null);
  const strictRef = useRef(strict);
  strictRef.current = strict;
  useEffect(() => {
    if (!awayNote) return;
    const t = window.setTimeout(() => setAwayNote(null), 6000);
    return () => window.clearTimeout(t);
  }, [awayNote]);
  const deviceRef = useRef<Device | null>(null);

  // In book mode, turning a page means the reader chose where to read: the offer goes away.
  const showing = banner !== null;
  useEffect(() => {
    if (!showing) return;
    const surface = getReadingSurface();
    if (!surface) return;
    let stop = () => {};
    // Wait until the book has opened on its first page, then watch for a turn.
    const start = window.setTimeout(() => {
      const first = surface.page();
      const onMove = () => {
        if (surface.page() !== first) setBanner(null);
      };
      window.addEventListener(SURFACE_MOVED, onMove);
      stop = () => window.removeEventListener(SURFACE_MOVED, onMove);
    }, 1500);
    return () => {
      window.clearTimeout(start);
      stop();
    };
  }, [showing]);

  useEffect(() => {
    const device = getDevice();
    deviceRef.current = device;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-block-id]"));
    const refs: BlockRef[] = elements.map((el) => ({
      id: el.dataset.blockId ?? "",
      hash: el.dataset.hash ?? "",
      section: el.dataset.section ?? "",
    }));
    const indexById = new Map(refs.map((r, i) => [r.id, i]));
    const wordsOf = (i: number) => Number(elements[i]?.dataset.words ?? 0);
    const line = () => readingLine(window.innerHeight);

    // ---------------------------------------------------------------------
    // 1. Come back to the saved spot (unless the URL points somewhere).
    // ---------------------------------------------------------------------
    const local = readLocal(bookId);
    const best = newestSpot(saved, local);
    // A spot saved locally but never sent (offline, closed too fast): send it now.
    if (local && best === local && local !== saved) {
      void sendProgress(
        {
          bookId,
          chapterId: local.chapterId,
          device,
          position: {
            blockId: local.blockId,
            blockHash: local.blockHash,
            offset: local.offset,
            readAt: local.readAt,
          },
        },
        false,
      );
    }

    let resumeEl: HTMLElement | null = null;
    let restoreScrollY: number | null = null;
    // In book mode the book shows pages instead of scrolling; it tells us where we are.
    let restorePage: number | null = null;
    const restore = () => {
      if (location.hash || !best || best.chapterId !== chapterId) return;
      const found = resolveSpot(best, refs);
      const i = found ? indexById.get(found.blockId) : undefined;
      const el = i === undefined ? undefined : elements[i];
      if (!found || !el) return;
      const surface = getReadingSurface();
      if (surface) {
        surface.goto(el, found.exact ? best.offset : 0);
        restorePage = surface.page();
        resumeEl = el;
        el.style.setProperty("--resume-at", `${(found.exact ? best.offset : 0) * 100}%`);
        el.dataset.resume = "shown";
        return;
      }
      const target = scrollTargetFor(
        window.scrollY,
        el.getBoundingClientRect(),
        found.exact ? best.offset : 0,
        line(),
      );
      window.scrollTo({ top: target, behavior: "instant" });
      restoreScrollY = window.scrollY;
      resumeEl = el;
      // The label sits at the exact line where you stopped, not at the block's top.
      el.style.setProperty("--resume-at", `${(found.exact ? best.offset : 0) * 100}%`);
      el.dataset.resume = "shown";
    };

    // ---------------------------------------------------------------------
    // 2. Track the current spot, reads, and the session.
    // ---------------------------------------------------------------------
    let cancelled = false;
    let current: { index: number; offset: number } | null = null;
    let spot: ReadingSpot | null = null;
    let lastSentSpot = "";
    let lastLocalSave = 0;
    let engaged = false;
    let lastActivity = Date.now();
    let visibleSince = Date.now();
    const pendingReads = new Set<string>();
    const doneReads = new Set<string>();
    const visibleMs = new Map<number, number>();
    const onScreen = new Set<number>();
    // Ribbon is "here" when its tab is showing and it has focus. Focus inside the
    // music player (an iframe on this page) still counts as here.
    const here = () =>
      document.visibilityState === "visible" &&
      (document.hasFocus() || document.activeElement instanceof HTMLIFrameElement);
    let run: FocusRun = (() => {
      try {
        return restoreRun(sessionStorage.getItem(RUN_KEY), Date.now());
      } catch {
        return newRun(Date.now());
      }
    })();
    let lastSentRun = -1;
    const saveRun = () => {
      try {
        sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
      } catch {
        // Storage blocked: the run still lasts for this page.
      }
    };
    let awaySince: number | null = null;
    const leave = () => {
      if (awaySince !== null || here()) return;
      awaySince = Date.now();
      saveRun();
    };
    const comeBack = () => {
      if (awaySince === null || !here()) return;
      const now = Date.now();
      const away = now - awaySince;
      awaySince = null;
      const next = resume(run, away, now);
      if (next.broken) send(false); // save the finished run before starting the next
      run = next.run;
      saveRun();
      if (away > GRACE_MS) {
        setAwayNote(
          strictRef.current && next.broken
            ? `You were away ${awayLabel(away)}, so your focus run restarted.`
            : `Away ${awayLabel(away)}. That time wasn't counted.`,
        );
      }
    };

    const session = {
      id: crypto.randomUUID(),
      startedAt: "",
      startBlockId: "",
      activeSeconds: 0,
      lastSentActive: -1,
    };

    const measure = () => {
      // During navigation to another page the old blocks are detached; measuring them is meaningless.
      if (cancelled || !elements[0]?.isConnected) return;
      const surface = getReadingSurface();
      current = surface
        ? surface.current()
        : pickCurrentBlock(
            elements.length,
            (i) => elements[i]?.getBoundingClientRect() ?? { top: 0, height: 0 },
            line(),
          );
      if (!current || !engaged) return;
      const ref = refs[current.index];
      if (!ref) return;
      spot = {
        chapterId,
        blockId: ref.id,
        blockHash: ref.hash,
        offset: Math.round(current.offset * 1000) / 1000,
        readAt: new Date().toISOString(),
      };
      if (!session.startedAt) {
        session.startedAt = spot.readAt;
        session.startBlockId = ref.id;
      }
      const now = Date.now();
      if (now - lastLocalSave >= LOCAL_SAVE_EVERY_MS) {
        lastLocalSave = now;
        writeLocal(bookId, spot);
      }
      // Fade the "You stopped here" marker once the reader has moved on.
      const surfaceNow = getReadingSurface();
      if (resumeEl?.dataset.resume === "shown" && surfaceNow && restorePage !== null) {
        if (surfaceNow.page() !== restorePage) resumeEl.dataset.resume = "faded";
      } else if (resumeEl?.dataset.resume === "shown" && restoreScrollY !== null) {
        if (Math.abs(window.scrollY - restoreScrollY) > window.innerHeight * 0.6) {
          resumeEl.dataset.resume = "faded";
        }
      }
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    const onActivity = (event?: Event) => {
      // Taps on the top bar, contents drawer, or banner are not reading.
      const target = event?.target;
      if (target instanceof Element && target.closest("header, dialog, .resume-banner")) return;
      lastActivity = Date.now();
      if (!engaged) {
        engaged = true;
        measure();
      }
    };

    const send = (closing: boolean) => {
      if (!spot) return;
      writeLocal(bookId, spot);
      const spotKey = `${spot.blockId}:${spot.offset}`;
      const changed =
        spotKey !== lastSentSpot ||
        pendingReads.size > 0 ||
        session.activeSeconds !== session.lastSentActive ||
        Math.round(run.seconds) !== lastSentRun;
      if (!changed) return;
      const reads = [...pendingReads];
      const payload = {
        bookId,
        chapterId,
        device,
        position: {
          blockId: spot.blockId,
          blockHash: spot.blockHash,
          offset: spot.offset,
          readAt: spot.readAt,
        },
        session: {
          id: session.id,
          startedAt: session.startedAt,
          endedAt: new Date().toISOString(),
          startBlockId: session.startBlockId,
          endBlockId: spot.blockId,
          activeSeconds: Math.round(session.activeSeconds),
        },
        reads,
        ...(run.seconds >= 1
          ? { run: { id: run.id, startedAt: run.startedAt, seconds: Math.round(run.seconds) } }
          : {}),
      };
      lastSentRun = Math.round(run.seconds);
      const sentActive = session.activeSeconds;
      lastSentSpot = spotKey;
      session.lastSentActive = sentActive;
      for (const r of reads) pendingReads.delete(r);
      void sendProgress(payload, closing).then((ok) => {
        if (ok) return;
        // Try again next time.
        lastSentSpot = "";
        for (const r of reads) pendingReads.add(r);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = indexById.get((entry.target as HTMLElement).dataset.blockId ?? "");
          if (i === undefined) continue;
          const mostlyVisible =
            entry.intersectionRatio >= 0.6 ||
            entry.intersectionRect.height >= window.innerHeight * 0.5;
          if (entry.isIntersecting && mostlyVisible) onScreen.add(i);
          else onScreen.delete(i);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.6, 0.75, 1] },
    );

    let lastTick = Date.now();
    let sinceSend = 0;
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.min(now - lastTick, 2000);
      lastTick = now;
      // Only time with Ribbon in front of you counts: not a background tab, not another app.
      if (!here()) {
        leave();
        return;
      }
      comeBack();
      if (!engaged && now - visibleSince >= DWELL_ENGAGE_MS) onActivity();
      if (!engaged) return;
      if (now - lastActivity < ACTIVE_WINDOW_MS) {
        session.activeSeconds += elapsed / 1000;
        run.seconds += elapsed / 1000;
      }
      run.lastHereAt = now;
      saveRun();
      window.dispatchEvent(new CustomEvent(FOCUS_RUN_EVENT, { detail: run.seconds }));
      session.activeSeconds = Math.round(session.activeSeconds * 10) / 10;
      // Lets the top bar's goal ring fill live while reading.
      window.dispatchEvent(
        new CustomEvent(ACTIVE_SECONDS_EVENT, { detail: session.activeSeconds }),
      );
      for (const i of onScreen) {
        const ref = refs[i];
        if (!ref || doneReads.has(ref.id)) continue;
        const total = (visibleMs.get(i) ?? 0) + elapsed;
        visibleMs.set(i, total);
        if (total >= readThresholdMs(wordsOf(i))) {
          doneReads.add(ref.id);
          pendingReads.add(ref.id);
        }
      }
      sinceSend += elapsed;
      if (sinceSend >= SEND_EVERY_MS) {
        sinceSend = 0;
        send(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        leave();
        send(true);
      } else {
        visibleSince = Date.now();
        comeBack();
      }
    };
    // Focus moving into the music player's iframe also fires blur; check once it has settled.
    const onBlur = () => window.setTimeout(leave, 0);
    const onFocus = () => comeBack();
    const onPageHide = () => send(true);

    let interval = 0;
    const start = () => {
      if (cancelled) return;
      restore();
      measure();
      for (const el of elements) observer.observe(el);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener(SURFACE_MOVED, onScroll);
      for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const) {
        window.addEventListener(type, onActivity, { passive: true });
      }
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("blur", onBlur);
      window.addEventListener("focus", onFocus);
      window.addEventListener("pagehide", onPageHide);
      interval = window.setInterval(tick, 1000);
    };
    // Wait for fonts so block heights are final before scrolling.
    void document.fonts.ready.then(start, start);

    return () => {
      cancelled = true;
      send(true);
      window.clearInterval(interval);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(SURFACE_MOVED, onScroll);
      for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const) {
        window.removeEventListener(type, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [bookId, chapterId, saved]);

  const note =
    awayNote &&
    createPortal(
      <p className="hl-toast away-note" role="status">
        {awayNote}
      </p>,
      document.body,
    );
  if (!banner) return note || null;
  const sameChapter = banner.chapterId === chapterId;
  const href = sameChapter
    ? `#${banner.blockId}`
    : `/books/${bookId}/${banner.chapterId}#${banner.blockId}`;
  return (
    <>
      {note}
      <div className="resume-banner" role="status">
        <p className="min-w-0 flex-1 text-sm leading-snug text-pretty">
          You were at <span className="font-semibold">{banner.sectionTitle}</span>
          {!sameChapter && <span className="text-muted"> ({banner.chapterTitle})</span>} on{" "}
          {banner.deviceLabel},{" "}
          {/* Server and browser may be a minute apart; either answer is fine. */}
          <time dateTime={banner.readAt} suppressHydrationWarning>
            {timeAgo(banner.readAt)}
          </time>
          .
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {sameChapter ? (
            <a href={href} onClick={() => setBanner(null)} className="resume-banner-jump">
              Jump there
            </a>
          ) : (
            <Link
              href={href as `/books/${string}`}
              onClick={() => setBanner(null)}
              className="resume-banner-jump"
            >
              Jump there
            </Link>
          )}
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-text"
            aria-label="Dismiss"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
