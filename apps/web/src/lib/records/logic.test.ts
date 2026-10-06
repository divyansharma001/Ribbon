import { describe, expect, it } from "vitest";
import { type DayActivity, dayXp, finishedAt, weekStart, youVsYou } from "./logic";

const day = (d: Partial<DayActivity>): DayActivity => ({
  minutes: 0,
  answered: 0,
  right: 0,
  reviews: 0,
  chaptersFinished: 0,
  ...d,
});

describe("you vs you", () => {
  it("counts XP for a day by the same rules as total XP", () => {
    // 20 min + 3 right (30) + 1 wrong (3) + 2 reviews (4) + 1 chapter (50)
    expect(
      dayXp(day({ minutes: 20, answered: 4, right: 3, reviews: 2, chaptersFinished: 1 })),
    ).toBe(107);
  });

  it("starts weeks on Monday", () => {
    expect(weekStart("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(weekStart("2026-10-07")).toBe("2026-10-05"); // Wednesday
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday
  });

  // Today is Wednesday 2026-10-07.
  const days = new Map([
    ["2026-09-28", day({ minutes: 30 })], // last week Monday
    ["2026-09-30", day({ minutes: 10 })], // last week Wednesday
    ["2026-10-01", day({ minutes: 50 })], // last week Thursday: after "so far"
    ["2026-10-05", day({ minutes: 15, answered: 2, right: 2 })], // this Monday
    ["2026-10-07", day({ minutes: 5 })], // today
    ["2026-09-14", day({ minutes: 200, right: 3, answered: 3 })], // a big week
  ]);
  const v = youVsYou(days, "2026-10-07");

  it("races this week against last week up to the same weekday", () => {
    expect(v.race).toEqual({ thisWeek: 40, lastWeekSoFar: 40, lastWeek: 90, daysLeft: 5 });
  });

  it("ranks weeks best first and finds this week's rank", () => {
    expect(v.ranked.map((w) => [w.start, w.xp])).toEqual([
      ["2026-09-14", 230],
      ["2026-09-28", 90],
      ["2026-10-05", 40],
    ]);
    expect(v.thisWeekRank).toBe(3);
  });

  it("keeps personal records", () => {
    expect(v.records.bestWeek?.start).toBe("2026-09-14");
    expect(v.records.bestDayMinutes).toEqual({ date: "2026-09-14", value: 200 });
    expect(v.records.mostRightInDay).toEqual({ date: "2026-09-14", value: 3 });
  });

  it("has no rank and no records with no activity", () => {
    const empty = youVsYou(new Map(), "2026-10-07");
    expect(empty.thisWeekRank).toBeNull();
    expect(empty.records).toEqual({ bestWeek: null, bestDayMinutes: null, mostRightInDay: null });
  });
});

describe("chapter finish time", () => {
  const t = (n: number) => new Date(Date.UTC(2026, 9, 1, 0, n));

  it("is when 90% of the blocks had been read", () => {
    const reads = [t(5), t(1), t(9), t(3), t(7), t(2), t(4), t(6), t(8)];
    expect(finishedAt(reads, 10)).toEqual(t(9)); // 9 of 10 needed
    expect(finishedAt(reads, 9)).toEqual(t(9)); // ceil(8.1) = 9
  });

  it("is null when not enough was read", () => {
    expect(finishedAt([t(1), t(2)], 10)).toBeNull();
  });
});
