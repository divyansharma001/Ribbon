"use client";

import { useEffect, useState } from "react";
import { DiagramButton, DiagramFrame } from "../frame";
import { useInView, useReducedMotion } from "../use-steps";

const ROWS = [
  { id: 1041, customer: "Asha", item: "Kettle", amount: 32 },
  { id: 1042, customer: "Ben", item: "Lamp", amount: 54 },
  { id: 1043, customer: "Chen", item: "Mug", amount: 9 },
  { id: 1044, customer: "Dana", item: "Chair", amount: 120 },
  { id: 1045, customer: "Eli", item: "Rug", amount: 85 },
  { id: 1046, customer: "Fatima", item: "Desk", amount: 210 },
  { id: 1047, customer: "Gus", item: "Pen", amount: 4 },
  { id: 1048, customer: "Hana", item: "Shelf", amount: 66 },
];

/** Point queries the operational system answers, one after another. */
const OLTP_QUERIES = [
  { row: 2, sql: "SELECT * FROM orders WHERE id = 1043", text: "Show Chen their order" },
  {
    row: 6,
    sql: "UPDATE orders SET status = 'shipped' WHERE id = 1047",
    text: "Mark Gus’s order shipped",
  },
  { row: 0, sql: "SELECT * FROM orders WHERE id = 1041", text: "Show Asha their order" },
  {
    row: 5,
    sql: "UPDATE orders SET amount = 199 WHERE id = 1046",
    text: "Apply Fatima’s discount",
  },
  { row: 3, sql: "SELECT * FROM orders WHERE id = 1044", text: "Show Dana their order" },
];

type Mode = "oltp" | "olap";
const TICK_MS = { oltp: 1100, olap: 260 } as const;
/** OLAP sweep: one tick per row, one for "millions more", then a pause on the total. */
const OLAP_TICKS = ROWS.length + 6;

/** Ch 1, after Table 1-1: how operational and analytical systems read data differently. */
export function OltpOlapDiagram() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>();
  const [mode, setMode] = useState<Mode>("oltp");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced || !inView) return;
    const timer = setInterval(() => setTick((t) => t + 1), TICK_MS[mode]);
    return () => clearInterval(timer);
  }, [mode, reduced, inView]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setTick(0);
  };

  const query = OLTP_QUERIES[tick % OLTP_QUERIES.length];
  const sweep = tick % OLAP_TICKS; // rows 0..7 scanned, 8 = millions more, then total
  const scanned = Math.min(sweep + 1, ROWS.length);
  const runningTotal = ROWS.slice(0, scanned).reduce((sum, r) => sum + r.amount, 0);
  const showTotal = sweep >= ROWS.length;

  return (
    <DiagramFrame
      title="Two ways to use the same data"
      live={false}
      controls={
        <>
          <DiagramButton active={mode === "oltp"} onClick={() => switchMode("oltp")}>
            Apps (OLTP)
          </DiagramButton>
          <DiagramButton active={mode === "olap"} onClick={() => switchMode("olap")}>
            Analytics (OLAP)
          </DiagramButton>
          {reduced && (
            <DiagramButton onClick={() => setTick((t) => t + 1)}>
              {mode === "oltp" ? "Next query" : "Next row"}
            </DiagramButton>
          )}
        </>
      }
      narration={
        mode === "oltp" ? (
          <>
            <strong>{query?.text}.</strong> Each query finds <strong>one row</strong> by its key,
            reads or changes it, and is done in a blink. Shops run thousands of these every second.
          </>
        ) : (
          <>
            <strong>“Total sales in January?”</strong> One query reads <strong>every row</strong>,
            but only the <em>amount</em> column, and adds them up. Real tables have millions of
            rows.
          </>
        )
      }
      caption="Same table, very different work: apps touch a few rows at a time; analysts scan huge numbers of rows to answer one question."
    >
      <div ref={ref} className="oltp">
        <code className="oltp-sql">
          {mode === "oltp" ? query?.sql : "SELECT SUM(amount) FROM orders WHERE month = 'Jan'"}
        </code>
        <div className="oltp-table-wrap">
          <table className="oltp-table">
            <thead>
              <tr>
                <th>id</th>
                <th>customer</th>
                <th>item</th>
                <th className={mode === "olap" ? "is-col" : ""}>amount</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => {
                const hitRow = mode === "oltp" && query?.row === i;
                const scannedCell = mode === "olap" && i < scanned;
                const scanning = mode === "olap" && i === sweep;
                return (
                  <tr key={r.id} className={hitRow ? "is-hit" : ""}>
                    <td>{r.id}</td>
                    <td>{r.customer}</td>
                    <td>{r.item}</td>
                    <td
                      className={[
                        mode === "olap" ? "is-col" : "",
                        scannedCell ? "is-scanned" : "",
                        scanning ? "is-scanning" : "",
                      ].join(" ")}
                    >
                      ${r.amount}
                    </td>
                  </tr>
                );
              })}
              <tr
                className={`oltp-more ${mode === "olap" && sweep === ROWS.length ? "is-scanning" : ""}`}
              >
                <td colSpan={4}>… and millions more rows</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="oltp-result" data-mode={mode}>
          {mode === "oltp" ? (
            <>
              <span className="oltp-stat">
                <b>1</b> row per query
              </span>
              <span className="oltp-stat">
                <b>all</b> columns
              </span>
              <span className="oltp-stat">
                <b>~1 ms</b> each
              </span>
            </>
          ) : (
            <>
              <span className="oltp-stat">
                <b>{showTotal ? "millions" : scanned}</b> rows read
              </span>
              <span className="oltp-stat">
                <b>1</b> column
              </span>
              <span className={`oltp-stat oltp-total ${showTotal ? "is-final" : ""}`}>
                total <b>{showTotal ? "$48.2M" : `$${runningTotal}`}</b>
              </span>
            </>
          )}
        </div>
      </div>
    </DiagramFrame>
  );
}
