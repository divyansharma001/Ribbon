/*
 * Focus: reading only counts while Ribbon is in front of you. A "run" is
 * reading without leaving: stepping away for up to GRACE_MS (a glance at a
 * notification, changing the music) keeps it going; longer starts a new one.
 * In strict mode, the daily goal must be reached in a single run.
 */

/** How long you can step away before it counts as leaving. */
export const GRACE_MS = 10_000;
/** Where the current run is kept, so it carries across chapter pages. */
export const RUN_KEY = "ribbon-focus-run";

export interface FocusRun {
  id: string;
  startedAt: string;
  /** Active reading seconds in this run. */
  seconds: number;
  /** When the reader was last here (ms since epoch). */
  lastHereAt: number;
}

export function newRun(now: number): FocusRun {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date(now).toISOString(),
    seconds: 0,
    lastHereAt: now,
  };
}

/**
 * Coming back after being away for `awayMs`: the same run if it was short,
 * otherwise a fresh one. `broken` is true when a run with progress ended.
 */
export function resume(
  run: FocusRun,
  awayMs: number,
  now: number,
): { run: FocusRun; broken: boolean } {
  if (awayMs <= GRACE_MS) return { run: { ...run, lastHereAt: now }, broken: false };
  return { run: newRun(now), broken: run.seconds > 0 };
}

/** A saved run from storage, if it is still going (the reader left less than GRACE_MS ago). */
export function restoreRun(raw: string | null, now: number): FocusRun {
  try {
    const saved = raw ? (JSON.parse(raw) as Partial<FocusRun>) : null;
    if (
      saved &&
      typeof saved.id === "string" &&
      typeof saved.startedAt === "string" &&
      typeof saved.seconds === "number" &&
      typeof saved.lastHereAt === "number" &&
      now - saved.lastHereAt <= GRACE_MS
    ) {
      return { ...(saved as FocusRun), lastHereAt: now };
    }
  } catch {
    // Unreadable: start fresh.
  }
  return newRun(now);
}

/** "3 min", "45 sec": how long someone was away. */
export function awayLabel(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sec`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
