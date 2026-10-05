"use client";

import { useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";

type Event = "none" | "fail" | "load";

/** Ch 1, separation of storage and compute: what happens when a machine fails or load grows. */
export function StorageComputeDiagram() {
  const [event, setEvent] = useState<Event>("none");

  const notes: Record<Event, { classic: string; cloud: string }> = {
    none: {
      classic: "One machine does both jobs: its CPU computes and its own disk stores the data.",
      cloud: "Compute nodes do the work; the data lives in a separate object store (like S3).",
    },
    fail: {
      classic:
        "The machine dies and the data on its disk goes offline with it until it's repaired.",
      cloud:
        "A compute node dies. A new one starts and reads the very same data from the object store.",
    },
    load: {
      classic:
        "To handle more load you need a bigger machine, and the data has to be copied over to it.",
      cloud: "Just add compute nodes. The storage doesn't change or move.",
    },
  };

  return (
    <DiagramFrame
      title="Storage and compute: together or apart"
      narration={
        event === "none"
          ? "Try a failure or more load and compare the two designs."
          : event === "fail"
            ? "One machine fails in each design. Compare what happens to the data."
            : "Three times more users show up. Compare how each design grows."
      }
      controls={
        <>
          <DiagramButton active={event === "fail"} onClick={() => setEvent("fail")}>
            A machine fails
          </DiagramButton>
          <DiagramButton active={event === "load"} onClick={() => setEvent("load")}>
            More load
          </DiagramButton>
          <DiagramButton onClick={() => setEvent("none")}>Reset</DiagramButton>
        </>
      }
      caption="Cloud native systems split storage from compute, so either can fail, grow, or shrink on its own. The price: data travels over the network."
    >
      <div className="sc-grid">
        <div className="sc-panel">
          <p className="sc-title">Traditional</p>
          <div className="sc-stage">
            <div
              className={`sc-machine ${event === "load" ? "is-big" : ""}`}
              data-state={event === "fail" ? "down" : "up"}
            >
              <span className="sc-part">CPU + RAM</span>
              <span className="sc-part sc-disk">Disk: your data</span>
              {event === "fail" && <span className="sc-flag">offline</span>}
              {event === "load" && <span className="sc-flag is-warn">copying data…</span>}
            </div>
          </div>
          <p className="sc-note">{notes[event].classic}</p>
        </div>

        <div className="sc-panel">
          <p className="sc-title">Cloud native</p>
          <div className="sc-stage">
            <div className="sc-nodes">
              <span className="sc-node" data-state={event === "fail" ? "down" : "up"}>
                Compute 1
              </span>
              <span className="sc-node">Compute 2</span>
              {event === "fail" && <span className="sc-node is-new">Compute 3 (new)</span>}
              {event === "load" && (
                <>
                  <span className="sc-node is-new">Compute 3</span>
                  <span className="sc-node is-new">Compute 4</span>
                </>
              )}
            </div>
            <div className="sc-link" aria-hidden="true" />
            <div className="sc-store">Object storage: your data</div>
          </div>
          <p className="sc-note">{notes[event].cloud}</p>
        </div>
      </div>
    </DiagramFrame>
  );
}
