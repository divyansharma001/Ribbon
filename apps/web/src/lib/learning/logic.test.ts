import { describe, expect, it } from "vitest";
import {
  badgesFor,
  firstSchedule,
  type LearningStats,
  levelFor,
  scheduleReview,
  xpFrom,
} from "./logic";

const now = new Date("2026-10-06T10:00:00Z");
const days = (d: Date) => Math.round((d.getTime() - now.getTime()) / 86_400_000);

describe("spaced review", () => {
  it("starts right answers further out than wrong ones", () => {
    expect(firstSchedule(true, now)).toMatchObject({ box: 1 });
    expect(days(firstSchedule(true, now).dueAt)).toBe(3);
    expect(days(firstSchedule(false, now).dueAt)).toBe(1);
  });

  it("moves up a box when right, back to the start when wrong, and stops at the top", () => {
    expect(scheduleReview(1, true, now).box).toBe(2);
    expect(days(scheduleReview(1, true, now).dueAt)).toBe(7);
    expect(scheduleReview(4, false, now).box).toBe(0);
    expect(scheduleReview(5, true, now).box).toBe(5);
    expect(days(scheduleReview(5, true, now).dueAt)).toBe(80);
  });
});

const empty: LearningStats = {
  minutesRead: 0,
  answered: 0,
  firstTryCorrect: 0,
  reviews: 0,
  currentStreak: 0,
  bestStreak: 0,
  chaptersFinished: 0,
  perfectChecks: 0,
};

describe("XP and levels", () => {
  it("adds up XP from reading, answers, reviews, and chapters", () => {
    expect(
      xpFrom({
        ...empty,
        minutesRead: 30,
        answered: 5,
        firstTryCorrect: 4,
        reviews: 10,
        chaptersFinished: 1,
      }),
    ).toBe(30 + 40 + 3 + 20 + 50);
  });

  it("names the level and the progress to the next", () => {
    expect(levelFor(0)).toMatchObject({ name: "Single Node", progress: 0, to: 150 });
    expect(levelFor(275)).toMatchObject({ name: "Replica", progress: 0.5 });
    expect(levelFor(99_999)).toMatchObject({
      name: "Distributed Systems Expert",
      to: null,
      progress: 1,
    });
  });
});

describe("badges", () => {
  it("marks earned badges and leaves the rest as goals", () => {
    const badges = badgesFor({ ...empty, answered: 1, bestStreak: 8 });
    const earned = badges.filter((b) => b.earned).map((b) => b.id);
    expect(earned).toEqual(["first-check", "week"]);
    expect(badges.length).toBeGreaterThan(earned.length);
  });
});
