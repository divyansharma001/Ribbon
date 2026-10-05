"use client";

import { useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";
import { useWidth } from "../use-steps";

/** A small seeded random generator, so the bars look the same on every visit. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 100 response times in ms: mostly 80-250 ms, with a long tail. */
const BASE: number[] = (() => {
  const rand = seeded(7);
  return Array.from({ length: 100 }, () => {
    const r = rand();
    const body = 70 + rand() * 90 + rand() * 90;
    return Math.round(r > 0.9 ? body + (r - 0.9) * 9000 : body);
  });
})();
/** The same requests with a few extreme outliers (say, garbage collection pauses). */
const OUTLIERS = BASE.map((v, i) => ([13, 41, 77].includes(i) ? v + 2600 + i * 10 : v));

const CHART_HEIGHT = 170;
const CHART_TOP = 22;

type Stat = "mean" | "p50" | "p95" | "p99";

const STATS: Record<Stat, { label: string; p?: number }> = {
  mean: { label: "Mean" },
  p50: { label: "p50 (median)", p: 50 },
  p95: { label: "p95", p: 95 },
  p99: { label: "p99", p: 99 },
};

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}
const mean = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) / values.length);
const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`);

/** Ch 2, average, median, and percentiles. */
export function PercentilesDiagram() {
  const [stat, setStat] = useState<Stat>("p50");
  const [sorted, setSorted] = useState(false);
  const [outliers, setOutliers] = useState(false);
  const [chartRef, width] = useWidth<HTMLDivElement>();

  const data = outliers ? OUTLIERS : BASE;
  const shown = sorted ? [...data].sort((a, b) => a - b) : data;
  const values: Record<Stat, number> = {
    mean: mean(data),
    p50: percentile(data, 50),
    p95: percentile(data, 95),
    p99: percentile(data, 99),
  };
  const line = values[stat];
  const slower = data.filter((v) => v > line).length;
  // Chart, in pixels. Room at the top for the line's label.
  const top = Math.max(...data);
  const y = (v: number) => CHART_TOP + (1 - v / top) * (CHART_HEIGHT - CHART_TOP);
  const step = width / shown.length;

  const narration = (() => {
    const p = STATS[stat].p;
    if (stat === "mean")
      return outliers ? (
        <>
          Three outliers pulled the mean up to <strong>{fmtMs(line)}</strong>, yet {100 - slower} of
          100 requests were faster than that. The mean describes nobody.
        </>
      ) : (
        <>
          The mean is <strong>{fmtMs(line)}</strong>: add up all the times and divide by 100. It is
          useful for capacity sums, but doesn't say what a typical user saw.
        </>
      );
    if (p === 50)
      return (
        <>
          Half the requests are faster than <strong>{fmtMs(line)}</strong> and half are slower.
          That's the typical wait.
          {outliers && " The outliers barely moved it."}
        </>
      );
    return (
      <>
        {p} of 100 requests take <strong>{fmtMs(line)}</strong> or less. The slowest {slower}{" "}
        (highlighted) are the tail.
      </>
    );
  })();

  return (
    <DiagramFrame
      title="Mean, median, and percentiles"
      narration={narration}
      controls={
        <>
          {(Object.keys(STATS) as Stat[]).map((k) => (
            <DiagramButton key={k} active={stat === k} onClick={() => setStat(k)}>
              {STATS[k].label}
            </DiagramButton>
          ))}
          <DiagramButton active={sorted} onClick={() => setSorted((s) => !s)}>
            Sort fastest to slowest
          </DiagramButton>
          <DiagramButton active={outliers} onClick={() => setOutliers((o) => !o)}>
            Add 3 outliers
          </DiagramButton>
        </>
      }
      caption="Report percentiles, not just the mean. The median shows the typical wait; p95 and p99 show how bad the slow tail is."
    >
      <div ref={chartRef}>
        <svg
          className="pc-chart"
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`Response times of 100 requests, with a line at the ${STATS[stat].label}`}
        >
          {shown.map((v, i) => (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: bars are positions
              key={i}
              x={i * step + step * 0.12}
              width={step * 0.76}
              y={y(v)}
              height={CHART_HEIGHT - y(v)}
              className={
                v > line && stat !== "p50" && stat !== "mean" ? "pc-bar is-tail" : "pc-bar"
              }
            />
          ))}
          <line x1={0} x2={width} y1={y(line)} y2={y(line)} className="pc-line" />
          <text x={2} y={y(line) - 7} className="pc-tag">
            {STATS[stat].label}: {fmtMs(line)}
          </text>
        </svg>
      </div>
      <div className="pc-stats">
        {(Object.keys(STATS) as Stat[]).map((k) => (
          <span key={k} className={`pc-stat ${stat === k ? "is-active" : ""}`}>
            {STATS[k].label} <b>{fmtMs(values[k])}</b>
          </span>
        ))}
      </div>
    </DiagramFrame>
  );
}
