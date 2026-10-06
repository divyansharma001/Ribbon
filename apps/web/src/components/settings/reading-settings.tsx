"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setSoundEnabled, soundEnabled } from "@/components/book/feedback";
import { SWATCHES } from "@/components/theme-picker";
import {
  MEASURE_LABELS,
  MEASURE_REM,
  MEASURES,
  type ReaderPrefs,
  savePrefs,
  TEXT_SCALE,
  TEXT_SIZE_LABELS,
  TEXT_SIZES,
} from "@/lib/prefs";
import { THEME_LABELS, THEMES } from "@/lib/themes";

function Segment<T extends string>({
  label,
  options,
  value,
  names,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  names: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="set-field">
      <legend className="set-label">{label}</legend>
      <div className="set-segment">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            className={value === o ? "is-on" : ""}
            onClick={() => onChange(o)}
          >
            {names[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Reading settings with a live preview. Saved to the account as they change. */
export function ReadingSettings({ initial }: { initial: ReaderPrefs }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [sound, setSound] = useState(true);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => setSound(soundEnabled()), []);

  const change = (p: Partial<ReaderPrefs>) => {
    setPrefs((old) => ({ ...old, ...p }));
    savePrefs(p)
      .then(() => {
        setStatus("saved");
        router.refresh();
      })
      .catch(() => setStatus("error"));
  };

  return (
    <div className="set-reading">
      <div className="set-controls">
        <Segment
          label="Layout"
          options={["book", "scroll"] as const}
          value={prefs.mode}
          names={{ book: "Book pages", scroll: "Scroll" }}
          onChange={(mode) => change({ mode })}
        />

        <fieldset className="set-field">
          <legend className="set-label">Theme</legend>
          <div className="set-themes">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={prefs.theme === t}
                className="set-theme"
                onClick={() => change({ theme: t })}
              >
                <span className="set-theme-swatch" style={{ background: SWATCHES[t] }} />
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <Segment
          label="Text size"
          options={TEXT_SIZES}
          value={prefs.textSize}
          names={TEXT_SIZE_LABELS}
          onChange={(textSize) => change({ textSize })}
        />

        <div>
          <Segment
            label="Line width"
            options={MEASURES}
            value={prefs.measure}
            names={MEASURE_LABELS}
            onChange={(measure) => change({ measure })}
          />
          <p className="set-hint">In book mode, pages take their width from your screen.</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={sound}
          className="goal-switch-row"
          onClick={() => {
            setSoundEnabled(!sound);
            setSound(!sound);
          }}
        >
          <span>
            <span className="goal-settings-label">Page-turn sound</span>
            <span className="goal-settings-hint">
              A soft paper sound in book mode. This device only.
            </span>
          </span>
          <span className="menu-switch" data-on={sound ? "true" : "false"} aria-hidden="true" />
        </button>

        <p className="set-status" role="status">
          {status === "saved"
            ? "Saved. Your other devices use these settings too."
            : status === "error"
              ? "Couldn't save. Check your connection and try again."
              : "Changes save as you make them, and follow you to your other devices."}
        </p>
      </div>

      <figure className="set-preview" aria-label="Preview">
        <div
          className="set-preview-text"
          style={{
            fontSize: `${19 * TEXT_SCALE[prefs.textSize]}px`,
            maxWidth: prefs.mode === "scroll" ? `${MEASURE_REM[prefs.measure]}rem` : undefined,
          }}
        >
          <p className="set-preview-label">Preview</p>
          <p>
            Data is at the center of many challenges in system design today. Difficult issues need
            to be figured out, such as scalability, consistency, reliability, efficiency, and
            maintainability.
          </p>
        </div>
      </figure>
    </div>
  );
}
