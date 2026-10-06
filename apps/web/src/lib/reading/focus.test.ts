import { describe, expect, it } from "vitest";
import { awayLabel, GRACE_MS, newRun, restoreRun, resume } from "./focus";

const t0 = Date.UTC(2026, 9, 6, 9, 0, 0);

describe("focus runs", () => {
  const run = { ...newRun(t0), seconds: 300 };

  it("keeps the run going after a short step away", () => {
    const r = resume(run, GRACE_MS, t0 + GRACE_MS);
    expect(r.broken).toBe(false);
    expect(r.run.id).toBe(run.id);
    expect(r.run.seconds).toBe(300);
  });

  it("starts a new run after a longer absence, and says the old one broke", () => {
    const r = resume(run, GRACE_MS + 1, t0 + 60_000);
    expect(r.broken).toBe(true);
    expect(r.run.id).not.toBe(run.id);
    expect(r.run.seconds).toBe(0);
    expect(resume({ ...run, seconds: 0 }, 60_000, t0).broken).toBe(false);
  });

  it("carries a run to the next page only if the reader wasn't gone long", () => {
    const saved = JSON.stringify({ ...run, lastHereAt: t0 });
    expect(restoreRun(saved, t0 + 3_000).id).toBe(run.id);
    expect(restoreRun(saved, t0 + GRACE_MS + 1).id).not.toBe(run.id);
    expect(restoreRun("not json", t0).seconds).toBe(0);
    expect(restoreRun(null, t0).seconds).toBe(0);
  });

  it("says how long someone was away", () => {
    expect(awayLabel(45_000)).toBe("45 sec");
    expect(awayLabel(180_000)).toBe("3 min");
    expect(awayLabel(2 * 3_600_000 + 5 * 60_000)).toBe("2 h 5 min");
  });
});
