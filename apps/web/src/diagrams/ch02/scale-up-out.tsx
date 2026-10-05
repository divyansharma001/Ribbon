"use client";

import { type CSSProperties, useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";

/*
 * Made-up but honest shapes, not real prices:
 * - a machine with k times the hardware costs about k^1.5, and the biggest one has 8x;
 * - shared-disk machines lose some speed to locking as more of them share the disks;
 * - shared-nothing nodes add up linearly.
 */
const LOADS = [1, 2, 4, 8, 16];
const BIGGEST_MACHINE = 8;
const CONTENTION = 0.05;

interface Plan {
  ok: boolean;
  machines: number;
  cost: number;
  note: string;
}

function sharedMemory(load: number): Plan {
  if (load > BIGGEST_MACHINE)
    return { ok: false, machines: 1, cost: 0, note: "No machine this big is for sale." };
  return {
    ok: true,
    machines: 1,
    cost: load ** 1.5,
    note:
      load === 1
        ? "One machine, all threads share its RAM."
        : "A bigger machine costs more than its size.",
  };
}

function sharedDisk(load: number): Plan {
  for (let m = 1; m <= 64; m++) {
    if (m / (1 + CONTENTION * (m - 1)) >= load)
      return {
        ok: true,
        machines: m,
        cost: m,
        note:
          m > load
            ? `Locking on the shared disks wastes work: ${m} machines for ${load}x load.`
            : "Several machines share one disk array.",
      };
  }
  return {
    ok: false,
    machines: 0,
    cost: 0,
    note: "Contention on the shared disks caps it. More machines don't help.",
  };
}

function sharedNothing(load: number): Plan {
  return {
    ok: true,
    machines: load,
    cost: load,
    note:
      load === 1
        ? "Each node has its own CPU, RAM, and disk."
        : "Data must be split (sharded) across nodes.",
  };
}

const COLUMNS = [
  { key: "mem", title: "Shared-memory", sub: "scale up", plan: sharedMemory },
  { key: "disk", title: "Shared-disk", sub: "shared storage", plan: sharedDisk },
  { key: "nothing", title: "Shared-nothing", sub: "scale out", plan: sharedNothing },
] as const;

const MAX_DOTS = 24;

/** Ch 2, shared-memory, shared-disk, and shared-nothing: what doubling the load costs. */
export function ScaleUpOutDiagram() {
  const [step, setStep] = useState(0);
  const load = LOADS[step] ?? 1;

  return (
    <DiagramFrame
      title="Scaling up vs scaling out"
      narration={
        step === 0 ? (
          "Today's load fits on one machine. Double it and compare the three designs."
        ) : load > BIGGEST_MACHINE ? (
          <>
            At {load}x, only <strong>shared-nothing</strong> keeps going, at a price that grows in
            step with the load. In return you must shard the data and live with the problems of
            distributed systems.
          </>
        ) : (
          <>
            At <strong>{load}x</strong> the load, a single big machine costs{" "}
            {sharedMemory(load).cost.toFixed(1)}x as much, while shared-nothing costs {load}x.
          </>
        )
      }
      controls={
        <>
          <DiagramButton
            onClick={() => setStep((s) => Math.min(s + 1, LOADS.length - 1))}
            disabled={step === LOADS.length - 1}
          >
            Double the load
          </DiagramButton>
          <DiagramButton onClick={() => setStep(0)} disabled={step === 0}>
            Reset
          </DiagramButton>
        </>
      }
      caption="Scaling up is simplest until it gets expensive or hits the biggest machine. Scaling out can grow almost without limit, but brings the complexity of distributed systems. (Numbers are illustrative.)"
    >
      <p className="su-load">
        Load: <b>{load}x</b>
      </p>
      <div className="su-grid">
        {COLUMNS.map((c) => {
          const plan = c.plan(load);
          const dots = Math.min(plan.machines, MAX_DOTS);
          return (
            <div key={c.key} className="su-col" data-ok={plan.ok}>
              <p className="su-title">
                {c.title} <span>{c.sub}</span>
              </p>
              <div className="su-stage">
                {c.key === "mem" || !plan.ok ? (
                  <span
                    className="su-big"
                    style={
                      {
                        "--size": c.key === "mem" ? Math.min(load, BIGGEST_MACHINE) : 4,
                      } as CSSProperties
                    }
                  >
                    {plan.ok ? `${load}x` : "?"}
                  </span>
                ) : (
                  <div className="su-dots">
                    {Array.from({ length: dots }, (_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: identical machines
                      <span key={i} className={`su-dot ${c.key === "nothing" ? "has-disk" : ""}`} />
                    ))}
                    {plan.machines > MAX_DOTS && (
                      <span className="su-more">+{plan.machines - MAX_DOTS}</span>
                    )}
                  </div>
                )}
                {c.key === "disk" && <span className="su-array">Shared disk array</span>}
              </div>
              <p className="su-cost">
                {plan.ok ? (
                  <>
                    Cost <b>{plan.cost.toFixed(plan.cost % 1 ? 1 : 0)}x</b> · {plan.machines}{" "}
                    {plan.machines === 1 ? "machine" : "machines"}
                  </>
                ) : (
                  <b>Can't handle {load}x</b>
                )}
              </p>
              <p className="su-note">{plan.note}</p>
            </div>
          );
        })}
      </div>
    </DiagramFrame>
  );
}
