"use client";

import { useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";

const HOURS = 24;
const MACHINE = 10; // load one machine can handle

/** A day of load: quiet at night, busy in the day, with a sharp peak in the evening. */
function loadCurve(spiky: number): number[] {
  return Array.from({ length: HOURS }, (_, h) => {
    const day = Math.max(0, Math.sin(((h - 6) / 24) * Math.PI * 2)) * 30;
    const peak = Math.exp(-((h - 20) ** 2) / 3) * 70 * spiky;
    return 8 + day * (0.6 + 0.4 * (1 - spiky)) + peak;
  });
}

type Mode = "own" | "cloud";

/** Ch 1, variable load: machines sized for the peak sit idle; the cloud follows the load. */
export function ElasticityDiagram() {
  const [spiky, setSpiky] = useState(0.6);
  const [mode, setMode] = useState<Mode>("own");
  const load = loadCurve(spiky);
  const peak = Math.max(...load);

  const capacity =
    mode === "own"
      ? load.map(() => Math.ceil(peak / MACHINE) * MACHINE)
      : load.map((l) => Math.ceil(l / MACHINE) * MACHINE);
  const used = load.reduce((s, l) => s + l, 0);
  const paid = capacity.reduce((s, c) => s + c, 0);
  const idle = Math.round((1 - used / paid) * 100);
  const machineHours = Math.round(paid / MACHINE);

  // Chart coordinates: 0..100 wide, 0..60 tall.
  const top = Math.ceil((peak * 1.15) / MACHINE) * MACHINE;
  const x = (h: number) => (h / (HOURS - 1)) * 100;
  const y = (v: number) => 60 - (v / top) * 60;
  const loadPath = load.map((l, h) => `${h === 0 ? "M" : "L"}${x(h)},${y(l)}`).join(" ");
  const capPath = capacity
    .map((c, h) => {
      const x0 = h === 0 ? 0 : x(h - 0.5);
      const x1 = h === HOURS - 1 ? 100 : x(h + 0.5);
      return `${h === 0 ? "M" : "L"}${x0},${y(c)} L${x1},${y(c)}`;
    })
    .join(" ");
  const idleArea = `${capPath} L100,${y(load.at(-1) ?? 0)} ${[...load]
    .reverse()
    .map((l, i) => `L${x(HOURS - 1 - i)},${y(l)}`)
    .join(" ")} Z`;

  return (
    <DiagramFrame
      title="Paying for the peak"
      narration={
        mode === "own" ? (
          <>
            Your own machines must handle the busiest hour, so you pay for{" "}
            <strong>{machineHours} machine-hours</strong> a day and <strong>{idle}%</strong> of it
            sits idle.
          </>
        ) : (
          <>
            In the cloud, capacity follows the load hour by hour:{" "}
            <strong>{machineHours} machine-hours</strong>, only <strong>{idle}%</strong> idle.
          </>
        )
      }
      controls={
        <>
          <DiagramButton active={mode === "own"} onClick={() => setMode("own")}>
            Own machines
          </DiagramButton>
          <DiagramButton active={mode === "cloud"} onClick={() => setMode("cloud")}>
            Cloud
          </DiagramButton>
          <label className="diagram-slider">
            <span>How spiky is the load?</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={spiky}
              onChange={(e) => setSpiky(Number(e.target.value))}
            />
          </label>
        </>
      }
      caption="The spikier the load, the more you save by renting capacity only when you need it. With steady load, owning machines is often cheaper."
    >
      <svg
        className="elastic-chart"
        viewBox="-8 -4 112 74"
        role="img"
        aria-label="Load over a day against paid capacity"
      >
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={x(h)} y={68} className="elastic-axis" textAnchor="middle">
            {h === 23 ? "24h" : `${h}h`}
          </text>
        ))}
        <path d={idleArea} className="elastic-idle" />
        <path d={capPath} className="elastic-cap" />
        <path d={loadPath} className="elastic-load" />
        <text x={-6} y={y(capacity[0] ?? 0) - 1.5} className="elastic-tag">
          paid
        </text>
      </svg>
      <div className="elastic-legend">
        <span className="elastic-key is-load">Load</span>
        <span className="elastic-key is-cap">Capacity you pay for</span>
        <span className="elastic-key is-idle">Idle</span>
      </div>
    </DiagramFrame>
  );
}
