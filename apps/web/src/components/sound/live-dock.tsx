"use client";

import { useEffect, useRef } from "react";
import { type Corner, sound, useSound } from "./engine";

const CORNERS: Corner[] = ["bottom-left", "bottom-right", "top-right", "top-left"];

/**
 * The Lofi Girl live player. YouTube's rules say the player must stay visible
 * and at least 200x200, so it sits in a corner (which you can switch) instead
 * of being hidden. Lives in the root layout so it keeps playing between pages.
 */
export function LiveDock() {
  const s = useSound();
  const frame = useRef<HTMLIFrameElement>(null);

  // Keep the player's volume in step with the slider (YouTube's postMessage API).
  const applyVolume = () =>
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: "setVolume",
        args: [Math.round(s.musicVolume * 100)],
      }),
      "https://www.youtube-nocookie.com",
    );
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-send only when the volume changes
  useEffect(() => {
    applyVolume();
  }, [s.musicVolume]);

  const station = s.stations.find((st) => st.id === s.station) ?? s.stations[0];
  if (s.music !== "live" || !station) return null;

  const src = `https://www.youtube-nocookie.com/embed/${station.videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1`;
  const nextCorner = CORNERS[(CORNERS.indexOf(s.corner) + 1) % CORNERS.length] ?? "bottom-left";

  return (
    <aside className="live-dock" data-corner={s.corner} aria-label="Lofi Girl live radio">
      <div className="live-dock-bar">
        <span className="live-dot" aria-hidden="true" />
        <span className="live-title">Lofi Girl · {station.label}</span>
        <button
          type="button"
          onClick={() => sound.setCorner(nextCorner)}
          aria-label="Move player to another corner"
        >
          <MoveIcon />
        </button>
        <button type="button" onClick={() => sound.setMusic("off")} aria-label="Stop live radio">
          <CloseIcon />
        </button>
      </div>
      <iframe
        ref={frame}
        key={station.videoId}
        src={src}
        title={`Lofi Girl ${station.label} live radio`}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={applyVolume}
      />
    </aside>
  );
}

const icon = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MoveIcon() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M5 9 2 12l3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...icon} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
