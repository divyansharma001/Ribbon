import type { Day } from "@/lib/streaks/logic";

/** A ring that fills as today's reading minutes approach the goal. */
export function GoalRing({
  minutes,
  goal,
  size = 88,
  stroke = 7,
  label = true,
}: {
  minutes: number;
  goal: number;
  size?: number;
  stroke?: number;
  label?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = Math.min(1, goal > 0 ? minutes / goal : 0);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${Math.floor(minutes)} of ${goal} minutes today`}
      className="goal-ring"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="goal-ring-track"
      />
      {done > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * done} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={done >= 1 ? "goal-ring-fill is-done" : "goal-ring-fill"}
        />
      )}
      {label && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="goal-ring-text"
        >
          {Math.floor(Math.min(minutes, 999))}
          <tspan className="goal-ring-unit">/{goal}m</tspan>
        </text>
      )}
    </svg>
  );
}

const STATUS_LABEL: Record<Day["status"], string> = {
  met: "goal met",
  frozen: "kept by a freeze",
  repaired: "repaired",
  missed: "missed",
  off: "weekend off",
  pending: "today",
  none: "",
};

/**
 * The last weeks as a grid, one column per week (Monday on top), like a
 * contribution calendar. Darker squares mean more minutes read.
 */
export function StreakCalendar({ days, goal }: { days: Day[]; goal: number }) {
  // Pad the start so the first column begins on a Monday.
  const first = days[0];
  const weekday = first ? (new Date(`${first.date}T00:00:00Z`).getUTCDay() + 6) % 7 : 0;
  const cells: (Day | null)[] = [...Array<null>(weekday).fill(null), ...days];
  const weeks: (Day | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const level = (d: Day) => {
    if (d.status !== "met" && d.status !== "pending") return 0;
    const ratio = d.minutes / goal;
    if (ratio <= 0) return 0;
    return ratio >= 2 ? 4 : ratio >= 1.4 ? 3 : ratio >= 1 ? 2 : 1;
  };

  return (
    <div className="streak-calendar" role="img" aria-label="Reading calendar for the last weeks">
      {weeks.map((week) => (
        <div key={week.find(Boolean)?.date ?? "start"} className="streak-week">
          {week.map((d, i) =>
            d ? (
              <span
                key={d.date}
                className="streak-day"
                data-status={d.status}
                data-level={level(d)}
                title={`${formatDate(d.date)}: ${Math.round(d.minutes)} min${STATUS_LABEL[d.status] ? `, ${STATUS_LABEL[d.status]}` : ""}`}
              />
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: padding cells before the first day
              <span key={`pad-${i}`} className="streak-day is-pad" />
            ),
          )}
        </div>
      ))}
    </div>
  );
}

/** This week, Monday to Sunday, one dot per day. */
export function WeekStrip({ days, today }: { days: Day[]; today: string }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const offset = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = new Date(Date.parse(`${today}T00:00:00Z`) - offset * 86_400_000);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const day = byDate.get(date);
    const status = date > today ? "future" : (day?.status ?? "none");
    return { date, status, label: "MTWTFSS"[i] ?? "" };
  });
  return (
    <ol className="week-strip" aria-label="This week">
      {week.map((d) => (
        <li
          key={d.date}
          title={`${formatDate(d.date)}${STATUS_LABEL[d.status as Day["status"]] ? `: ${STATUS_LABEL[d.status as Day["status"]]}` : ""}`}
        >
          <span className="week-dot" data-status={d.status}>
            {(d.status === "met" || d.status === "repaired") && <Check />}
            {d.status === "frozen" && <SnowflakeIcon className="week-snow" />}
          </span>
          <span className="week-label">{d.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.3 3.6-7.6.4 1.6 1.2 2.7 2.3 3.3C11.2 7 12.6 4.6 14.9 3c-.3 2.9.6 4.9 2 6.7 1 1.3 1.6 2.9 1.6 5 0 3.7-2.6 6.3-6.5 6.3Z" />
      <path d="M12 21c-1.7 0-2.9-1.2-2.9-2.9 0-1.6 1.2-2.6 1.9-3.6.4 1 1 1.6 1.7 1.9.4-1.1 1-2 1.8-2.6.1 1.6.9 2.3.9 4.2 0 1.8-1.4 3-3.4 3Z" />
    </svg>
  );
}

export function SnowflakeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
    </svg>
  );
}
