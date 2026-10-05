"use client";

import { useEffect, useState } from "react";
import { makeNoise, schedulePageTurn } from "@/components/book/feedback";

interface Stats {
  peak: number;
  attackMs: number;
  rms: number;
  lowShare: number;
}

/** Loudness and shape of a rendered sound, so it can be checked without ears. */
function measure(samples: Float32Array, rate: number): Stats {
  let peak = 0;
  let peakAt = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i] ?? 0);
    sum += v * v;
    if (v > peak) {
      peak = v;
      peakAt = i;
    }
  }
  // Attack: time from 10% of the 20 ms smoothed envelope's peak to 90% of it.
  const win = Math.floor(rate * 0.02);
  const env: number[] = [];
  for (let i = 0; i + win < samples.length; i += win) {
    let s = 0;
    for (let j = i; j < i + win; j++) s += (samples[j] ?? 0) ** 2;
    env.push(Math.sqrt(s / win));
  }
  const top = Math.max(...env);
  const t10 = env.findIndex((v) => v >= top * 0.1);
  const t90 = env.findIndex((v) => v >= top * 0.9);
  // Share of energy below 400 Hz (a "boom"): compare against a simple low-pass.
  let low = 0;
  let y = 0;
  const a = 1 - Math.exp((-2 * Math.PI * 400) / rate);
  for (let i = 0; i < samples.length; i++) {
    y += a * ((samples[i] ?? 0) - y);
    low += y * y;
  }
  void peakAt;
  return {
    peak: Math.round(peak * 1000) / 1000,
    attackMs: (t90 - t10) * 20,
    rms: Math.round(Math.sqrt(sum / samples.length) * 10000) / 10000,
    lowShare: Math.round((low / Math.max(sum, 1e-9)) * 100) / 100,
  };
}

/** The first version, kept here only to compare against. */
function scheduleOld(ctx: BaseAudioContext, noise: AudioBuffer) {
  const now = 0;
  const duration = 0.35;
  const source = ctx.createBufferSource();
  source.buffer = noise;
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
  source.start(now, 0, duration);
}

function oldNoise(ctx: BaseAudioContext) {
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = 0.97 * last + 0.03 * (Math.random() * 2 - 1);
    data[i] = last * 6;
  }
  return buf;
}

export function SoundLab() {
  const [result, setResult] = useState<{ old: Stats; next: Stats } | null>(null);
  useEffect(() => {
    const rate = 44_100;
    const render = async (schedule: (ctx: OfflineAudioContext) => void) => {
      const ctx = new OfflineAudioContext(1, rate * 0.6, rate);
      schedule(ctx);
      return measure((await ctx.startRendering()).getChannelData(0), rate);
    };
    void Promise.all([
      render((ctx) => scheduleOld(ctx, oldNoise(ctx))),
      render((ctx) => schedulePageTurn(ctx, ctx.destination, 0, makeNoise(ctx), () => 0.5)),
    ]).then(([old, next]) => setResult({ old, next }));
  }, []);
  return <pre data-sound-lab>{result ? JSON.stringify(result) : "rendering"}</pre>;
}
