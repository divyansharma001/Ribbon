"use client";

import { type ReactNode, useEffect, useState } from "react";

/*
 * A boxes-and-arrows canvas. Positions are percentages of the stage, so the
 * same layout works on a phone and a desktop. Boxes are real HTML (text stays
 * readable at any width); lines are an SVG layer underneath.
 */

export type Tone = "accent" | "ok" | "warn" | "muted";

export interface FlowNode {
  id: string;
  label: string;
  icon: ReactNode;
  x: number;
  y: number;
}

export interface FlowEdge {
  from: string;
  to: string;
}

export interface Packet {
  /** Changing the key starts a new trip. */
  key: string;
  from: string;
  to: string;
  label?: string;
  tone?: Tone;
}

export function FlowCanvas({
  nodes,
  edges,
  active = [],
  badges = {},
  packet,
  aspect = "16 / 9",
  travelMs = 900,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Nodes to light up. */
  active?: string[];
  /** Small tags shown on nodes, e.g. { cache: { text: "miss", tone: "warn" } }. */
  badges?: Record<string, { text: string; tone: Tone }>;
  packet?: Packet | undefined;
  aspect?: string;
  travelMs?: number;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const activeEdge = packet ? `${packet.from}>${packet.to}` : null;

  return (
    <div className="flow" style={{ aspectRatio: aspect }}>
      <svg
        className="flow-lines"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {edges.map((e) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const lit = activeEdge === `${e.from}>${e.to}` || activeEdge === `${e.to}>${e.from}`;
          return (
            <line
              key={`${e.from}>${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={lit ? "flow-line is-lit" : "flow-line"}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {nodes.map((n) => (
        <div
          key={n.id}
          className={`flow-node ${active.includes(n.id) ? "is-active" : ""}`}
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        >
          <span className="flow-node-icon">{n.icon}</span>
          <span className="flow-node-label">{n.label}</span>
          {badges[n.id] && (
            <span className="flow-badge" data-tone={badges[n.id]?.tone}>
              {badges[n.id]?.text}
            </span>
          )}
        </div>
      ))}

      {packet && <PacketDot key={packet.key} packet={packet} byId={byId} travelMs={travelMs} />}
    </div>
  );
}

/** A dot that travels from one node to another. */
function PacketDot({
  packet,
  byId,
  travelMs,
}: {
  packet: Packet;
  byId: Map<string, FlowNode>;
  travelMs: number;
}) {
  const from = byId.get(packet.from);
  const to = byId.get(packet.to);
  const [arrived, setArrived] = useState(false);

  // Start at the source, then move on the next frame so the CSS transition runs.
  useEffect(() => {
    setArrived(false);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setArrived(true)));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!from || !to) return null;
  const at = arrived ? to : from;
  return (
    <span
      className="flow-packet"
      data-tone={packet.tone ?? "accent"}
      style={{ left: `${at.x}%`, top: `${at.y}%`, transitionDuration: `${travelMs}ms` }}
    >
      {packet.label && <span className="flow-packet-label">{packet.label}</span>}
    </span>
  );
}
