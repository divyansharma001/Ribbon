import type { ComponentType } from "react";
import { BuildingBlocksDiagram } from "./ch01/building-blocks";
import { ElasticityDiagram } from "./ch01/elasticity";
import { EtlDiagram } from "./ch01/etl";
import { LakeDiagram } from "./ch01/lake";
import { NetworkRaceDiagram } from "./ch01/network-race";
import { OltpOlapDiagram } from "./ch01/oltp-olap";
import { SourceOfTruthDiagram } from "./ch01/source-of-truth";
import { StorageComputeDiagram } from "./ch01/storage-compute";
import { CorrelatedFaultsDiagram } from "./ch02/correlated-faults";
import { FanOutDiagram } from "./ch02/fan-out";
import { FaultFailureDiagram } from "./ch02/fault-failure";
import { PercentilesDiagram } from "./ch02/percentiles";
import { QueueingDiagram } from "./ch02/queueing";
import { RequestAnatomyDiagram } from "./ch02/request-anatomy";
import { ScaleUpOutDiagram } from "./ch02/scale-up-out";
import { TailAmplificationDiagram } from "./ch02/tail-amplification";

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
      {
        id: "etl",
        afterBlockId: "sec_introduction_dwh.7",
        blockHash: "e986c26d",
        Component: EtlDiagram,
      },
      {
        id: "lake",
        afterBlockId: "id5.5",
        blockHash: "26a2479e",
        Component: LakeDiagram,
      },
      {
        id: "source-of-truth",
        afterBlockId: "sec_introduction_derived.6",
        blockHash: "d7ac747c",
        Component: SourceOfTruthDiagram,
      },
      {
        id: "elasticity",
        afterBlockId: "sec_introduction_cloud_tradeoffs.5",
        blockHash: "28e3f805",
        Component: ElasticityDiagram,
      },
      {
        id: "storage-compute",
        afterBlockId: "sec_introduction_storage_compute.5",
        blockHash: "dc13e2b9",
        Component: StorageComputeDiagram,
      },
      {
        id: "network-race",
        afterBlockId: "sec_introduction_dist_sys_problems.2",
        blockHash: "8162162f",
        Component: NetworkRaceDiagram,
      },
    ],
    ch02: [
      {
        id: "fan-out",
        afterBlockId: "sec_introduction_materializing.8",
        blockHash: "227b759d",
        Component: FanOutDiagram,
      },
      {
        id: "queueing",
        afterBlockId: "sec_introduction_percentiles.6",
        blockHash: "bc47c152",
        Component: QueueingDiagram,
      },
      {
        id: "request-anatomy",
        afterBlockId: "id23.6",
        blockHash: "40cd322f",
        Component: RequestAnatomyDiagram,
      },
      {
        id: "percentiles",
        afterBlockId: "id24.5",
        blockHash: "466a5780",
        Component: PercentilesDiagram,
      },
      {
        id: "tail-amplification",
        afterBlockId: "sec_introduction_slo_sla.2",
        blockHash: "a01076ee",
        Component: TailAmplificationDiagram,
      },
      {
        id: "fault-failure",
        afterBlockId: "id27.1",
        blockHash: "abe4ce36",
        Component: FaultFailureDiagram,
      },
      {
        id: "correlated-faults",
        afterBlockId: "id30.2",
        blockHash: "f3d27982",
        Component: CorrelatedFaultsDiagram,
      },
      {
        id: "scale-up-out",
        afterBlockId: "sec_introduction_shared_nothing.5",
        blockHash: "d0eaca99",
        Component: ScaleUpOutDiagram,
      },
    ],
  },
};

export function diagramsFor(bookId: string, chapterId: string): DiagramPlacement[] {
  return DIAGRAMS[bookId]?.[chapterId] ?? [];
}
