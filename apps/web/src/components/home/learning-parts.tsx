import Link from "next/link";
import type { Badge, Level } from "@/lib/learning/logic";

/** Current level, XP, and how far to the next level. */
export function LevelCard({ level }: { level: Level }) {
  const toNext = level.to === null ? 0 : level.to - level.xp;
  return (
    <section className="home-card" aria-labelledby="level-title">
      <p className="home-eyebrow">Level {level.index + 1}</p>
      <h2 id="level-title" className="home-level-name">
        {level.name}
      </h2>
      <div className="home-level-bar" aria-hidden="true">
        <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
      </div>
      <p className="home-muted">
        {level.xp.toLocaleString()} XP
        {level.to !== null && (
          <>
            <span className="home-dot">·</span>
            {toNext.toLocaleString()} XP to the next level
          </>
        )}
      </p>
      <details className="home-xp-rules">
        <summary>How XP works</summary>
        <p className="home-muted">
          1 for each minute of reading, 10 for a quick check right the first time (3 if not), 2 for
          each review, 50 for each finished chapter, and bonuses when friends you invite read.
        </p>
      </details>
    </section>
  );
}

/** Review deck: how many cards are due. */
export function ReviewCard({ due, next }: { due: number; next: Date | null }) {
  return (
    <section className="home-card home-review" aria-labelledby="review-title">
      <p className="home-eyebrow">Review</p>
      <h2 id="review-title" className="home-review-count">
        {due === 0 ? "All caught up" : `${due} ${due === 1 ? "card" : "cards"} due`}
      </h2>
      <p className="home-muted">
        {due > 0
          ? "A few minutes now keeps what you read from fading."
          : next
            ? `Next card due ${next.toLocaleDateString("en-US", { weekday: "long" })}.`
            : "Answer quick checks while reading to build your deck."}
      </p>
      {due > 0 && (
        <Link href="/review" className="home-button">
          Start review
        </Link>
      )}
    </section>
  );
}

/** A person with a plus: inviting friends who read. */
const friendIcon = (
  <>
    <circle cx="9.5" cy="8" r="3.5" />
    <path d="M3 20c.7-3.4 3.3-5.3 6.5-5.3s5.8 1.9 6.5 5.3M18.5 8v6M15.5 11h6" />
  </>
);

const BADGE_ICONS: Record<string, React.ReactNode> = {
  connector: friendIcon,
  circle: friendIcon,
  "book-club": friendIcon,
  "first-check": <path d="m5 12.5 4.5 4.5L19 7.5" />,
  sharp: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7Z" />,
  chapter: <path d="M5 4.5h10a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Zm0 12a3 3 0 0 1 3-3h10" />,
  perfect: (
    <>
      <circle cx="12" cy="10" r="5.5" />
      <path d="m8.5 14.5-1.5 6 5-2.5 5 2.5-1.5-6" />
    </>
  ),
  week: (
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.4-5.3 3.6-7.6.4 1.6 1.2 2.7 2.3 3.3C11.2 7 12.6 4.6 14.9 3c-.3 2.9.6 4.9 2 6.7 1 1.3 1.6 2.9 1.6 5 0 3.7-2.6 6.3-6.5 6.3Z" />
  ),
  month: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  hundred: (
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
  ),
  reviewer: (
    <>
      <rect x="4" y="7" width="13" height="13" rx="2" />
      <path d="M8 4h10a2 2 0 0 1 2 2v10" />
    </>
  ),
  hours: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
};

/** Earned badges in color; the rest stay grey, with how to earn them. */
export function BadgeShelf({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section className="home-card" aria-labelledby="badges-title">
      <div className="home-section-head">
        <h2 id="badges-title">Badges</h2>
        <span className="home-muted">
          {earned} of {badges.length}
        </span>
      </div>
      <ul className="badge-shelf">
        {badges.map((b) => (
          <li key={b.id} className="badge" data-earned={b.earned ? "true" : "false"} title={b.how}>
            <span className="badge-icon" aria-hidden="true">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {BADGE_ICONS[b.id]}
              </svg>
            </span>
            <span className="badge-name">{b.name}</span>
            <span className="sr-only">{b.earned ? "Earned." : `Not yet: ${b.how}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
