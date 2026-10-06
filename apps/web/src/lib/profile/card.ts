import type { PublicStats } from "./data";
import { xml } from "./logic";

/*
 * Images for sharing: a profile card for a GitHub README and small single
 * badges. Plain SVG with system fonts, so they render anywhere images do.
 */

export type CardTheme = "light" | "dark";

const THEMES: Record<
  CardTheme,
  { bg: string; text: string; muted: string; border: string; accent: string; soft: string }
> = {
  light: {
    bg: "#fbfaf7",
    text: "#1f1d1a",
    muted: "#6b665e",
    border: "#e7e3da",
    accent: "#a8323e",
    soft: "#f6e6e7",
  },
  dark: {
    bg: "#1c1b19",
    text: "#e9e5dd",
    muted: "#a39d92",
    border: "#302d29",
    accent: "#e2737c",
    soft: "#3a2326",
  },
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/** A short mark for each badge, drawn in its circle. */
export const BADGE_MARKS: Record<string, string> = {
  "first-check": "✓",
  sharp: "◎",
  chapter: "▤",
  perfect: "★",
  week: "7",
  month: "30",
  hundred: "100",
  reviewer: "↻",
  hours: "10h",
};

const RIBBON = "M0 0h12v17l-6-4.4L0 17z";

function shorten(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The README card: level, streak, chapters, accuracy, hours, and earned badges. */
export function profileCardSvg(s: PublicStats, theme: CardTheme): string {
  const c = THEMES[theme];
  const W = 495;
  const H = 210;
  const earned = s.badges.filter((b) => b.earned);
  const stats = [
    [
      "Streak",
      `${s.currentStreak} ${s.currentStreak === 1 ? "day" : "days"}`,
      `best ${s.bestStreak}`,
    ],
    [
      "Chapters",
      s.book ? `${s.book.chaptersDone}/${s.book.chapters}` : "0",
      s.book ? `${Math.round(s.book.read * 100)}% read` : "",
    ],
    ["Accuracy", s.answered ? `${Math.round(s.accuracy * 100)}%` : "–", `${s.answered} answered`],
    ["Reading", `${s.hoursRead}h`, "in total"],
  ];
  const barW = W - 50;
  const filled = Math.max(4, Math.round(barW * s.level.progress));
  const title = `${s.displayName} on Ribbon: ${s.level.name}, ${s.currentStreak}-day streak`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${xml(title)}">
  <title>${xml(title)}</title>
  <style>text{font-family:${FONT}}</style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${c.bg}" stroke="${c.border}"/>
  <g transform="translate(25 20)"><path d="${RIBBON}" fill="${c.accent}"/></g>
  <text x="44" y="33" font-size="13" font-weight="700" fill="${c.accent}" letter-spacing="0.5">RIBBON</text>
  <text x="${W - 25}" y="33" font-size="13" fill="${c.muted}" text-anchor="end">${xml(shorten(s.displayName, 30))}</text>
  <text x="25" y="68" font-size="22" font-weight="700" fill="${c.text}">${xml(s.level.name)}</text>
  <text x="${W - 25}" y="68" font-size="12.5" fill="${c.muted}" text-anchor="end">Level ${s.level.index + 1} · ${s.level.xp.toLocaleString("en-US")} XP</text>
  <rect x="25" y="80" width="${barW}" height="6" rx="3" fill="${c.border}"/>
  <rect x="25" y="80" width="${filled}" height="6" rx="3" fill="${c.accent}"/>
  ${stats
    .map(([label, value, note], i) => {
      const x = 25 + i * ((W - 50) / 4);
      return `<text x="${x}" y="112" font-size="11" fill="${c.muted}">${xml(label ?? "")}</text>
  <text x="${x}" y="133" font-size="17" font-weight="700" fill="${c.text}">${xml(value ?? "")}</text>
  <text x="${x}" y="149" font-size="10.5" fill="${c.muted}">${xml(note ?? "")}</text>`;
    })
    .join("\n  ")}
  ${
    earned.length
      ? earned
          .map((b, i) => {
            const cx = 37 + i * 30;
            const mark = BADGE_MARKS[b.id] ?? "•";
            return `<g><title>${xml(b.name)}</title><circle cx="${cx}" cy="180" r="12" fill="${c.soft}"/><text x="${cx}" y="184" font-size="${mark.length > 2 ? 8 : 11}" font-weight="700" fill="${c.accent}" text-anchor="middle">${xml(mark)}</text></g>`;
          })
          .join("")
      : `<text x="25" y="184" font-size="11.5" fill="${c.muted}">No badges yet</text>`
  }
  <text x="${W - 25}" y="184" font-size="10.5" fill="${c.muted}" text-anchor="end">${xml(shorten(s.book?.title ?? "", 44))}</text>
</svg>`;
}

/** A small two-part badge, like the ones under many GitHub READMEs. */
export function smallBadgeSvg(message: string, color: string): string {
  const label = "Ribbon";
  const width = (t: string) => Math.round(t.length * 6.6 + 14);
  const lw = width(label);
  const mw = width(message);
  const W = lw + mw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="20" role="img" aria-label="${xml(`${label}: ${message}`)}">
  <title>${xml(`${label}: ${message}`)}</title>
  <clipPath id="r"><rect width="${W}" height="20" rx="4"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#3b3a38"/>
    <rect x="${lw}" width="${mw}" height="20" fill="${color}"/>
  </g>
  <g fill="#fff" font-family="Verdana, ${FONT}" font-size="11">
    <text x="${lw / 2}" y="14" text-anchor="middle">${label}</text>
    <text x="${lw + mw / 2}" y="14" text-anchor="middle">${xml(message)}</text>
  </g>
</svg>`;
}

/** The single badges a profile offers: a few headline ones plus each earned badge. */
export function badgeFor(s: PublicStats, id: string): { message: string; color: string } | null {
  if (id === "level") return { message: `Level: ${s.level.name}`, color: "#a8323e" };
  if (id === "streak")
    return { message: `${s.currentStreak}-day reading streak`, color: "#c2410c" };
  if (id === "book" && s.book) {
    return s.book.chaptersDone >= s.book.chapters
      ? { message: `Finished ${shorten(s.book.title, 40)}`, color: "#2f7d4f" }
      : {
          message: `${s.book.chaptersDone}/${s.book.chapters} chapters of ${shorten(s.book.title, 32)}`,
          color: "#2563eb",
        };
  }
  const badge = s.badges.find((b) => b.id === id && b.earned);
  return badge ? { message: badge.name, color: "#7c3aed" } : null;
}
