"use client";

import { useState } from "react";
import { FlowCanvas, type FlowEdge, type FlowNode, type Packet, type Tone } from "../flow";
import { DiagramButton, DiagramFrame } from "../frame";
import {
  AppIcon,
  BatchIcon,
  CacheIcon,
  DatabaseIcon,
  PersonIcon,
  SearchIcon,
  StreamIcon,
} from "../icons";
import { useStepPlayer } from "../use-steps";

const nodes: FlowNode[] = [
  { id: "you", label: "You", icon: <PersonIcon />, x: 10, y: 50 },
  { id: "app", label: "App", icon: <AppIcon />, x: 34, y: 50 },
  { id: "cache", label: "Cache", icon: <CacheIcon />, x: 62, y: 15 },
  { id: "db", label: "Database", icon: <DatabaseIcon />, x: 62, y: 50 },
  { id: "batch", label: "Batch job", icon: <BatchIcon />, x: 62, y: 85 },
  { id: "stream", label: "Stream", icon: <StreamIcon />, x: 89, y: 50 },
  { id: "search", label: "Search", icon: <SearchIcon />, x: 89, y: 85 },
];

const edges: FlowEdge[] = [
  { from: "you", to: "app" },
  { from: "app", to: "cache" },
  { from: "app", to: "db" },
  { from: "db", to: "stream" },
  { from: "stream", to: "search" },
  { from: "stream", to: "batch" },
];

interface Step {
  text: string;
  from: string;
  to: string;
  label?: string;
  tone?: Tone;
  badge?: { node: string; text: string; tone: Tone };
}

type Scenario = "read" | "readAgain" | "write";

const SCENARIOS: Record<Scenario, { button: string; steps: Step[] }> = {
  read: {
    button: "Read",
    steps: [
      {
        text: "You open your profile. The app needs your data.",
        from: "you",
        to: "app",
        label: "get",
      },
      {
        text: "The app checks the cache first. Your data isn’t there yet: a cache miss.",
        from: "app",
        to: "cache",
        badge: { node: "cache", text: "miss", tone: "warn" },
      },
      { text: "So it asks the database, where data is kept for good.", from: "app", to: "db" },
      {
        text: "The database sends your data back.",
        from: "db",
        to: "app",
        label: "data",
        tone: "ok",
      },
      {
        text: "The app saves a copy in the cache, so next time is faster.",
        from: "app",
        to: "cache",
        label: "copy",
        tone: "ok",
        badge: { node: "cache", text: "saved", tone: "ok" },
      },
      { text: "You see your profile.", from: "app", to: "you", label: "page", tone: "ok" },
    ],
  },
  readAgain: {
    button: "Read again",
    steps: [
      { text: "You open your profile again.", from: "you", to: "app", label: "get" },
      {
        text: "This time the cache has it: a cache hit. No trip to the database.",
        from: "app",
        to: "cache",
        badge: { node: "cache", text: "hit", tone: "ok" },
      },
      {
        text: "The copy comes straight from the cache.",
        from: "cache",
        to: "app",
        label: "data",
        tone: "ok",
      },
      {
        text: "You see your profile, faster than before.",
        from: "app",
        to: "you",
        label: "page",
        tone: "ok",
      },
    ],
  },
  write: {
    button: "Write",
    steps: [
      { text: "You publish a new post.", from: "you", to: "app", label: "post" },
      {
        text: "The app saves it in the database. This is the real, lasting copy.",
        from: "app",
        to: "db",
        label: "save",
        badge: { node: "db", text: "saved", tone: "ok" },
      },
      {
        text: "The old copy in the cache is cleared, so nobody sees stale data.",
        from: "app",
        to: "cache",
        badge: { node: "cache", text: "cleared", tone: "warn" },
      },
      {
        text: "The change also goes out as a message on a stream, so other systems can react.",
        from: "db",
        to: "stream",
        label: "event",
      },
      {
        text: "The search index picks it up, so people can find your post.",
        from: "stream",
        to: "search",
        badge: { node: "search", text: "updated", tone: "ok" },
      },
      {
        text: "A batch job collects many changes and works through them later, like a nightly report.",
        from: "stream",
        to: "batch",
        badge: { node: "batch", text: "tonight", tone: "muted" },
      },
    ],
  },
};

/** Ch 1 intro: how databases, caches, search, streams, and batch jobs work together. */
export function BuildingBlocksDiagram() {
  const player = useStepPlayer<Step>(1500);
  const [scenario, setScenario] = useState<Scenario | null>(null);

  const play = (s: Scenario) => {
    setScenario(s);
    player.run(SCENARIOS[s].steps);
  };

  // Badges stay up for the rest of the run, so you can see the end state.
  const badges: Record<string, { text: string; tone: Tone }> = {};
  for (const step of player.steps.slice(0, player.index + 1)) {
    if (step.badge) badges[step.badge.node] = { text: step.badge.text, tone: step.badge.tone };
  }
  const step = player.step;
  const packet: Packet | undefined = step && {
    key: `${scenario}-${player.index}`,
    from: step.from,
    to: step.to,
    ...(step.label ? { label: step.label } : {}),
    ...(step.tone ? { tone: step.tone } : {}),
  };

  return (
    <DiagramFrame
      title="The building blocks of a data system"
      narration={
        step ? (
          <>
            <span className="diagram-step">
              {player.index + 1}/{player.steps.length}
            </span>
            {step.text}
          </>
        ) : (
          "Pick an action to watch the pieces work together."
        )
      }
      controls={
        <>
          {(Object.keys(SCENARIOS) as Scenario[]).map((s) => (
            <DiagramButton
              key={s}
              active={scenario === s && player.playing}
              onClick={() => play(s)}
            >
              {SCENARIOS[s].button}
            </DiagramButton>
          ))}
          {player.steps.length > 0 && !player.playing && !player.done && (
            <DiagramButton onClick={player.next}>Next step</DiagramButton>
          )}
        </>
      }
      caption="Most apps glue these few parts together. Each one does a single job well."
    >
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        active={step ? [step.from, step.to] : []}
        badges={badges}
        packet={packet}
        aspect="16 / 10"
      />
    </DiagramFrame>
  );
}
