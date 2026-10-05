"use client";

import { useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";

interface Part {
  id: string;
  label: string;
  tier: "lb" | "app" | "disk";
}

const PARTS: Part[] = [
  { id: "lb", label: "Load balancer", tier: "lb" },
  { id: "app1", label: "App 1", tier: "app" },
  { id: "app2", label: "App 2", tier: "app" },
  { id: "app3", label: "App 3", tier: "app" },
  { id: "disk1", label: "Copy 1", tier: "disk" },
  { id: "disk2", label: "Copy 2", tier: "disk" },
  { id: "disk3", label: "Copy 3", tier: "disk" },
];

const TIERS: { tier: Part["tier"]; label: string }[] = [
  { tier: "lb", label: "Front door" },
  { tier: "app", label: "App servers" },
  { tier: "disk", label: "Data (3 copies)" },
];

/** Ch 2, fault tolerance: faults in parts, and when they become a failure of the whole. */
export function FaultFailureDiagram() {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<string | null>(null);

  const toggle = (id: string) => {
    const next = new Set(broken);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setBroken(next);
    setLast(next.has(id) ? id : null);
  };
  const injectRandom = () => {
    const healthy = PARTS.filter((p) => !broken.has(p.id));
    const pick = healthy[Math.floor(Math.random() * healthy.length)];
    if (pick) toggle(pick.id);
  };

  const upIn = (tier: Part["tier"]) =>
    PARTS.filter((p) => p.tier === tier && !broken.has(p.id)).length;
  const deadTier = TIERS.find((t) => upIn(t.tier) === 0);
  const status = deadTier ? "failure" : broken.size > 0 ? "fault" : "ok";
  const lastPart = PARTS.find((p) => p.id === last);

  const narration = (() => {
    if (status === "ok")
      return "Everything works. Click any part to break it, or inject a random fault.";
    if (deadTier?.tier === "lb")
      return (
        <>
          <strong>Failure.</strong> There is only one load balancer, so when it breaks no request
          gets in. It is a <strong>single point of failure</strong>.
        </>
      );
    if (deadTier)
      return (
        <>
          <strong>Failure.</strong> Every part in “{deadTier.label}” is broken. Fault tolerance has
          a limit: it can't survive losing all of them.
        </>
      );
    return (
      <>
        <strong>Fault, tolerated.</strong> {lastPart ? `${lastPart.label} is broken, but ` : ""}
        the others take over, so users notice nothing.
      </>
    );
  })();

  return (
    <DiagramFrame
      title="Fault or failure?"
      narration={narration}
      controls={
        <>
          <DiagramButton onClick={injectRandom} disabled={broken.size === PARTS.length}>
            Inject a random fault
          </DiagramButton>
          <DiagramButton
            onClick={() => {
              setBroken(new Set());
              setLast(null);
            }}
          >
            Repair all
          </DiagramButton>
        </>
      }
      caption="A fault is one part breaking. A failure is users not being served. Fault-tolerant systems keep faults from becoming failures, up to a limit."
    >
      <div className="ff">
        <div className="ff-status" data-status={status}>
          {status === "ok" ? "Serving users" : status === "fault" ? "Serving users" : "Down"}
          <span className="ff-status-sub">
            {status === "ok"
              ? "no faults"
              : status === "fault"
                ? `${broken.size} ${broken.size === 1 ? "fault" : "faults"} tolerated`
                : "failure"}
          </span>
        </div>
        {TIERS.map((t) => (
          <div key={t.tier} className="ff-tier">
            <span className="ff-tier-label">{t.label}</span>
            <div className="ff-parts">
              {PARTS.filter((p) => p.tier === t.tier).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ff-part"
                  data-state={broken.has(p.id) ? "down" : "up"}
                  aria-pressed={broken.has(p.id)}
                  aria-label={`${p.label}, ${broken.has(p.id) ? "broken" : "working"}`}
                  onClick={() => toggle(p.id)}
                >
                  {p.label}
                  {p.tier === "lb" && <span className="ff-spof">only one</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DiagramFrame>
  );
}
