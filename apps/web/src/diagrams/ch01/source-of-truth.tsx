"use client";

import { useEffect, useRef, useState } from "react";
import { FlowCanvas, type FlowEdge, type FlowNode, type Packet, type Tone } from "../flow";
import { DiagramButton, DiagramFrame } from "../frame";
import { AppIcon, CacheIcon, DatabaseIcon, SearchIcon } from "../icons";
import { useReducedMotion } from "../use-steps";

const CITIES = ["Delhi", "Mumbai", "Pune", "Jaipur"];
const COPIES = [
  {
    id: "cache",
    label: "Cache",
    icon: <CacheIcon />,
    x: 82,
    y: 16,
    delay: 900,
    when: "a moment later",
  },
  {
    id: "search",
    label: "Search index",
    icon: <SearchIcon />,
    x: 82,
    y: 50,
    delay: 2200,
    when: "a few seconds later",
  },
  {
    id: "dwh",
    label: "Warehouse",
    icon: <AppIcon />,
    x: 82,
    y: 84,
    delay: 4200,
    when: "in tonight's ETL run",
  },
] as const;

const edges: FlowEdge[] = COPIES.map((c) => ({ from: "sor", to: c.id }));

/** Ch 1, systems of record: one source of truth, copies that catch up at different speeds. */
export function SourceOfTruthDiagram() {
  const reduced = useReducedMotion();
  const [truth, setTruth] = useState(0);
  const [copies, setCopies] = useState<Record<string, number | null>>({
    cache: 0,
    search: 0,
    dwh: 0,
  });
  const [packet, setPacket] = useState<Packet | undefined>();
  const [note, setNote] = useState(
    "The system of record holds the real value. The others are copies made from it.",
  );
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, reduced ? 0 : ms));
  };

  const change = () => {
    const next = (truth + 1) % CITIES.length;
    setTruth(next);
    setNote(
      `Asha moved to ${CITIES[next]}. The system of record changes first; every copy is now stale.`,
    );
    for (const c of COPIES) {
      later(c.delay - 700, () =>
        setPacket({
          key: `${c.id}-${next}`,
          from: "sor",
          to: c.id,
          label: CITIES[next] ?? "",
          tone: "ok",
        }),
      );
      later(c.delay, () => {
        setCopies((cur) => ({ ...cur, [c.id]: next }));
        setNote(`The ${c.label.toLowerCase()} caught up ${c.when}.`);
      });
    }
  };

  const loseCache = () => {
    setCopies((cur) => ({ ...cur, cache: null }));
    setNote(
      "The cache was lost. No harm done: it's derived data, so it can be rebuilt from the source…",
    );
    later(1200, () =>
      setPacket({
        key: `rebuild-${Date.now()}`,
        from: "sor",
        to: "cache",
        label: "rebuild",
        tone: "ok",
      }),
    );
    later(2000, () => {
      setCopies((cur) => ({ ...cur, cache: truth }));
      setNote("…and the cache is back, rebuilt from the system of record.");
    });
  };

  const badges: Record<string, { text: string; tone: Tone }> = {};
  for (const c of COPIES) {
    const v = copies[c.id];
    badges[c.id] =
      v === null
        ? { text: "empty", tone: "warn" }
        : v === truth
          ? { text: "fresh", tone: "ok" }
          : { text: "stale", tone: "warn" };
  }

  const nodes: FlowNode[] = [
    {
      id: "sor",
      label: `System of record\n${CITIES[truth]}`,
      icon: <DatabaseIcon />,
      x: 22,
      y: 50,
    },
    ...COPIES.map((c) => ({
      id: c.id,
      label: `${c.label}\n${copies[c.id] === null ? "(empty)" : CITIES[copies[c.id] ?? 0]}`,
      icon: c.icon,
      x: c.x,
      y: c.y,
    })),
  ];

  return (
    <DiagramFrame
      title="One source of truth, many copies"
      narration={note}
      controls={
        <>
          <DiagramButton onClick={change}>Change Asha's city</DiagramButton>
          <DiagramButton onClick={loseCache}>Lose the cache</DiagramButton>
        </>
      }
      caption="If a copy disagrees with the system of record, the system of record wins. Copies trade freshness for faster reads."
    >
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        active={["sor"]}
        badges={badges}
        packet={packet}
        aspect="16 / 9"
        phoneAspect="1 / 1"
      />
    </DiagramFrame>
  );
}
