"use client";

import { useState, useTransition } from "react";
import { REMINDER_TIMES, timeLabel } from "@/lib/notify/logic";
import { updateReminder } from "@/lib/streaks/actions";

const DEFAULT_TIME = "19:00";

/** The daily reminder email: on or off, and when. Saved right away. */
export function ReminderSettings({
  reminderAt,
  email,
  emailReady,
}: {
  reminderAt: string | null;
  email: string;
  /** False when the server has no email settings, so reminders can't be sent. */
  emailReady: boolean;
}) {
  const [time, setTime] = useState(reminderAt);
  const [lastTime, setLastTime] = useState(reminderAt ?? DEFAULT_TIME);
  const [pending, start] = useTransition();
  const on = time !== null;

  const save = (next: string | null) => {
    setTime(next);
    if (next) setLastTime(next);
    start(() => updateReminder(next));
  };

  return (
    <div className="goal-settings" aria-busy={pending}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={!emailReady && !on}
        onClick={() => save(on ? null : lastTime)}
        className="goal-switch-row"
      >
        <span>
          <span className="goal-settings-label">Daily reminder email</span>
          <span className="goal-settings-hint">
            {emailReady
              ? `Sent to ${email}, only on days you haven't met your goal yet.`
              : "Email isn't set up on this server yet, so reminders can't be sent."}
          </span>
        </span>
        <span className="menu-switch" data-on={on ? "true" : "false"} aria-hidden="true" />
      </button>
      {on && (
        <label className="set-reminder-time">
          <span className="goal-settings-label">Remind me at</span>
          <select className="set-select" value={time} onChange={(e) => save(e.target.value)}>
            {REMINDER_TIMES.map((t) => (
              <option key={t} value={t}>
                {timeLabel(t)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
