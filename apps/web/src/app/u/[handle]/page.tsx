import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RibbonMark } from "@/components/ribbon-mark";
import { BADGE_MARKS } from "@/lib/profile/card";
import { getPublicStats, siteUrl } from "@/lib/profile/data";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const s = await getPublicStats(handle);
  if (!s) return { title: "Not found" };
  const title = `${s.displayName} on Ribbon`;
  const description = `${s.level.name} · ${s.currentStreak}-day streak${
    s.book ? ` · ${s.book.chaptersDone} of ${s.book.chapters} chapters of ${s.book.title}` : ""
  }`;
  const image = `${siteUrl()}/u/${s.handle}/card.png`;
  return {
    title,
    description,
    openGraph: { title, description, url: `${siteUrl()}/u/${s.handle}`, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/** A reader's public profile: totals only, never book text or notes. Off unless turned on. */
export default async function PublicProfile({ params }: PageProps<"/u/[handle]">) {
  const { handle } = await params;
  const s = await getPublicStats(handle);
  if (!s) notFound();

  const stats = [
    {
      label: "Streak",
      value: `${s.currentStreak} ${s.currentStreak === 1 ? "day" : "days"}`,
      note: `Best ${s.bestStreak}`,
    },
    {
      label: "Chapters",
      value: s.book ? `${s.book.chaptersDone} / ${s.book.chapters}` : "0",
      note: s.book ? `${Math.round(s.book.read * 100)}% read` : "",
    },
    {
      label: "Accuracy",
      value: s.answered ? `${Math.round(s.accuracy * 100)}%` : "–",
      note: `${s.answered} questions`,
    },
    { label: "Reading", value: `${s.hoursRead}h`, note: "in total" },
  ];

  return (
    <div className="home">
      <header className="home-bar">
        <span className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </span>
      </header>
      <main className="home-main pub-main">
        <section className="home-card pub-hero">
          <span className="set-avatar pub-avatar" aria-hidden="true">
            {s.displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="pub-name">{s.displayName}</h1>
            <p className="home-muted">@{s.handle}</p>
          </div>
        </section>

        <section className="home-card" aria-labelledby="level-title">
          <p className="home-eyebrow">Level {s.level.index + 1}</p>
          <h2 id="level-title" className="home-level-name">
            {s.level.name}
          </h2>
          <div className="home-level-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(s.level.progress * 100)}%` }} />
          </div>
          <p className="home-muted">{s.level.xp.toLocaleString("en-US")} XP</p>
        </section>

        <div className="lb-records pub-stats">
          {stats.map((x) => (
            <div key={x.label} className="home-card lb-record">
              <p className="lb-record-label">{x.label}</p>
              <p className="lb-record-value">{x.value}</p>
              {x.note && <p className="home-muted lb-record-note">{x.note}</p>}
            </div>
          ))}
        </div>

        {s.book && (
          <section className="home-card" aria-labelledby="book-title">
            <p className="home-eyebrow">Reading</p>
            <h2 id="book-title" className="pub-book">
              {s.book.title}
            </h2>
            <span className="home-progress pub-progress" aria-hidden="true">
              <span style={{ width: `${Math.max(1, Math.round(s.book.read * 100))}%` }} />
            </span>
          </section>
        )}

        <section className="home-card" aria-labelledby="badges-title">
          <h2 id="badges-title" className="home-section-title">
            Badges
          </h2>
          <ul className="pub-badges">
            {s.badges.map((b) => (
              <li key={b.id} className="pub-badge" data-earned={b.earned || undefined}>
                <span className="pub-badge-mark" aria-hidden="true">
                  {BADGE_MARKS[b.id] ?? "•"}
                </span>
                <span>
                  <span className="pub-badge-name">{b.name}</span>
                  <span className="home-muted pub-badge-how">
                    {b.earned ? b.how : `Not yet: ${b.how.toLowerCase()}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="pub-note">
          Ribbon is a personal reading app. These numbers come live from {s.displayName}'s own
          reading, quick checks, and reviews.
        </p>
      </main>
    </div>
  );
}
