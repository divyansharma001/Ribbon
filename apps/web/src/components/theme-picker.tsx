"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setSoundEnabled, soundEnabled } from "@/components/book/feedback";
import { isReadingMode, READING_MODE_COOKIE, type ReadingMode } from "@/lib/reading-mode";
import { isTheme, THEME_COOKIE, THEME_LABELS, THEMES, type Theme } from "@/lib/themes";

const SWATCHES: Record<Theme, string> = {
  light: "#fbfaf7",
  sepia: "#f4ecd8",
  dark: "#141312",
  system: "linear-gradient(135deg, #fbfaf7 50%, #141312 50%)",
};

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
}

function writeCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: simple first-party preference cookies
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** "Aa" menu: book or scroll, theme, and page sound. Saved in cookies and local storage. */
export function ThemePicker() {
  const router = useRouter();
  const menu = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [mode, setMode] = useState<ReadingMode>("book");
  const [sound, setSound] = useState(true);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(isTheme(current) ? current : null);
    const savedMode = readCookie(READING_MODE_COOKIE);
    setMode(isReadingMode(savedMode) ? savedMode : "book");
    setSound(soundEnabled());
  }, []);

  const chooseTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    writeCookie(THEME_COOKIE, next);
    setTheme(next);
  };

  const chooseMode = (next: ReadingMode) => {
    if (next === mode) return;
    writeCookie(READING_MODE_COOKIE, next);
    setMode(next);
    menu.current?.hidePopover();
    router.refresh();
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
              aria-pressed={mode === m}
              onClick={() => chooseMode(m)}
              className={mode === m ? "is-on" : ""}
            >
              {m === "book" ? "Book" : "Scroll"}
            </button>
          ))}
        </div>

        <p className="menu-heading">Theme</p>
        <div>
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => chooseTheme(t)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted"
            >
              <span
                className="size-5 shrink-0 rounded-full border border-border"
                style={{ background: SWATCHES[t] }}
              />
              <span className="flex-1">{THEME_LABELS[t]}</span>
              {theme === t && (
                <span className="text-accent" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        {mode === "book" && (
          <>
            <div className="menu-divider" />
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
          </>
        )}
      </div>
    </>
  );
}
