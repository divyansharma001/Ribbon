"use client";

/*
 * Page-turn feedback: a soft paper sound and a short haptic tap.
 * The sound is made in the browser from filtered noise (no audio files).
 * Haptics work where the browser allows them (Android). iPhone Safari and
 * desktop browsers do not expose haptics to web pages.
 */

const SOUND_KEY = "ribbon-page-sound";
let audio: AudioContext | null = null;
let noise: AudioBuffer | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the setting just won't be remembered.
  }
}

function context(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  audio ??= new AudioContext();
  if (!noise) {
    const length = Math.floor(audio.sampleRate * 0.5);
    noise = audio.createBuffer(1, length, audio.sampleRate);
    const data = noise.getChannelData(0);
    // Pink-ish noise sounds closer to paper than white noise.
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = 0.97 * last + 0.03 * (Math.random() * 2 - 1);
      data[i] = last * 6;
    }
  }
  return audio;
}

/** A soft "fwip" of a page turning. Quietly does nothing if audio is unavailable. */
export function playPageTurn(): void {
  if (!soundEnabled()) return;
  const ctx = context();
  if (!ctx || !noise) return;
  if (ctx.state === "suspended") void ctx.resume();
  const now = ctx.currentTime;
  const duration = 0.32 + Math.random() * 0.06;

  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = 0.9 + Math.random() * 0.2;

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.8;
  band.frequency.setValueAtTime(2600, now);
  band.frequency.exponentialRampToValueAtTime(700, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.08, now + duration * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(band).connect(gain).connect(ctx.destination);
  source.start(now, Math.random() * 0.1, duration);
}

/** A light tap, where the device and browser support it. */
export function hapticTap(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
}
