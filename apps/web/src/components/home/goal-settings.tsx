"use client";

import { useEffect, useState, useTransition } from "react";
import { updateGoal, updateTimeZone } from "@/lib/streaks/actions";

const GOALS = [5, 10, 15, 20, 30, 45];

/** Daily goal and weekends-off controls. Saved right away. */
export function GoalSettings({
  goalMinutes,
  weekendsOff,
}: {
  goalMinutes: number;
  weekendsOff: boolean;
}) {
  const [goal, setGoal] = useState(goalMinutes);
  const [weekends, setWeekends] = useState(weekendsOff);
  const [pending, start] = useTransition();

  return (
    <div className="goal-settings" aria-busy={pending}>
      <div>
        <p className="goal-settings-label">Daily goal</p>
        <div className="menu-segment goal-segment">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={goal === g}
              className={goal === g ? "is-on" : ""}
              onClick={() => {
                setGoal(g);
                start(() => updateGoal({ goalMinutes: g }));
              }}
            >
              {g} min
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={weekends}
        onClick={() => {
          setWeekends(!weekends);
          start(() => updateGoal({ weekendsOff: !weekends }));
        }}
        className="goal-switch-row"
      >
        <span>
          <span className="goal-settings-label">Weekends off</span>
          <span className="goal-settings-hint">Saturdays and Sundays never break your streak</span>
        </span>
        <span className="menu-switch" data-on={weekends ? "true" : "false"} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Saves the browser's time zone once, so days start at the reader's own midnight. */
export function TimeZoneSync({ saved }: { saved: string }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== saved) void updateTimeZone(zone);
  }, [saved]);
  return null;
}
