/*
 * Pure "where was I" logic, shared by the browser tracker and the server.
 * No DOM or database access here, so it is easy to test.
 */

/** A saved reading spot. */
export interface ReadingSpot {
  chapterId: string;
  blockId: string;
  blockHash: string;
  /** How far into the block the reading line is, 0 to 1. */
  offset: number;
  /** ISO time when the reader was at this spot. */
  readAt: string;
}

export interface DevicePosition extends ReadingSpot {
  deviceId: string;
  deviceLabel: string;
}

/** The reading line sits about 20% down the screen, but always below the top bar. */
export function readingLine(viewportHeight: number, topBar = 56): number {
  return Math.max(topBar + 16, Math.round(viewportHeight * 0.2));
}

export interface BlockBox {
  top: number;
  height: number;
}

/**
 * Finds the block under the reading line, and how far into it the line is.
 * `getBox(i)` returns block i's box relative to the viewport. Blocks are in
 * page order, so a binary search only measures a handful of them.
 * When the line falls in a gap between blocks, the block above it wins.
 */
export function pickCurrentBlock(
  count: number,
  getBox: (index: number) => BlockBox,
  line: number,
): { index: number; offset: number } | null {
  if (count === 0) return null;
  let lo = 0;
  let hi = count - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (getBox(mid).top <= line) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === -1) return { index: 0, offset: 0 };
  const box = getBox(found);
  const offset = box.height > 0 ? clamp01((line - box.top) / box.height) : 0;
  return { index: found, offset };
}

/** Where to scroll so the reading line lands `offset` of the way into a block. */
export function scrollTargetFor(
  scrollY: number,
  box: BlockBox,
  offset: number,
  line: number,
): number {
  return Math.max(0, Math.round(scrollY + box.top + clamp01(offset) * box.height - line));
}

/** How long a block must be on screen to count as read: about 720 words a minute, at least 1.5s. */
export function readThresholdMs(words: number): number {
  return Math.max(1500, Math.round((words / 12) * 1000));
}

/** The section anchor a top-level block id belongs to ("sec_x.3" -> "sec_x"). */
export function sectionOfBlockId(blockId: string): string {
  const dot = blockId.lastIndexOf(".");
  return dot === -1 ? blockId : blockId.slice(0, dot);
}

export interface BlockRef {
  id: string;
  hash: string;
  section: string;
}

/**
 * Finds a saved spot on the page: by block id, then by text fingerprint
 * (ids can change when the book is re-imported), then by its section.
 * Returns the block id to use and whether the offset still applies.
 */
export function resolveSpot(
  spot: Pick<ReadingSpot, "blockId" | "blockHash">,
  blocks: readonly BlockRef[],
): { blockId: string; exact: boolean } | null {
  if (blocks.some((b) => b.id === spot.blockId)) return { blockId: spot.blockId, exact: true };
  const byHash = blocks.find((b) => b.hash === spot.blockHash);
  if (byHash) return { blockId: byHash.id, exact: true };
  const section = sectionOfBlockId(spot.blockId);
  const bySection = blocks.find((b) => b.section === section);
  return bySection ? { blockId: bySection.id, exact: false } : null;
}

/** The newest of several spots (null-safe). */
export function newestSpot<T extends ReadingSpot>(...spots: (T | null | undefined)[]): T | null {
  let best: T | null = null;
  for (const s of spots)
    if (s && (!best || Date.parse(s.readAt) > Date.parse(best.readAt))) best = s;
  return best;
}

/**
 * Should we offer "You were at X on your other device"?
 * Only when another device read more recently, at a different spot.
 */
export function otherDeviceSpot(
  thisDevice: DevicePosition | null,
  newest: DevicePosition | null,
  thisDeviceId: string | null,
): DevicePosition | null {
  if (!newest || newest.deviceId === thisDeviceId) return null;
  if (!thisDevice) return newest;
  if (Date.parse(newest.readAt) <= Date.parse(thisDevice.readAt)) return null;
  const sameSpot =
    newest.chapterId === thisDevice.chapterId && newest.blockId === thisDevice.blockId;
  return sameSpot ? null : newest;
}

/** "just now", "5 min ago", "2h ago", "yesterday", "3 days ago". Numbers never wrap away from units. */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}\u00a0min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}\u00a0days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A short device name from a user agent, e.g. "iPhone · Safari" or "Mac · Chrome". */
export function deviceLabelFromUserAgent(ua: string): string {
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X|Macintosh/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "Device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\/|FxiOS/.test(ua)
      ? "Firefox"
      : /Chrome\/|CriOS/.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${os} · ${browser}`;
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
