"use client";

import { useState } from "react";
import { FlowCanvas, type FlowEdge, type FlowNode } from "../flow";
import { DiagramButton, DiagramFrame } from "../frame";
import { AppIcon, BatchIcon, DatabaseIcon, PersonIcon, SearchIcon } from "../icons";

type View = "warehouse" | "lake" | "both";

const VIEWS: Record<
  View,
  { button: string; nodes: FlowNode[]; edges: FlowEdge[]; holds: string[]; text: string }
> = {
  warehouse: {
    button: "Data warehouse",
    nodes: [
      { id: "ops", label: "Operational DBs", icon: <DatabaseIcon />, x: 12, y: 50 },
      { id: "dwh", label: "Warehouse", icon: <AppIcon />, x: 50, y: 50 },
      { id: "ba", label: "Business analyst", icon: <PersonIcon />, x: 86, y: 50 },
    ],
    edges: [
      { from: "ops", to: "dwh" },
      { from: "dwh", to: "ba" },
    ],
    holds: ["orders table", "customers table", "stores table"],
    text: "A warehouse holds tidy relational tables queried with SQL. Great for business reports; awkward for training ML models.",
  },
  lake: {
    button: "Data lake",
    nodes: [
      { id: "ops", label: "Operational DBs", icon: <DatabaseIcon />, x: 12, y: 50 },
      { id: "lake", label: "Data lake", icon: <BatchIcon />, x: 50, y: 50 },
      { id: "ds", label: "Data scientist", icon: <PersonIcon />, x: 86, y: 50 },
    ],
    edges: [
      { from: "ops", to: "lake" },
      { from: "lake", to: "ds" },
    ],
    holds: ["orders.parquet", "events.avro", "reviews.txt", "photos/", "features.npy"],
    text: "A lake is just files, in any format, with no fixed schema. Data scientists use Python, R, or Spark on them, and it is cheap to store on object storage.",
  },
  both: {
    button: "Lake on the way",
    nodes: [
      { id: "ops", label: "Operational DBs", icon: <DatabaseIcon />, x: 11, y: 50 },
      { id: "lake", label: "Data lake (raw)", icon: <BatchIcon />, x: 36, y: 50 },
      { id: "dwh", label: "Warehouse", icon: <AppIcon />, x: 62, y: 22 },
      { id: "ds", label: "Data scientist", icon: <SearchIcon />, x: 62, y: 80 },
      { id: "ba", label: "Business analyst", icon: <PersonIcon />, x: 88, y: 22 },
    ],
    edges: [
      { from: "ops", to: "lake" },
      { from: "lake", to: "dwh" },
      { from: "lake", to: "ds" },
      { from: "dwh", to: "ba" },
    ],
    holds: ["raw, untransformed copies of everything"],
    text: "Often the lake is a stop on the way: raw data lands there first, and each consumer shapes it the way they need. “Raw data is better” (the sushi principle).",
  },
};

/** Ch 1, data lake section: warehouse vs lake, and the lake as a stop on the way. */
export function LakeDiagram() {
  const [view, setView] = useState<View>("warehouse");
  const v = VIEWS[view];
  return (
    <DiagramFrame
      title="Warehouse or lake?"
      narration={v.text}
      controls={(Object.keys(VIEWS) as View[]).map((k) => (
        <DiagramButton key={k} active={view === k} onClick={() => setView(k)}>
          {VIEWS[k].button}
        </DiagramButton>
      ))}
      caption="Analysts want tidy tables; data scientists want raw files. Many companies keep both."
    >
      <FlowCanvas
        nodes={v.nodes}
        edges={v.edges}
        active={v.nodes.map((n) => n.id)}
        aspect="16 / 7"
      />
      <div className="lake-holds">
        <span className="lake-holds-label">Inside:</span>
        {v.holds.map((h) => (
          <span key={h} className="lake-chip">
            {h}
          </span>
        ))}
      </div>
    </DiagramFrame>
  );
}
