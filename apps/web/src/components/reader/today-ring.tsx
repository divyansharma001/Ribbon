"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GoalRing } from "@/components/home/streak-parts";
import { ACTIVE_SECONDS_EVENT, FOCUS_RUN_EVENT } from "./surface";

const CELEBRATED_KEY = "ribbon-goal-celebrated";

/**
 * Today's goal ring in the reader's top bar. Starts from today's saved minutes
 * and fills live with this page's reading time. Shows a short note once, the
 * moment the goal is reached.
 */
export function TodayRing({
  baseMinutes,
  goal,
  streak,
  today,
  strict = false,
}: {
  /** Today's minutes so far, or in strict mode today's longest run. */
  baseMinutes: number;
  goal: number;
  streak: number;
  today: string;
  /** Strict focus: the ring shows the current unbroken run. */
  strict?: boolean;
}) {
  const [live, setLive] = useState(0);
  const [toast, setToast] = useState(false);
  // Normal: today's minutes plus this page's. Strict: the longer of today's best run and the current one.
  const minutes = strict ? Math.max(baseMinutes, live / 60) : baseMinutes + live / 60;

  useEffect(() => {
    const on = (e: Event) => setLive((e as CustomEvent<number>).detail);
    const event = strict ? FOCUS_RUN_EVENT : ACTIVE_SECONDS_EVENT;
    window.addEventListener(event, on);
    return () => window.removeEventListener(event, on);
  }, [strict]);

  const reached = baseMinutes < goal && minutes >= goal;
  useEffect(() => {
    if (!reached) return;
    try {
      if (localStorage.getItem(CELEBRATED_KEY) === today) return;
      localStorage.setItem(CELEBRATED_KEY, today);
    } catch {
      // Storage blocked: still show the note once for this page.
    }
    setToast(true);
    const t = window.setTimeout(() => setToast(false), 5000);
    return () => window.clearTimeout(t);
  }, [reached, today]);

  const done = minutes >= goal;
  const left = Math.max(0, Math.ceil(goal - minutes));
  return (
    <>
      <Link
        href="/"
        className="today-ring"
        aria-label={
          done
            ? "Today's goal is done"
            : strict
              ? `Focus run: ${Math.floor(minutes)} of ${goal} minutes`
              : `${left} minutes left today`
        }
        title={
          done
            ? "Today's goal is done"
            : strict
              ? `Focus run ${Math.floor(minutes)} of ${goal} min`
              : `${left} min left today`
        }
      >
        <GoalRing minutes={minutes} goal={goal} size={26} stroke={3} label={false} />
      </Link>
      {/* Rendered into <body>: the top bar is transformed, which would pin a fixed element to it. */}
      {toast &&
        createPortal(
          <div className="goal-toast" role="status">
            <span className="goal-toast-ring" aria-hidden="true">
              <GoalRing minutes={goal} goal={goal} size={30} stroke={3} label={false} />
            </span>
            <span>
              <strong>Daily goal done.</strong> {streak + 1}-day streak.
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
