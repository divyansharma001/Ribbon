"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setSoundEnabled, soundEnabled } from "@/components/book/feedback";
import {
  DEFAULT_PREFS,
  MEASURE_LABELS,
  MEASURES,
  type ReaderPrefs,
  savePrefs,
  TEXT_SIZE_LABELS,
  TEXT_SIZES,
} from "@/lib/prefs";
import { isReadingMode } from "@/lib/reading-mode";
import { isTheme, THEME_LABELS, THEMES, type Theme } from "@/lib/themes";

export const SWATCHES: Record<Theme, string> = {
  light: "#fbfaf7",
  sepia: "#f4ecd8",
  dark: "#141312",
  system: "linear-gradient(135deg, #fbfaf7 50%, #141312 50%)",
};

/** The settings the page was drawn with (the server puts them on <html>). */
export function currentPrefs(): ReaderPrefs {
  const d = document.documentElement.dataset;
  return {
    theme: isTheme(d.theme) ? d.theme : DEFAULT_PREFS.theme,
    mode: isReadingMode(d.readingMode) ? d.readingMode : DEFAULT_PREFS.mode,
    textSize: TEXT_SIZES.find((t) => t === d.textSize) ?? DEFAULT_PREFS.textSize,
    measure: MEASURES.find((m) => m === d.measure) ?? DEFAULT_PREFS.measure,
  };
}

/** "Aa" menu: book or scroll, theme, text size, line width, and page sound. */
export function ThemePicker() {
  const router = useRouter();
  const menu = useRef<HTMLDivElement>(null);
  const [prefs, setPrefs] = useState<ReaderPrefs | null>(null);
  const [sound, setSound] = useState(true);

  useEffect(() => {
    setPrefs(currentPrefs());
    setSound(soundEnabled());
  }, []);

  const change = (p: Partial<ReaderPrefs>) => {
    setPrefs((old) => (old ? { ...old, ...p } : old));
    const saving = savePrefs(p);
    // Book and scroll are drawn differently on the server: show the other one once saved.
    if (p.mode) {
      document.documentElement.dataset.readingMode = p.mode;
      menu.current?.hidePopover();
      void saving.then(() => router.refresh());
    }
    saving.catch(() => {});
  };

  const toggleSound = () => {
    setSoundEnabled(!sound);
    setSound(!sound);
  };

  return (
    <>
      <button
        type="button"
        popoverTarget="theme-menu"
        className="flex size-10 items-center justify-center rounded-full font-serif text-[17px] font-semibold text-muted hover:bg-surface-muted hover:text-text"
        aria-label="Reading settings"
      >
        Aa
      </button>
      <div ref={menu} id="theme-menu" popover="auto" className="theme-menu">
        <p className="menu-heading">Reading</p>
        <div className="menu-segment">
          {(["book", "scroll"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={prefs?.mode === m}
              onClick={() => prefs?.mode !== m && change({ mode: m })}
              className={prefs?.mode === m ? "is-on" : ""}
            >
              {m === "book" ? "Book" : "Scroll"}
            </button>
          ))}
        </div>

        <p className="menu-heading">Text size</p>
        <div className="menu-segment text-size-segment">
          {TEXT_SIZES.map((t, i) => (
            <button
              key={t}
              type="button"
              aria-pressed={prefs?.textSize === t}
              aria-label={TEXT_SIZE_LABELS[t]}
              title={TEXT_SIZE_LABELS[t]}
              onClick={() => change({ textSize: t })}
              className={prefs?.textSize === t ? "is-on" : ""}
            >
              <span style={{ fontSize: `${12 + i * 2.5}px` }}>A</span>
            </button>
          ))}
        </div>

        {prefs?.mode === "scroll" && (
          <>
            <p className="menu-heading">Line width</p>
            <div className="menu-segment">
              {MEASURES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={prefs.measure === m}
                  onClick={() => change({ measure: m })}
                  className={prefs.measure === m ? "is-on" : ""}
                >
                  {MEASURE_LABELS[m]}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="menu-heading">Theme</p>
        <div>
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={prefs?.theme === t}
              onClick={() => change({ theme: t })}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted"
            >
              <span
                className="size-5 shrink-0 rounded-full border border-border"
                style={{ background: SWATCHES[t] }}
              />
              <span className="flex-1">{THEME_LABELS[t]}</span>
              {prefs?.theme === t && (
                <span className="text-accent" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="menu-divider" />
        {prefs?.mode === "book" && (
          <button
            type="button"
            role="switch"
            aria-checked={sound}
            onClick={toggleSound}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted"
          >
            <span className="flex-1">Page-turn sound</span>
            <span className="menu-switch" data-on={sound ? "true" : "false"} aria-hidden="true" />
          </button>
        )}
        <Link
          href="/settings"
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-accent hover:bg-surface-muted"
          onClick={() => menu.current?.hidePopover()}
        >
          All settings
        </Link>
      </div>
    </>
  );
}
