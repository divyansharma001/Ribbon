"use client";

/*
 * The sound engine: focus sounds made in the browser, the Lofi Girl live
 * stream, and our own playlist. One shared instance lives for the whole app
 * session, so sound keeps playing across page turns and page changes.
 *
 * Nothing plays until the reader presses play (browsers require a tap first).
 */

import { useSyncExternalStore } from "react";

export const FOCUS_SOUNDS = [
  { id: "rain", label: "Rain" },
  { id: "brown", label: "Brown noise" },
  { id: "white", label: "White noise" },
  { id: "hum", label: "Soft hum" },
] as const;
export type FocusId = (typeof FOCUS_SOUNDS)[number]["id"];

export interface Station {
  id: string;
  label: string;
  videoId: string;
}

export interface Track {
  name: string;
  title: string;
}

export type Corner = "bottom-left" | "bottom-right" | "top-left" | "top-right";

export interface SoundState {
  focus: Record<FocusId, { on: boolean; volume: number }>;
  /** What plays as music: nothing, the live stream, or the playlist. */
  music: "off" | "live" | "playlist";
  stations: Station[];
  station: string;
  tracks: Track[];
  trackIndex: number;
  playlistPlaying: boolean;
  musicVolume: number;
  /** Where the live player sits on screen. */
  corner: Corner;
  /** When the sleep timer stops everything (epoch ms), or null. */
  stopAt: number | null;
}

const STORAGE_KEY = "ribbon-sound";

const initial: SoundState = {
  focus: {
    rain: { on: false, volume: 0.5 },
    brown: { on: false, volume: 0.4 },
    white: { on: false, volume: 0.25 },
    hum: { on: false, volume: 0.4 },
  },
  music: "off",
  stations: [],
  station: "study",
  tracks: [],
  trackIndex: 0,
  playlistPlaying: false,
  musicVolume: 0.6,
  corner: "bottom-left",
  stopAt: null,
};

let state: SoundState = initial;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Remembered: volumes, corner, station, playlist position. Not remembered: anything playing (no autoplay on load). */
function save() {
  try {
    const { focus, musicVolume, corner, trackIndex, station } = state;
    const remembered = {
      focus: Object.fromEntries(
        Object.entries(focus).map(([k, v]) => [k, { on: false, volume: v.volume }]),
      ),
      musicVolume,
      corner,
      trackIndex,
      station,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remembered));
  } catch {
    // Storage blocked: settings just won't be remembered.
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<SoundState> | null;
    if (saved) {
      state = {
        ...state,
        ...saved,
        focus: { ...state.focus, ...saved.focus },
        music: "off",
        playlistPlaying: false,
        stopAt: null,
        stations: [],
        tracks: [],
      };
    }
  } catch {
    // Bad saved data: start fresh.
  }
}

function set(patch: Partial<SoundState>) {
  state = { ...state, ...patch };
  save();
  sync();
  emit();
}

// ---------------------------------------------------------------------------
// Focus sounds, made with the Web Audio API.
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
const voices = new Map<FocusId, { gain: GainNode; stop: () => void }>();

function audio(): AudioContext {
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A few seconds of looping noise. "brown" and "pink" are softer, deeper kinds. */
function noiseBuffer(ac: AudioContext, kind: "white" | "pink" | "brown"): AudioBuffer {
  const seconds = 6;
  const buffer = ac.createBuffer(2, ac.sampleRate * seconds, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") data[i] = white * 0.5;
      else if (kind === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      } else {
        // Paul Kellet's simple pink noise filter.
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
      }
    }
    // Fade the loop's ends into each other so there is no click when it repeats.
    const fade = Math.floor(ac.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      const end = data.length - fade + i;
      data[i] = (data[i] ?? 0) * t + (data[end] ?? 0) * (1 - t);
    }
  }
  return buffer;
}

function startVoice(id: FocusId): { gain: GainNode; stop: () => void } {
  const ac = audio();
  const gain = ac.createGain();
  gain.gain.value = 0;
  gain.connect(ac.destination);
  const stops: (() => void)[] = [];

  const loop = (kind: "white" | "pink" | "brown", ...filters: BiquadFilterNode[]) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, kind);
    src.loop = true;
    let node: AudioNode = src;
    for (const f of filters) node = node.connect(f);
    node.connect(gain);
    src.start();
    stops.push(() => src.stop());
  };
  const filter = (type: BiquadFilterType, frequency: number, q = 0.7) => {
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = q;
    return f;
  };

  if (id === "white") loop("white", filter("lowpass", 8000));
  else if (id === "brown") loop("brown", filter("lowpass", 900));
  else if (id === "rain") {
    // Close rain: pink noise in the middle and high range; far rain: a low wash.
    loop("pink", filter("highpass", 500), filter("lowpass", 7000));
    loop("brown", filter("lowpass", 400));
  } else {
    // A soft, slowly breathing drone.
    for (const [freq, level] of [
      [98, 0.5],
      [98.6, 0.5],
      [196, 0.18],
      [147, 0.12],
    ] as const) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const level_ = ac.createGain();
      level_.gain.value = level * 0.35;
      osc.connect(level_).connect(gain);
      osc.start();
      stops.push(() => osc.stop());
    }
  }
  return {
    gain,
    stop: () => {
      for (const stop of stops) stop();
    },
  };
}

/** Makes the focus sounds match the state, with short fades so nothing clicks. */
function syncFocus() {
  for (const { id } of FOCUS_SOUNDS) {
    const want = state.focus[id];
    let voice = voices.get(id);
    if (want.on && !voice) {
      voice = startVoice(id);
      voices.set(id, voice);
    }
    if (!voice) continue;
    const ac = audio();
    const target = want.on ? want.volume * 0.6 : 0;
    voice.gain.gain.setTargetAtTime(target, ac.currentTime, 0.15);
    if (!want.on) {
      const v = voice;
      voices.delete(id);
      window.setTimeout(() => {
        v.stop();
        v.gain.disconnect();
      }, 800);
    }
  }
}

// ---------------------------------------------------------------------------
// Playlist, played with a plain <audio> element.
// ---------------------------------------------------------------------------

let player: HTMLAudioElement | null = null;

function playlistPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.preload = "none";
    player.addEventListener("ended", () => nextTrack());
  }
  return player;
}

function syncPlaylist() {
  const playing = state.music === "playlist" && state.playlistPlaying;
  if (!playing) {
    player?.pause();
    return;
  }
  const track = state.tracks[state.trackIndex];
  if (!track) return;
  const p = playlistPlayer();
  const src = `/api/music/${encodeURIComponent(track.name)}`;
  if (!p.src.endsWith(src)) p.src = src;
  p.volume = state.musicVolume;
  void p.play().catch(() => set({ playlistPlaying: false }));
}

// ---------------------------------------------------------------------------
// Sleep timer.
// ---------------------------------------------------------------------------

let timer = 0;
function syncTimer() {
  window.clearTimeout(timer);
  if (state.stopAt === null) return;
  timer = window.setTimeout(() => stopAll(), Math.max(0, state.stopAt - Date.now()));
}

function sync() {
  if (typeof window === "undefined") return;
  syncFocus();
  syncPlaylist();
  syncTimer();
}

// ---------------------------------------------------------------------------
// Public actions and hooks.
// ---------------------------------------------------------------------------

export const sound = {
  toggleFocus(id: FocusId) {
    const f = state.focus[id];
    set({ focus: { ...state.focus, [id]: { ...f, on: !f.on } } });
  },
  setFocusVolume(id: FocusId, volume: number) {
    const f = state.focus[id];
    set({ focus: { ...state.focus, [id]: { ...f, volume } } });
  },
  setMusic(music: SoundState["music"]) {
    set({ music, playlistPlaying: music === "playlist" ? state.playlistPlaying : false });
  },
  setStations(stations: Station[]) {
    set({ stations });
  },
  setStation(station: string) {
    set({ station, music: "live" });
  },
  setTracks(tracks: Track[]) {
    set({ tracks, trackIndex: Math.min(state.trackIndex, Math.max(0, tracks.length - 1)) });
  },
  playTrack(index: number) {
    set({ music: "playlist", trackIndex: index, playlistPlaying: true });
  },
  togglePlaylist() {
    set({ music: "playlist", playlistPlaying: !state.playlistPlaying });
  },
  setMusicVolume(musicVolume: number) {
    set({ musicVolume });
    if (player) player.volume = musicVolume;
  },
  setCorner(corner: Corner) {
    set({ corner });
  },
  setTimer(minutes: number | null) {
    set({ stopAt: minutes === null ? null : Date.now() + minutes * 60_000 });
  },
};

export function nextTrack() {
  if (state.tracks.length === 0) return;
  set({ trackIndex: (state.trackIndex + 1) % state.tracks.length });
}

export function stopAll() {
  const focus = Object.fromEntries(
    Object.entries(state.focus).map(([k, v]) => [k, { ...v, on: false }]),
  ) as SoundState["focus"];
  set({ focus, music: "off", playlistPlaying: false, stopAt: null });
}

/** True while anything is playing. The page-turn sound gets quieter then. */
export function isPlaying(): boolean {
  return (
    Object.values(state.focus).some((f) => f.on) ||
    state.music === "live" ||
    (state.music === "playlist" && state.playlistPlaying)
  );
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSound(): SoundState {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => initial,
  );
}
