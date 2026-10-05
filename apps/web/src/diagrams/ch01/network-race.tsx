"use client";

import { useEffect, useRef, useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";
import { useReducedMotion } from "../use-steps";

type Outcome = "ok" | "slow" | "lost" | "reply-lost";

/** How each network request goes. A mix that shows every kind of trouble within a few tries. */
function pickOutcome(n: number): Outcome {
  const pattern: Outcome[] = [
    "ok",
    "ok",
    "slow",
    "lost",
    "ok",
    "reply-lost",
    "ok",
    "slow",
    "ok",
    "lost",
  ];
  return pattern[n % pattern.length] ?? "ok";
}

const TIMEOUT_MS = 2400;

interface Trip {
  id: number;
  outcome: Outcome;
  phase: "going" | "there" | "back" | "done" | "timeout";
}

/** Ch 1, problems with distributed systems: a function call vs a call over the network. */
export function NetworkRaceDiagram() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [local, setLocal] = useState(false);
  const [tally, setTally] = useState({ ok: 0, slow: 0, timeout: 0 });
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );
  const at = (ms: number, fn: () => void) =>
    timers.current.push(window.setTimeout(fn, reduced ? ms / 4 : ms));

  const send = () => {
    if (trip && trip.phase !== "done" && trip.phase !== "timeout") return;
    const id = count;
    const outcome = pickOutcome(id);
    setCount(id + 1);
    setLocal(true);
    at(250, () => setLocal(false));
    setTrip({ id, outcome, phase: "going" });
    const travel = outcome === "slow" ? 1500 : 650;
    if (outcome === "lost") {
      at(TIMEOUT_MS, () => {
        setTrip({ id, outcome, phase: "timeout" });
        setTally((t) => ({ ...t, timeout: t.timeout + 1 }));
      });
      return;
    }
    at(travel, () => setTrip({ id, outcome, phase: "there" }));
    at(travel + 250, () => setTrip({ id, outcome, phase: "back" }));
    if (outcome === "reply-lost") {
      at(TIMEOUT_MS, () => {
        setTrip({ id, outcome, phase: "timeout" });
        setTally((t) => ({ ...t, timeout: t.timeout + 1 }));
      });
      return;
    }
    at(travel * 2 + 250, () => {
      setTrip({ id, outcome, phase: "done" });
      setTally((t) => (outcome === "slow" ? { ...t, slow: t.slow + 1 } : { ...t, ok: t.ok + 1 }));
    });
  };

  const message = (() => {
    if (!trip) return "Send a request both ways and compare.";
    if (trip.phase === "timeout") {
      return trip.outcome === "lost"
        ? "Timed out. Did the service get the request? You can't tell, so retrying might do the work twice."
        : "Timed out, but the service did the work: only the reply was lost. From here it looks exactly the same.";
    }
    if (trip.phase === "done") {
      return trip.outcome === "slow"
        ? "It worked, but slowly: the network or the service was busy."
        : "It worked, but a network round trip is still far slower than calling a function.";
    }
    return "The network call is on its way…";
  })();

  const position =
    trip?.phase === "going"
      ? "go"
      : trip?.phase === "there"
        ? "there"
        : trip?.phase === "back"
          ? "back"
          : "home";
  const slow = trip?.outcome === "slow";
  const vanish =
    (trip?.outcome === "lost" && trip.phase === "going") ||
    (trip?.outcome === "reply-lost" && trip.phase === "back");

  return (
    <DiagramFrame
      title="A function call vs a network call"
      narration={message}
      controls={
        <>
          <DiagramButton onClick={send}>Send a request</DiagramButton>
          <span className="race-tally">
            {tally.ok} fine · {tally.slow} slow · {tally.timeout} timed out
          </span>
        </>
      }
      caption="Every call over the network can be slow, lost, or answered without you hearing back. A function call in the same process can't."
    >
      <div className="race">
        <div className="race-lane">
          <span className="race-label">Function call (same program)</span>
          <div className="race-track">
            <span className="race-end">caller</span>
            <span className={`race-dot is-local ${local ? "at-there" : "at-home"}`} />
            <span className="race-end is-right">function</span>
          </div>
          <span className="race-time">{count > 0 ? "done instantly, every time" : ""}</span>
        </div>
        <div className="race-lane">
          <span className="race-label">Network call (another service)</span>
          <div className="race-track">
            <span className="race-end">caller</span>
            <span
              key={trip?.id ?? "idle"}
              className={[
                "race-dot",
                position === "go" || position === "there" ? "at-there" : "at-home",
                slow ? "is-slow" : "",
                vanish ? "is-lost" : "",
              ].join(" ")}
            />
            <span className="race-end is-right">service</span>
          </div>
          <span className="race-time">
            {trip?.phase === "timeout"
              ? "no answer before the timeout"
              : trip?.phase === "done"
                ? slow
                  ? "came back late"
                  : "came back"
                : ""}
          </span>
        </div>
      </div>
    </DiagramFrame>
  );
}
