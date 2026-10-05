"use client";

import { useEffect, useRef, useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";
import { useReducedMotion } from "../use-steps";

const RACKS = 3;
const PER_RACK = 4;
const NODES = RACKS * PER_RACK;
/** The service keeps working while at least this many nodes are up. */
const NEEDED = 4;

type Event = "disks" | "rack" | "bug";

const DOWN_LABEL: Record<Event, string> = { disks: "disk failed", rack: "no power", bug: "hung" };

/** Nodes hit by single, unrelated disk failures, in order. */
const DISK_FAULTS = [5, 10, 1, 7, 3, 11];

/** Ch 2, software faults: independent hardware faults vs one bug on every node. */
export function CorrelatedFaultsDiagram() {
  const reduced = useReducedMotion();
  const [down, setDown] = useState<Set<number>>(new Set());
  const [event, setEvent] = useState<Event | null>(null);
  const [fixed, setFixed] = useState(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );
  const at = (ms: number, fn: () => void) =>
    timers.current.push(window.setTimeout(fn, reduced ? ms / 4 : ms));

  const start = (e: Event) => {
    clear();
    setEvent(e);
    setFixed(0);
    if (e === "disks") {
      setDown(new Set());
      DISK_FAULTS.forEach((n, i) => {
        at(i * 700, () => setDown(new Set([n])));
        at(i * 700 + 500, () => {
          setDown(new Set());
          setFixed(i + 1);
        });
      });
    } else if (e === "rack") {
      setDown(new Set(Array.from({ length: PER_RACK }, (_, i) => PER_RACK + i)));
    } else {
      setDown(new Set(Array.from({ length: NODES }, (_, i) => i)));
    }
  };
  const reset = () => {
    clear();
    setEvent(null);
    setDown(new Set());
    setFixed(0);
  };

  const up = NODES - down.size;
  const serving = up >= NEEDED;

  const narration = (() => {
    if (event === "disks")
      return (
        <>
          Disks fail one at a time, at random. Each time, the other nodes carry on while the broken
          one is replaced. <strong>{fixed}</strong> {fixed === 1 ? "fault" : "faults"} so far, and
          users noticed nothing.
        </>
      );
    if (event === "rack")
      return "A whole rack loses power. That is several hardware faults at once, but the other racks keep the service running.";
    if (event === "bug")
      return (
        <>
          A leap second triggers a bug in code that <strong>every node runs</strong>. They all hang
          at the same moment. No amount of spare hardware helps, because the spares run the same
          code.
        </>
      );
    return "12 nodes in 3 racks, all running the same software. The service needs at least 4 nodes up.";
  })();

  return (
    <DiagramFrame
      title="Hardware faults vs software faults"
      narration={narration}
      controls={
        <>
          <DiagramButton active={event === "disks"} onClick={() => start("disks")}>
            A year of disk failures
          </DiagramButton>
          <DiagramButton active={event === "rack"} onClick={() => start("rack")}>
            A rack loses power
          </DiagramButton>
          <DiagramButton active={event === "bug"} onClick={() => start("bug")}>
            Leap second bug
          </DiagramButton>
          {event && <DiagramButton onClick={reset}>Reset</DiagramButton>}
        </>
      }
      caption="Hardware faults are mostly independent, so redundancy handles them. Software faults are correlated: the same bug hits every node at once."
    >
      <div className="cf">
        <div className="cf-racks">
          {Array.from({ length: RACKS }, (_, r) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: racks are fixed positions
            <div key={r} className="cf-rack">
              <span className="cf-rack-label">Rack {r + 1}</span>
              {Array.from({ length: PER_RACK }, (_, i) => {
                const n = r * PER_RACK + i;
                return (
                  <span key={n} className="cf-node" data-state={down.has(n) ? "down" : "up"}>
                    {down.has(n) ? DOWN_LABEL[event ?? "disks"] : `node ${n + 1}`}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <p className="cf-service" data-state={serving ? "up" : "down"}>
          Service: <b>{serving ? "up" : "down"}</b> · {up} of {NODES} nodes working
        </p>
      </div>
    </DiagramFrame>
  );
}
