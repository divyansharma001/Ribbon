"use client";

import { useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";
import { useWidth } from "../use-steps";

/*
 * A single server with random arrivals (an M/M/1 queue): average response time
 * is service / (1 - load). Clients give up after a timeout and, if they retry,
 * every timed-out request comes back as extra load.
 */
const SERVICE_MS = 50;
const TIMEOUT_MS = 1000;
const CHART_MAX_MS = 1500;
const CHART_HEIGHT = 200;

function responseMs(load: number): number {
  return SERVICE_MS / Math.max(0.0001, 1 - load);
}

/** Share of requests slower than the timeout. Response times in this model are exponential. */
function timedOut(load: number): number {
  if (load >= 1) return 1;
  return Math.exp((-(1 - load) * TIMEOUT_MS) / SERVICE_MS);
}

/** The load the server really sees once retries are added. Infinity if it never settles. */
function withRetries(offered: number): number {
  let load = offered;
  for (let i = 0; i < 200; i++) {
    const next = offered / Math.max(0.0001, 1 - timedOut(load));
    if (next >= 1) return Number.POSITIVE_INFINITY;
    if (Math.abs(next - load) < 1e-6) return next;
    load = next;
  }
  return load;
}

/** Ch 2, describing performance: response time near capacity, and retry storms. */
export function QueueingDiagram() {
  const [percent, setPercent] = useState(50);
  const [retries, setRetries] = useState(false);
  // A retry storm keeps going on its own, even after the load drops: only a reset clears it.
  const [stuck, setStuck] = useState(false);
  const [chartRef, width] = useWidth<HTMLDivElement>();

  const offered = percent / 100;
  const real = retries ? withRetries(offered) : offered;
  const overloaded = stuck || !Number.isFinite(real) || real >= 0.99;

  const change = (p: number) => {
    setPercent(p);
    if (retries && !Number.isFinite(withRetries(p / 100))) setStuck(true);
  };
  const toggleRetries = () => {
    const next = !retries;
    setRetries(next);
    if (next && !Number.isFinite(withRetries(offered))) setStuck(true);
    if (!next) setStuck(false);
  };

  const ms = overloaded ? Number.POSITIVE_INFINITY : responseMs(real);
  const waiting = overloaded ? 14 : Math.min(14, Math.round(real / (1 - real)));

  // Chart, in pixels: x is % of capacity, y is response time up to CHART_MAX_MS.
  const box = { left: 34, right: 10, top: 10, bottom: 24 };
  const x = (percentOfCapacity: number) =>
    box.left + (percentOfCapacity / 100) * (width - box.left - box.right);
  const y = (v: number) =>
    box.top +
    (1 - Math.min(v, CHART_MAX_MS) / CHART_MAX_MS) * (CHART_HEIGHT - box.top - box.bottom);
  const curve = Array.from({ length: 97 }, (_, i) => {
    return `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(responseMs(i / 100)).toFixed(1)}`;
  }).join(" ");
  const dotX = x(overloaded ? 100 : real * 100);
  const dotY = overloaded ? y(CHART_MAX_MS) : y(ms);

  const narration = (() => {
    if (stuck)
      return (
        <>
          <strong>Retry storm.</strong> Requests time out, clients send them again, and the extra
          load causes even more timeouts. Lowering the load doesn't help now: the server stays
          overloaded until it is reset. This is a <strong>metastable failure</strong>.
        </>
      );
    if (retries && real > offered + 0.005)
      return (
        <>
          Clients send <strong>{percent}%</strong> of capacity, but timeouts and retries push the
          real load to <strong>{Math.round(real * 100)}%</strong>.
        </>
      );
    if (offered < 0.6)
      return (
        <>
          At {percent}% of capacity, requests rarely wait: about{" "}
          <strong>{Math.round(ms)} ms</strong> each. Drag the load up.
        </>
      );
    return (
      <>
        At {percent}% of capacity, requests queue behind each other: about{" "}
        <strong>{Math.round(ms)} ms</strong> each, versus {SERVICE_MS} ms of real work.
      </>
    );
  })();

  return (
    <DiagramFrame
      title="The queueing cliff"
      narration={narration}
      controls={
        <>
          <label className="diagram-slider">
            <span>Load: {percent}% of capacity</span>
            <input
              type="range"
              min={5}
              max={97}
              step={1}
              value={percent}
              onChange={(e) => change(Number(e.target.value))}
            />
          </label>
          <DiagramButton active={retries} onClick={toggleRetries}>
            Clients retry on timeout
          </DiagramButton>
          {stuck && (
            <DiagramButton
              onClick={() => {
                setStuck(false);
                setPercent(40);
              }}
            >
              Reset the server
            </DiagramButton>
          )}
        </>
      }
      caption="Near full capacity, small increases in load cause huge waits. Retries without backoff can tip a busy system into an overload it can't escape."
    >
      <div ref={chartRef}>
        <svg
          className="q-chart"
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Response time rising sharply as load approaches capacity"
        >
          {[0, 500, 1000, 1500].map((v) => (
            <g key={v}>
              <line x1={x(0)} x2={x(100)} y1={y(v)} y2={y(v)} className="q-grid" />
              <text x={box.left - 8} y={y(v) + 4} className="q-axis" textAnchor="end">
                {v === 0 ? "0" : `${v / 1000}s`}
              </text>
            </g>
          ))}
          {[0, 50, 100].map((p) => (
            <text
              key={p}
              x={x(p)}
              y={CHART_HEIGHT - 6}
              className="q-axis"
              textAnchor={p === 0 ? "start" : p === 100 ? "end" : "middle"}
            >
              {p === 100 ? "100% of capacity" : `${p}%`}
            </text>
          ))}
          {retries && (
            <>
              <line
                x1={x(0)}
                x2={x(100)}
                y1={y(TIMEOUT_MS)}
                y2={y(TIMEOUT_MS)}
                className="q-timeout"
              />
              <text x={x(0) + 4} y={y(TIMEOUT_MS) - 6} className="q-tag">
                client timeout
              </text>
            </>
          )}
          <path d={curve} className="q-curve" />
          <circle cx={dotX} cy={dotY} r={6} className={overloaded ? "q-dot is-bad" : "q-dot"} />
        </svg>
      </div>
      <div className="q-queue" data-state={overloaded ? "bad" : "ok"}>
        <span className="q-queue-label">Waiting</span>
        <span className="q-queue-line">
          {Array.from({ length: waiting }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: identical dots
            <span key={i} className="q-req" />
          ))}
          {overloaded && <span className="q-more">and growing…</span>}
        </span>
        <span className="q-server">Server</span>
      </div>
      <p className="q-readout">
        Response time: <b>{overloaded ? "timeouts" : `${Math.round(ms)} ms`}</b>
        {retries && !overloaded && <> · retried {Math.round(timedOut(real) * 100)}%</>}
      </p>
    </DiagramFrame>
  );
}
