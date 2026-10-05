"use client";

import { useState } from "react";
import { FlowCanvas, type FlowEdge, type FlowNode, type Packet, type Tone } from "../flow";
import { DiagramButton, DiagramFrame } from "../frame";
import { AppIcon, BatchIcon, DatabaseIcon, PersonIcon } from "../icons";
import { useStepPlayer } from "../use-steps";

const nodes: FlowNode[] = [
  { id: "shop", label: "Store tills", icon: <DatabaseIcon />, x: 11, y: 16 },
  { id: "web", label: "Website", icon: <DatabaseIcon />, x: 11, y: 50 },
  { id: "stock", label: "Inventory", icon: <DatabaseIcon />, x: 11, y: 84 },
  { id: "etl", label: "ETL job", icon: <BatchIcon />, x: 40, y: 50 },
  { id: "dwh", label: "Warehouse", icon: <AppIcon />, x: 67, y: 50 },
  { id: "analyst", label: "Analyst", icon: <PersonIcon />, x: 90, y: 50 },
];

const edges: FlowEdge[] = [
  { from: "shop", to: "etl" },
  { from: "web", to: "etl" },
  { from: "stock", to: "etl" },
  { from: "etl", to: "dwh" },
  { from: "dwh", to: "analyst" },
];

interface Step {
  text: string;
  packet?: { from: string; to: string; label?: string; tone?: Tone };
  active: string[];
  badge?: { node: string; text: string; tone: Tone };
}

const extract: Step[] = [
  {
    text: "Extract: copy sales out of the store tills' database (a nightly dump or a stream of changes).",
    packet: { from: "shop", to: "etl", label: "sales" },
    active: ["shop", "etl"],
  },
  {
    text: "Extract: copy visits and orders from the website's database.",
    packet: { from: "web", to: "etl", label: "orders" },
    active: ["web", "etl"],
  },
  {
    text: "Extract: copy stock levels from the inventory system.",
    packet: { from: "stock", to: "etl", label: "stock" },
    active: ["stock", "etl"],
  },
];

const SCENARIOS: Record<"etl" | "elt", { button: string; steps: Step[] }> = {
  etl: {
    button: "Run ETL",
    steps: [
      ...extract,
      {
        text: "Transform: clean it up and reshape it into an analysis-friendly schema, before it reaches the warehouse.",
        active: ["etl"],
        badge: { node: "etl", text: "cleaning", tone: "warn" },
      },
      {
        text: "Load: put the cleaned copy into the data warehouse. The operational databases are never touched by analysts.",
        packet: { from: "etl", to: "dwh", label: "load", tone: "ok" },
        active: ["etl", "dwh"],
        badge: { node: "dwh", text: "loaded", tone: "ok" },
      },
      {
        text: "An analyst asks a big question of the warehouse, as often as they like, without slowing the shop down.",
        packet: { from: "analyst", to: "dwh", label: "query" },
        active: ["analyst", "dwh"],
      },
      {
        text: "The answer comes back as a report.",
        packet: { from: "dwh", to: "analyst", label: "report", tone: "ok" },
        active: ["dwh", "analyst"],
      },
    ],
  },
  elt: {
    button: "Run ELT",
    steps: [
      ...extract,
      {
        text: "ELT swaps the last two steps: the raw data is loaded first…",
        packet: { from: "etl", to: "dwh", label: "raw" },
        active: ["etl", "dwh"],
      },
      {
        text: "…and transformed inside the warehouse, after loading.",
        active: ["dwh"],
        badge: { node: "dwh", text: "transforming", tone: "warn" },
      },
      {
        text: "Analysts query the warehouse as before.",
        packet: { from: "analyst", to: "dwh", label: "query" },
        active: ["analyst", "dwh"],
      },
    ],
  },
};

/** Ch 1, after Figure 1-1: how data gets from operational systems into a warehouse. */
export function EtlDiagram() {
  const player = useStepPlayer<Step>(1600);
  const [scenario, setScenario] = useState<"etl" | "elt" | null>(null);
  const step = player.step;

  const badges: Record<string, { text: string; tone: Tone }> = {};
  for (const s of player.steps.slice(0, player.index + 1)) {
    if (s.badge) badges[s.badge.node] = { text: s.badge.text, tone: s.badge.tone };
  }
  const packet: Packet | undefined = step?.packet && {
    key: `${scenario}-${player.index}`,
    from: step.packet.from,
    to: step.packet.to,
    ...(step.packet.label ? { label: step.packet.label } : {}),
    ...(step.packet.tone ? { tone: step.packet.tone } : {}),
  };

  return (
    <DiagramFrame
      title="Getting data into the warehouse"
      narration={
        step ? (
          <>
            <span className="diagram-step">
              {player.index + 1}/{player.steps.length}
            </span>
            {step.text}
          </>
        ) : (
          "Run ETL to watch data move from the operational systems into the warehouse."
        )
      }
      controls={
        <>
          {(Object.keys(SCENARIOS) as ("etl" | "elt")[]).map((s) => (
            <DiagramButton
              key={s}
              active={scenario === s && player.playing}
              onClick={() => {
                setScenario(s);
                player.run(SCENARIOS[s].steps);
              }}
            >
              {SCENARIOS[s].button}
            </DiagramButton>
          ))}
          {player.steps.length > 0 && !player.playing && !player.done && (
            <DiagramButton onClick={player.next}>Next step</DiagramButton>
          )}
        </>
      }
      caption="Extract, transform, load: analysts get their own copy, so heavy queries never slow down the systems customers use."
    >
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        active={step?.active ?? []}
        badges={badges}
        packet={packet}
        aspect="16 / 9"
      />
    </DiagramFrame>
  );
}
