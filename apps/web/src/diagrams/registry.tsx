import type { ComponentType } from "react";
import { BuildingBlocksDiagram } from "./ch01/building-blocks";
import { OltpOlapDiagram } from "./ch01/oltp-olap";

export interface DiagramPlacement {
  id: string;
  /** The diagram is shown right after this block. */
  afterBlockId: string;
  /** Fingerprint of that block's text. If the book is re-imported and it changes, check the placement. */
  blockHash: string;
  Component: ComponentType;
}

/** Ribbon diagrams per book and chapter. */
export const DIAGRAMS: Record<string, Record<string, DiagramPlacement[]>> = {
  "ddia-2e": {
    ch01: [
      {
        id: "building-blocks",
        afterBlockId: "ch_tradeoffs.6",
        blockHash: "fe3c91e1",
        Component: BuildingBlocksDiagram,
      },
      {
        id: "oltp-olap",
        afterBlockId: "sec_introduction_oltp.7",
        blockHash: "64795f13",
        Component: OltpOlapDiagram,
      },
    ],
  },
};

export function diagramsFor(bookId: string, chapterId: string): DiagramPlacement[] {
  return DIAGRAMS[bookId]?.[chapterId] ?? [];
}
