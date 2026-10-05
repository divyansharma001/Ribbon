"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";

/** True when the device asks for less motion. Diagrams then step by hand instead of animating. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

export interface StepPlayer<S> {
  steps: readonly S[];
  /** Index of the current step, or -1 before the first one. */
  index: number;
  step: S | undefined;
  playing: boolean;
  done: boolean;
  /** Load a new sequence of steps and start it. */
  run(steps: readonly S[]): void;
  next(): void;
  reset(): void;
}

/**
 * Plays a list of steps one after another, `stepMs` apart.
 * With reduced motion it does not auto-advance: the reader taps "Next".
 */
export function useStepPlayer<S>(stepMs = 1300): StepPlayer<S> {
  const reduced = useReducedMotion();
  const [steps, setSteps] = useState<readonly S[]>([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    if (!playing || reduced) return;
    if (index >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setIndex((i) => i + 1), index < 0 ? 50 : stepMs);
    return clear;
  }, [playing, reduced, index, steps.length, stepMs, clear]);

  useEffect(() => clear, [clear]);

  return {
    steps,
    index,
    step: steps[index],
    playing,
    done: steps.length > 0 && index >= steps.length - 1,
    run(next) {
      clear();
      setSteps(next);
      setIndex(reduced ? 0 : -1);
      setPlaying(!reduced);
    },
    next() {
      clear();
      setPlaying(false);
      setIndex((i) => Math.min(i + 1, steps.length - 1));
    },
    reset() {
      clear();
      setPlaying(false);
      setSteps([]);
      setIndex(-1);
    },
  };
}

/** True while the element is on screen, so looping diagrams only move when you can see them. */
export function useInView<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      {
        threshold: 0.25,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView];
}
