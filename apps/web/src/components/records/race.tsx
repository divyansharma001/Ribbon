import Link from "next/link";
import type { Race } from "@/lib/records/logic";

/** This week against last week at the same point: who's ahead? */
export function RaceCard({ race, link = false }: { race: Race; link?: boolean }) {
  const { thisWeek, lastWeekSoFar, lastWeek, daysLeft } = race;
  const gap = thisWeek - lastWeekSoFar;
  const top = Math.max(thisWeek, lastWeekSoFar, 1);
  const message =
    thisWeek === 0 && lastWeekSoFar === 0
      ? "A fresh week. Read a few minutes to get on the board."
      : gap > 0
        ? `You're ${gap} XP ahead of last week. Keep it up.`
        : gap === 0
          ? "Neck and neck with last week."
          : `${-gap} XP behind last week, with ${daysLeft} ${daysLeft === 1 ? "day" : "days"} to catch up.`;

  return (
    <section className="home-card vs" aria-labelledby="race-title">
      <div className="vs-head">
        <div>
          <p className="home-eyebrow">You vs last week</p>
          <h2 id="race-title" className="vs-title">
            {message}
          </h2>
        </div>
        {link && (
          <Link href="/leaderboard" className="vs-link">
            Leaderboard
          </Link>
        )}
      </div>
      <div className="vs-bars">
        <div className="vs-row" data-who="now">
          <span className="vs-name">This week</span>
          <span className="vs-track" aria-hidden="true">
            <span style={{ width: `${(thisWeek / top) * 100}%` }} />
          </span>
          <span className="vs-xp">{thisWeek} XP</span>
        </div>
        <div className="vs-row" data-who="then">
          <span className="vs-name">Last week by today</span>
          <span className="vs-track" aria-hidden="true">
            <span style={{ width: `${(lastWeekSoFar / top) * 100}%` }} />
          </span>
          <span className="vs-xp">{lastWeekSoFar} XP</span>
        </div>
      </div>
      <p className="home-muted">Last week ended on {lastWeek} XP.</p>
    </section>
  );
}
