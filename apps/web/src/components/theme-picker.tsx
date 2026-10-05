"use client";

import { useEffect, useRef, useState } from "react";
import { isTheme, THEME_COOKIE, THEME_LABELS, THEMES, type Theme } from "@/lib/themes";

const SWATCHES: Record<Theme, string> = {
  bright: "linear-gradient(135deg, #6d4aff, #d43f8d 55%, #e0712c)",
  light: "#fbfaf7",
  sepia: "#f4ecd8",
  dark: "#141312",
  system: "linear-gradient(135deg, #fbfaf7 50%, #141312 50%)",
};

/** "Aa" button with a small menu to switch the reading theme. Saved in a cookie. */
export function ThemePicker() {
  const menu = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(isTheme(current) ? current : null);
  }, []);

  const choose = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    // biome-ignore lint/suspicious/noDocumentCookie: a simple first-party preference cookie
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
    menu.current?.hidePopover();
  };

  return (
    <>
      <button
        type="button"
        popoverTarget="theme-menu"
        className="flex size-10 items-center justify-center rounded-full font-serif text-[17px] font-semibold text-muted hover:bg-surface-muted hover:text-text"
        aria-label="Reading theme"
      >
        Aa
      </button>
      <div ref={menu} id="theme-menu" popover="auto" className="theme-menu" role="menu">
        <p className="px-3 pt-1 pb-2 text-xs font-semibold tracking-wide text-muted uppercase">
          Theme
        </p>
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            role="menuitemradio"
            aria-checked={theme === t}
            onClick={() => choose(t)}
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
    </>
  );
}
