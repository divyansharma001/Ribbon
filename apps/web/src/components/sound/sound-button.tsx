"use client";

import { useEffect, useState } from "react";
import {
  FOCUS_SOUNDS,
  isPlaying,
  type Station,
  sound,
  stopAll,
  type Track,
  useSound,
} from "./engine";

const TIMERS = [null, 25, 50] as const;

/** Headphones button in the top bar, with the sound panel. */
export function SoundButton() {
  const s = useSound();
  const playing = isPlaying();
  const [tracksLoaded, setTracksLoaded] = useState(false);

  // Load the playlist the first time the panel opens.
  const loadTracks = () => {
    if (tracksLoaded) return;
    setTracksLoaded(true);
    void fetch("/api/music/live")
      .then((r) => (r.ok ? (r.json() as Promise<{ stations: Station[] }>) : { stations: [] }))
      .then((d) => sound.setStations(d.stations))
      .catch(() => sound.setStations([]));
    void fetch("/api/music")
      .then((r) => (r.ok ? (r.json() as Promise<{ tracks: Track[] }>) : { tracks: [] }))
      .then((d) => sound.setTracks(d.tracks))
      .catch(() => sound.setTracks([]));
  };

  const minutesLeft = useMinutesLeft(s.stopAt);

  return (
    <>
      <button
        type="button"
        popoverTarget="sound-menu"
        onClick={loadTracks}
        className="relative flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-text"
        aria-label={playing ? "Sounds (playing)" : "Sounds"}
      >
        {playing ? <Bars /> : <Headphones />}
      </button>

      <div id="sound-menu" popover="auto" className="theme-menu sound-menu">
        <section>
          <p className="menu-heading">Focus sounds</p>
          {FOCUS_SOUNDS.map(({ id, label }) => {
            const f = s.focus[id];
            return (
              <div key={id} className="sound-row">
                <button
                  type="button"
                  aria-pressed={f.on}
                  onClick={() => sound.toggleFocus(id)}
                  className={`sound-chip ${f.on ? "is-on" : ""}`}
                >
                  {label}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={f.volume}
                  onChange={(e) => sound.setFocusVolume(id, Number(e.target.value))}
                  aria-label={`${label} volume`}
                  disabled={!f.on}
                />
              </div>
            );
          })}
        </section>

        <div className="menu-divider" />

        <section>
          <p className="menu-heading">Lo-fi music</p>
          <div className="menu-segment sound-segment">
            {(
              [
                ["off", "Off"],
                ["live", "Live"],
                ["playlist", "Playlist"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={s.music === m}
                className={s.music === m ? "is-on" : ""}
                onClick={() => sound.setMusic(m)}
              >
                {label}
              </button>
            ))}
          </div>

          {s.music === "live" && (
            <div className="sound-stations">
              {s.stations.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  aria-pressed={s.station === st.id}
                  onClick={() => sound.setStation(st.id)}
                  className={`sound-chip ${s.station === st.id ? "is-on" : ""}`}
                >
                  {st.label}
                </button>
              ))}
              <p className="sound-note">
                Lofi Girl, live on YouTube. The player shows in a corner you can change.
              </p>
            </div>
          )}

          {s.music === "playlist" &&
            (s.tracks.length === 0 ? (
              <p className="sound-note">No tracks yet. Approved tracks will show up here.</p>
            ) : (
              <ol className="sound-tracks">
                {s.tracks.map((t, i) => {
                  const current = i === s.trackIndex;
                  return (
                    <li key={t.name}>
                      <button
                        type="button"
                        onClick={() => (current ? sound.togglePlaylist() : sound.playTrack(i))}
                        className={current ? "is-current" : ""}
                        aria-label={`${current && s.playlistPlaying ? "Pause" : "Play"} ${t.title}`}
                      >
                        <span className="sound-track-icon" aria-hidden="true">
                          {current && s.playlistPlaying ? "❚❚" : "▶"}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ))}

          {s.music !== "off" && (
            <div className="sound-row">
              <span className="sound-label">Music volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={s.musicVolume}
                onChange={(e) => sound.setMusicVolume(Number(e.target.value))}
                aria-label="Music volume"
              />
            </div>
          )}
        </section>

        <div className="menu-divider" />

        <section className="sound-footer">
          <div className="sound-timer">
            <span className="sound-label">Stop after</span>
            {TIMERS.map((m) => (
              <button
                key={String(m)}
                type="button"
                aria-pressed={m === null ? s.stopAt === null : false}
                onClick={() => sound.setTimer(m)}
                className={`sound-chip small ${m === null && s.stopAt === null ? "is-on" : ""}`}
              >
                {m === null ? "Never" : `${m} min`}
              </button>
            ))}
          </div>
          {minutesLeft !== null && <p className="sound-note">Stops in {minutesLeft} min.</p>}
          {playing && (
            <button type="button" onClick={stopAll} className="sound-stop">
              Stop all sounds
            </button>
          )}
        </section>
      </div>
    </>
  );
}

function useMinutesLeft(stopAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (stopAt === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, [stopAt]);
  return stopAt === null ? null : Math.max(1, Math.ceil((stopAt - now) / 60_000));
}

function Headphones() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="14" width="4.5" height="6.5" rx="1.6" />
      <rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6" />
    </svg>
  );
}

/** Small moving bars that show sound is playing. */
function Bars() {
  return (
    <span className="sound-bars" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
