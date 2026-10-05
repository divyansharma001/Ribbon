"use client";

import { useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";

const SLOW_CHANCE = 0.01;
const PAGES = 100;

/** Ch 2, use of response time metrics: one slow backend call makes the whole page slow. */
export function TailAmplificationDiagram() {
  const [calls, setCalls] = useState(10);
  // One sample page (which of its calls were slow) and a batch of 100 pages.
  const [page, setPage] = useState<boolean[] | null>(null);
  const [batch, setBatch] = useState<boolean[] | null>(null);

  const chance = 1 - (1 - SLOW_CHANCE) ** calls;
  const sample = (n: number) => Array.from({ length: n }, () => Math.random() < SLOW_CHANCE);

  const change = (n: number) => {
    setCalls(n);
    setPage(null);
    setBatch(null);
  };

  const pageSlow = page?.some(Boolean) ?? false;
  const slowPages = batch?.filter(Boolean).length ?? 0;

  const narration = batch ? (
    <>
      Out of 100 page loads, <strong>{slowPages}</strong> were slow, even though only 1 in 100
      backend calls is slow. Expect about {Math.round(chance * 100)}.
    </>
  ) : page ? (
    pageSlow ? (
      <>
        {page.filter(Boolean).length === 1 ? "One call" : "Some calls"} out of {calls} came back
        slow, so <strong>the whole page was slow</strong>: it has to wait for the slowest call.
      </>
    ) : (
      <>All {calls} calls were fast this time, so the page was fast.</>
    )
  ) : (
    <>
      Each page needs <strong>{calls}</strong> backend {calls === 1 ? "call" : "calls"}, made in
      parallel. Each call is slow only 1% of the time. Chance the page is slow:{" "}
      <strong>{Math.round(chance * 100)}%</strong>.
    </>
  );

  return (
    <DiagramFrame
      title="Tail latency amplification"
      narration={narration}
      controls={
        <>
          <label className="diagram-slider">
            <span>
              Backend calls per page: <b>{calls}</b>
            </span>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={calls}
              onChange={(e) => change(Number(e.target.value))}
            />
          </label>
          <DiagramButton
            onClick={() => {
              setBatch(null);
              setPage(sample(calls));
            }}
          >
            Load one page
          </DiagramButton>
          <DiagramButton
            onClick={() => {
              setPage(null);
              setBatch(Array.from({ length: PAGES }, () => sample(calls).some(Boolean)));
            }}
          >
            Load 100 pages
          </DiagramButton>
        </>
      }
      caption="The more backend calls a request needs, the more often it hits a slow one. That's why backend services care about p99 and p999."
    >
      <div className="ta">
        <div className="ta-meter" aria-hidden="true">
          <span className="ta-meter-fill" style={{ width: `${chance * 100}%` }} />
        </div>
        <p className="ta-meter-label">
          Chance a page is slow: <b>{(chance * 100).toFixed(chance < 0.1 ? 1 : 0)}%</b>
        </p>

        {batch ? (
          <>
            <p className="ta-label">100 page loads</p>
            <div className="ta-grid is-pages">
              {batch.map((slow, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: positions in a batch
                  key={i}
                  className={`ta-cell ${slow ? "is-slow" : ""}`}
                  style={{ animationDelay: `${i * 8}ms` }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="ta-label">
              {page ? (pageSlow ? "This page: slow" : "This page: fast") : "One page"}, {calls}{" "}
              backend {calls === 1 ? "call" : "calls"}
            </p>
            <div className="ta-grid">
              {Array.from({ length: calls }, (_, i) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: one box per call
                  key={i}
                  className={`ta-cell ${page?.[i] ? "is-slow" : page ? "is-fast" : ""}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DiagramFrame>
  );
}
