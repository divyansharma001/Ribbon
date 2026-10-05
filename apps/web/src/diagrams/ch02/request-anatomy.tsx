"use client";

import { useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";

type Scenario = "quiet" | "busy" | "blocked";

interface Part {
  kind: "net" | "queue" | "service";
  label: string;
  ms: number;
}

const SCENARIOS: Record<Scenario, { button: string; ahead: number[]; text: string }> = {
  quiet: {
    button: "Quiet server",
    ahead: [],
    text: "Nothing is ahead of your request, so it starts at once. Most of the wait is travel over the network.",
  },
  busy: {
    button: "Busy server",
    ahead: [30, 30],
    text: "Two ordinary requests are ahead. Yours waits in the queue for them, then takes its own 30 ms.",
  },
  blocked: {
    button: "Slow request ahead",
    ahead: [400],
    text: "One slow request is ahead. Your request needs only 30 ms of work, but it waits 400 ms behind it. This is head-of-line blocking.",
  },
};

const NET_MS = 20;
const SERVICE_MS = 30;
const SCALE_MS = 520;

/** Ch 2, latency and response time: what the client waits for, piece by piece. */
export function RequestAnatomyDiagram() {
  const [scenario, setScenario] = useState<Scenario>("quiet");
  const s = SCENARIOS[scenario];
  const queue = s.ahead.reduce((a, b) => a + b, 0);
  const parts: Part[] = [
    { kind: "net", label: "network", ms: NET_MS },
    ...(queue > 0 ? [{ kind: "queue" as const, label: "queue", ms: queue }] : []),
    { kind: "service", label: "service", ms: SERVICE_MS },
    { kind: "net", label: "network", ms: NET_MS },
  ];
  const total = parts.reduce((a, p) => a + p.ms, 0);

  return (
    <DiagramFrame
      title="What makes up a response time"
      narration={s.text}
      controls={(Object.keys(SCENARIOS) as Scenario[]).map((k) => (
        <DiagramButton key={k} active={scenario === k} onClick={() => setScenario(k)}>
          {SCENARIOS[k].button}
        </DiagramButton>
      ))}
      caption="The server only sees its own service time. Queueing and network delays are invisible to it, so measure response time on the client."
    >
      <div className="ra">
        <div className="ra-server">
          <span className="ra-row-label">At the server</span>
          <div className="ra-line">
            {s.ahead.map((ms, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed per scenario
                key={`${scenario}-${i}`}
                className={`ra-job ${ms > 100 ? "is-slow" : ""}`}
                style={{ flexBasis: `${(ms / SCALE_MS) * 100}%` }}
              >
                {ms > 100 ? `slow request, ${ms} ms` : `${ms} ms`}
              </span>
            ))}
            <span
              className="ra-job is-yours"
              style={{ flexBasis: `${(SERVICE_MS / SCALE_MS) * 100}%` }}
            >
              yours
            </span>
          </div>
        </div>

        <div className="ra-client">
          <span className="ra-row-label">What you wait for</span>
          <div key={scenario} className="ra-bar">
            {parts.map((p, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: parts have a fixed order
                key={i}
                className={`ra-part is-${p.kind}`}
                style={{
                  flexBasis: `${(p.ms / SCALE_MS) * 100}%`,
                  animationDelay: `${i * 120}ms`,
                }}
                title={`${p.label}: ${p.ms} ms`}
              >
                <span className="ra-part-text">{p.ms >= 100 ? p.label : ""}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="ra-totals">
          <span className="ra-total">
            Server says: <b>{SERVICE_MS} ms</b>
          </span>
          <span className={`ra-total ${total > 200 ? "is-bad" : ""}`}>
            You waited: <b>{total} ms</b>
          </span>
        </div>
        <div className="ra-legend">
          <span className="ra-key is-net">Network latency</span>
          <span className="ra-key is-queue">Queueing delay</span>
          <span className="ra-key is-service">Service time</span>
        </div>
      </div>
    </DiagramFrame>
  );
}
