"use client";

import { useEffect, useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";
import { useReducedMotion } from "../use-steps";

type Mode = "pull" | "push";
type Action = "read" | "post" | "celebrity" | null;

const SHOWN = 24;
const fmt = new Intl.NumberFormat("en-US");

/** Counts up to `target` over a short moment, restarting whenever `key` changes. */
function useCountUp(target: number, key: string, ms = 900): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` restarts the count even when the target is the same
  useEffect(() => {
    if (reduced || target === 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * t * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, key, ms, reduced]);
  return value;
}

/** Ch 2, materializing timelines: build the timeline on read, or deliver posts on write. */
export function FanOutDiagram() {
  const [mode, setMode] = useState<Mode>("pull");
  const [action, setAction] = useState<Action>(null);
  const [apart, setApart] = useState(false);
  const [run, setRun] = useState(0);

  const act = (a: Action) => {
    setAction(a);
    setRun((r) => r + 1);
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    setAction(null);
    setApart(false);
  };

  const celebrity = action === "celebrity";
  const work = (() => {
    if (action === "read") return mode === "pull" ? 200 : 1;
    if (action === "post") return mode === "pull" ? 1 : 200;
    if (celebrity) return apart ? 1 : 100_000_000;
    return 0;
  })();
  const count = useCountUp(work, `${mode}-${action}-${apart}-${run}`);

  const gridLabel =
    mode === "pull"
      ? "200 accounts you follow (24 shown)"
      : celebrity && !apart
        ? "100 million followers' timelines (24 shown)"
        : "Your 200 followers' timelines (24 shown)";
  // Which boxes light up, and how.
  const lit = mode === "pull" ? action === "read" : action === "post" || (celebrity && !apart);
  const readOne = mode === "push" && action === "read";

  const unit =
    mode === "pull"
      ? action === "read"
        ? "lookups to load one timeline"
        : "write to save the post"
      : action === "read"
        ? "read to load one timeline"
        : "timeline writes for one post";

  const narration = (() => {
    if (!action)
      return mode === "pull"
        ? "Query on read: nothing is prepared. Every time someone opens their timeline, the database gathers it from scratch."
        : "Fan-out on write: every user has a stored timeline, like a mailbox. New posts are delivered as they happen.";
    if (mode === "pull")
      return action === "read" ? (
        <>
          Loading one timeline reads the recent posts of all 200 accounts and merges them. At 2
          million loads a second, that is <strong>400 million lookups a second</strong>.
        </>
      ) : (
        "Posting is cheap: one row goes into the posts table. All the work happens later, on every read."
      );
    if (action === "post")
      return (
        <>
          The post is copied into all 200 followers' timelines. At 5,800 posts a second, that is
          about <strong>1.16 million writes a second</strong>: a lot, but far less than 400 million.
        </>
      );
    if (action === "read")
      return "Loading a timeline is now one quick read of a list that is already sorted and waiting.";
    return apart
      ? "Celebrity posts are kept in one place. When a follower loads their timeline, the celebrity posts are merged in at read time."
      : "A celebrity with 100 million followers posts once, and that means 100 million timeline writes. Dropping some isn't OK: every follower should see it.";
  })();

  return (
    <DiagramFrame
      title="Build the timeline on read, or on write?"
      narration={narration}
      controls={
        <>
          <div className="diagram-segment">
            <DiagramButton active={mode === "pull"} onClick={() => switchMode("pull")}>
              Query on read
            </DiagramButton>
            <DiagramButton active={mode === "push"} onClick={() => switchMode("push")}>
              Fan-out on write
            </DiagramButton>
          </div>
          <DiagramButton onClick={() => act("post")}>Someone posts</DiagramButton>
          <DiagramButton onClick={() => act("read")}>Open a timeline</DiagramButton>
          {mode === "push" && (
            <DiagramButton onClick={() => act("celebrity")}>A celebrity posts</DiagramButton>
          )}
          {mode === "push" && celebrity && (
            <DiagramButton active={apart} onClick={() => setApart((a) => !a)}>
              Keep celebrity posts apart
            </DiagramButton>
          )}
        </>
      }
      caption="Fan-out moves work from reading to writing. Reads happen far more often than posts, so that is usually a good deal."
    >
      <div className="fan">
        <p className="fan-label">{gridLabel}</p>
        <div key={`${mode}-${run}-${apart}`} className="fan-grid">
          {Array.from({ length: SHOWN }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list of boxes
              key={i}
              className={[
                "fan-cell",
                mode === "push" ? "is-box" : "is-account",
                lit ? "is-lit" : "",
                readOne && i === 0 ? "is-read" : "",
              ].join(" ")}
              style={{ animationDelay: `${i * 35}ms` }}
            />
          ))}
          {celebrity && apart && <span className="fan-apart">Celebrity posts, stored once</span>}
        </div>
        <p className="fan-count" aria-live="off">
          {action ? (
            <>
              <b>{fmt.format(count)}</b> {celebrity ? (apart ? "write for one post" : unit) : unit}
            </>
          ) : (
            <span className="fan-hint">Try both buttons in each mode.</span>
          )}
        </p>
      </div>
    </DiagramFrame>
  );
}
