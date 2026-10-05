import { describe, expect, it } from "vitest";
import { addDays, computeStreak, lastDays, localDate, minutesPerDay } from "./logic";

const rules = { goalMinutes: 10, weekendsOff: false };
// 2026-10-05 is a Monday.
const TODAY = "2026-10-05";

/** Minutes per day, ending yesterday: days(..., 12, 0, 15) means 3 days ago 12 min, and so on. */
function history(...mins: number[]): Map<string, number> {
  const m = new Map<string, number>();
  mins.forEach((v, i) => {
    m.set(addDays(TODAY, i - mins.length), v);
  });
  return m;
}

describe("computeStreak", () => {
  it("counts days that reach the goal, and today only once it is met", () => {
    const s = computeStreak(history(12, 10, 15), rules, TODAY);
    expect(s.current).toBe(3);
    expect(s.todayMet).toBe(false);
    expect(s.days.at(-1)?.status).toBe("pending");

    const withToday = new Map(history(12, 10, 15)).set(TODAY, 11);
    expect(computeStreak(withToday, rules, TODAY).current).toBe(4);
  });

  it("starts over after a missed day with no freeze", () => {
    const s = computeStreak(history(12, 12, 3, 12), rules, TODAY);
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
    expect(s.days.map((d) => d.status)).toEqual(["met", "met", "missed", "met", "pending"]);
  });

  it("earns a freeze every 7 days and uses it on a missed day", () => {
    const s = computeStreak(history(10, 10, 10, 10, 10, 10, 10, 0, 10), rules, TODAY);
    expect(s.days[7]?.status).toBe("frozen");
    expect(s.current).toBe(8);
    expect(s.freezes).toBe(0);
  });

  it("never holds more than 2 freezes", () => {
    const s = computeStreak(history(...Array(28).fill(10)), rules, TODAY);
    expect(s.freezes).toBe(2);
  });

  it("repairs a missed day with double the goal the next day, once a month", () => {
    const s = computeStreak(history(10, 10, 0, 20, 10), rules, TODAY);
    expect(s.days[2]?.status).toBe("repaired");
    expect(s.current).toBe(4);

    // A second repair in the same month is not allowed.
    const twice = computeStreak(history(10, 0, 20, 0, 20), rules, TODAY);
    expect(twice.days.map((d) => d.status)).toEqual([
      "met",
      "repaired",
      "met",
      "missed",
      "met",
      "pending",
    ]);
  });

  it("offers today's repair after yesterday was missed", () => {
    const s = computeStreak(history(10, 10, 2), rules, TODAY);
    expect(s.current).toBe(0);
    expect(s.repairMinutes).toBe(20);
    const repaired = computeStreak(new Map(history(10, 10, 2)).set(TODAY, 20), rules, TODAY);
    expect(repaired.current).toBe(3);
    expect(repaired.repairMinutes).toBeNull();
  });

  it("does not break on weekends when weekends are off", () => {
    // Fri 2026-10-02 read, Sat and Sun not, today Monday.
    const m = new Map([
      ["2026-10-01", 10],
      ["2026-10-02", 10],
    ]);
    const off = computeStreak(m, { goalMinutes: 10, weekendsOff: true }, TODAY);
    expect(off.days.map((d) => d.status)).toEqual(["met", "met", "off", "off", "pending"]);
    expect(off.current).toBe(2);
    const on = computeStreak(m, rules, TODAY);
    expect(on.current).toBe(0);
  });

  it("lists the last days for the calendar, blank before reading started", () => {
    const s = computeStreak(history(12), rules, TODAY);
    const cal = lastDays(s, TODAY, 4);
    expect(cal.map((d) => d.status)).toEqual(["none", "none", "met", "pending"]);
  });
});

describe("minutesPerDay", () => {
  it("groups sessions by the reader's local day, including old zone names like Asia/Calcutta", () => {
    const sessions = [
      { startedAt: new Date("2026-10-04T20:00:00Z"), activeSeconds: 600 }, // 01:30 on Oct 5 in India
      { startedAt: new Date("2026-10-04T10:00:00Z"), activeSeconds: 300 }, // 15:30 on Oct 4
      { startedAt: new Date("2026-10-04T12:00:00Z"), activeSeconds: 120 },
    ];
    const days = minutesPerDay(sessions, "Asia/Calcutta");
    expect(days.get("2026-10-05")).toBe(10);
    expect(days.get("2026-10-04")).toBe(7);
    expect(localDate("Asia/Calcutta", new Date("2026-10-04T20:00:00Z"))).toBe("2026-10-05");
  });
});
