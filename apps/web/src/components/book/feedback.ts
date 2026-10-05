"use client";

/*
 * Page-turn feedback: a soft paper sound and a short haptic tap.
 * The sound is made in the browser from filtered noise (no audio files).
 * Haptics work where the browser allows them (Android). iPhone Safari and
 * desktop browsers do not expose haptics to web pages.
 */

const SOUND_KEY = "ribbon-page-sound";

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

/** One second of plain noise, scaled to a peak of 1. Filters shape it into paper. */
export function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export const PAGE_TURN = {
  /** Loudest point, as a gain on noise that peaks at 1. Kept very quiet on purpose. */
  peak: 0.035,
  /** Time to reach the loudest point. Slow enough that there is no "hit". */
  attack: 0.06,
  duration: 0.42,
} as const;

/**
 * Schedules one soft page swish: noise, band-passed so it sweeps up and back
 * down like paper moving through the air, with a slow fade in and out and a
 * faint flutter. Works with a live or an offline audio context.
 */
export function schedulePageTurn(
  ctx: BaseAudioContext,
  destination: AudioNode,
  when: number,
  noise: AudioBuffer,
  random: () => number = Math.random,
): void {
  const { peak, attack } = PAGE_TURN;
  const duration = PAGE_TURN.duration * (0.92 + random() * 0.16);
  const end = when + duration;

  const source = ctx.createBufferSource();
  source.buffer = noise;

  // No low rumble (that is what made it sound like a bang) and no harsh top end.
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 650;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 5200;

  // The swish: the band rises as the page lifts and falls as it settles.
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.7;
  band.frequency.setValueAtTime(1300, when);
  band.frequency.linearRampToValueAtTime(2900 + random() * 400, when + duration * 0.45);
  band.frequency.linearRampToValueAtTime(1700, end);

  // A slow fade in and a long fade out.
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, when);
  envelope.gain.linearRampToValueAtTime(peak, when + attack);
  envelope.gain.setTargetAtTime(peak * 0.6, when + attack, duration * 0.2);
  envelope.gain.setTargetAtTime(0, when + duration * 0.5, duration * 0.14);
  envelope.gain.linearRampToValueAtTime(0, end);

  // A faint flutter, like the edge of a page catching the air.
  const flutter = ctx.createGain();
  flutter.gain.value = 1;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 11 + random() * 5;
  const depth = ctx.createGain();
  depth.gain.value = 0.18;
  lfo.connect(depth).connect(flutter.gain);

  source.connect(highpass).connect(band).connect(lowpass).connect(flutter).connect(envelope);
  envelope.connect(destination);
  source.start(when, random() * 0.4, duration + 0.02);
  lfo.start(when);
  lfo.stop(end + 0.02);
}

let audio: AudioContext | null = null;
let noise: AudioBuffer | null = null;

/** A soft page swish. Quietly does nothing if audio is unavailable or switched off. */
export function playPageTurn(): void {
  if (!soundEnabled() || typeof window === "undefined" || !("AudioContext" in window)) return;
  audio ??= new AudioContext();
  noise ??= makeNoise(audio);
  if (audio.state === "suspended") void audio.resume();
  schedulePageTurn(audio, audio.destination, audio.currentTime + 0.01, noise);
}

/** A light tap, where the device and browser support it. */
export function hapticTap(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
}
