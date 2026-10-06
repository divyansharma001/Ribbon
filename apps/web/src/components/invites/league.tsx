import Link from "next/link";
import type { LeagueRow } from "@/lib/invites/league";
import { PERKS } from "./perks";

function Rows({ rows, limit }: { rows: LeagueRow[]; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const you = rows.findIndex((r) => r.you);
  return (
    <ol className="lb-list">
      {shown.map((r, i) => (
        <li key={r.id} className="lb-row league-row" data-current={r.you || undefined}>
          <span className="lb-rank" data-top={i < 3 ? i + 1 : undefined}>
            {i + 1}
          </span>
          <span className="lb-week">
            {r.name}
            <span className="league-level">{r.level}</span>
          </span>
          <span className="lb-meta">
            {r.streak} {r.streak === 1 ? "day" : "days"} streak
          </span>
          <span className="lb-xp">{r.weekXp.toLocaleString("en-US")} XP</span>
        </li>
      ))}
      {limit && you >= limit && rows[you] && (
        <li className="lb-row league-row" data-current>
          <span className="lb-rank">{you + 1}</span>
          <span className="lb-week">You</span>
          <span className="lb-meta">{rows[you].streak} days streak</span>
          <span className="lb-xp">{rows[you].weekXp.toLocaleString("en-US")} XP</span>
        </li>
      )}
    </ol>
  );
}

/** No friends yet: what inviting brings, and the button to do it. */
function InviteCta({ compact }: { compact: boolean }) {
  return (
    <div className="league-cta">
      <p className="home-muted">
        Invite a friend to race each other every week.{" "}
        {compact ? "You both get perks as they read." : ""}
      </p>
      {!compact && (
        <ul className="league-perks">
          {PERKS.slice(0, 3).map((p) => (
            <li key={p.title}>
              <span
                className="share-mark"
                data-long={p.mark.length > 2 || undefined}
                aria-hidden="true"
              >
                {p.mark}
              </span>
              <span>
                <strong>{p.title}</strong> {p.detail.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/invite" className="home-button league-invite">
        Invite a friend
      </Link>
    </div>
  );
}

/** The friends league: on the leaderboard (full) and on Home (top 3). */
export function LeagueCard({ rows, compact = false }: { rows: LeagueRow[]; compact?: boolean }) {
  return (
    <section className="home-card league" aria-labelledby="league-title">
      <div className="vs-head">
        <div>
          <p className="home-eyebrow">Friends league · this week</p>
          <h2 id="league-title" className="vs-title">
            {rows.length === 0
              ? "Read with friends"
              : rows[0]?.you
                ? "You're leading your friends this week."
                : `${rows[0]?.name} leads this week.`}
          </h2>
        </div>
        {rows.length > 0 && (
          <Link href={compact ? "/leaderboard" : "/invite"} className="vs-link">
            {compact ? "Leaderboard" : "Invite more"}
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <InviteCta compact={compact} />
      ) : (
        <Rows rows={rows} limit={compact ? 3 : undefined} />
      )}
    </section>
  );
}
