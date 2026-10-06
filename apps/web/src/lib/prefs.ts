import { DEFAULT_READING_MODE, isReadingMode, type ReadingMode } from "./reading-mode";
import { DEFAULT_THEME, isTheme, type Theme } from "./themes";

/*
 * Reading settings that follow the account across devices. Shared by the
 * server (first paint) and the browser (changing them).
 */

export const TEXT_SIZES = ["small", "medium", "large", "larger"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
/** Multiplies the reader's base text size. */
export const TEXT_SCALE: Record<TextSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.1,
  larger: 1.22,
};
export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  larger: "Larger",
};

export const MEASURES = ["narrow", "medium", "wide"] as const;
export type Measure = (typeof MEASURES)[number];
/** Longest line in scroll mode. Book pages take their width from the screen instead. */
export const MEASURE_REM: Record<Measure, number> = { narrow: 38, medium: 46, wide: 54 };
export const MEASURE_LABELS: Record<Measure, string> = {
  narrow: "Narrow",
  medium: "Medium",
  wide: "Wide",
};

export interface ReaderPrefs {
  theme: Theme;
  mode: ReadingMode;
  textSize: TextSize;
  measure: Measure;
}

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: DEFAULT_THEME,
  mode: DEFAULT_READING_MODE,
  textSize: "medium",
  measure: "medium",
};

/** Cookie names: the fallback before the account has any saved settings, and on the login page. */
export const PREF_COOKIES: Record<keyof ReaderPrefs, string> = {
  theme: "ribbon-theme",
  mode: "ribbon-mode",
  textSize: "ribbon-text-size",
  measure: "ribbon-measure",
};

const isTextSize = (v: unknown): v is TextSize => TEXT_SIZES.includes(v as TextSize);
const isMeasure = (v: unknown): v is Measure => MEASURES.includes(v as Measure);

/** Keeps only valid values from anything (a cookie, a database row, a request). */
export function cleanPrefs(raw: unknown): Partial<ReaderPrefs> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Partial<ReaderPrefs> = {};
  if (typeof r.theme === "string" && isTheme(r.theme)) out.theme = r.theme;
  if (typeof r.mode === "string" && isReadingMode(r.mode)) out.mode = r.mode;
  if (isTextSize(r.textSize)) out.textSize = r.textSize;
  if (isMeasure(r.measure)) out.measure = r.measure;
  return out;
}

/** Puts the settings that change the page's look on <html>, at once. */
export function applyPrefs(p: Partial<ReaderPrefs>) {
  const html = document.documentElement;
  if (p.theme) html.dataset.theme = p.theme;
  if (p.textSize) html.dataset.textSize = p.textSize;
  if (p.measure) html.dataset.measure = p.measure;
}

/** Fired on window when a setting changes in this tab. */
export const PREFS_CHANGED = "ribbon:prefs-changed";

/** Saves settings to the account (and this device's cookies). Shows the change first. */
export async function savePrefs(p: Partial<ReaderPrefs>): Promise<void> {
  applyPrefs(p);
  window.dispatchEvent(new CustomEvent(PREFS_CHANGED, { detail: p }));
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error("Couldn't save settings");
}
