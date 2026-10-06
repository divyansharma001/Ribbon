import type { Metadata } from "next";
import Link from "next/link";
import { RaceCard } from "@/components/records/race";
import { RibbonMark } from "@/components/ribbon-mark";
import { SettingsLink } from "@/components/settings-link";
import { getLearningStats } from "@/lib/learning/data";
import { levelFor, xpFrom } from "@/lib/learning/logic";
import { getRecords } from "@/lib/records/data";
import { type Week, weekStart } from "@/lib/records/logic";
import { requireUser } from "@/lib/session";
import { addDays } from "@/lib/streaks/logic";

export const metadata: Metadata = { title: "Leaderboard" };

const SHOWN = 10;

function weekLabel(start: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return `${fmt(start)} – ${fmt(addDays(start, 6))}`;
}

const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

function WeekRow({ week, rank, current }: { week: Week; rank: number; current: boolean }) {
  return (
    <li className="lb-row" data-current={current || undefined}>
      <span className="lb-rank" data-top={rank <= 3 ? rank : undefined}>
        {rank}
      </span>
      <span className="lb-week">
        {weekLabel(week.start)}
        {current && <span className="lb-tag">This week</span>}
      </span>
      <span className="lb-meta">
        {Math.round(week.minutes)} min · {week.right} right
      </span>
      <span className="lb-xp">{week.xp.toLocaleString()} XP</span>
    </li>
  );
}

export default async function LeaderboardPage() {
  const user = await requireUser();
  const [records, stats] = await Promise.all([getRecords(user.id), getLearningStats(user.id)]);
  const level = levelFor(xpFrom(stats));
  const thisStart = weekStart(records.today);
  const top = records.ranked.slice(0, SHOWN);
  const below =
    records.thisWeekRank && records.thisWeekRank > SHOWN
      ? records.ranked[records.thisWeekRank - 1]
      : undefined;
  const r = records.records;

  const cards = [
    {
      label: "Best week",
      value: r.bestWeek ? `${r.bestWeek.xp.toLocaleString()} XP` : "None yet",
      note: r.bestWeek ? weekLabel(r.bestWeek.start) : "Read this week to set one",
    },
    {
      label: "Longest streak",
      value: `${records.bestStreak} ${records.bestStreak === 1 ? "day" : "days"}`,
      note: `Now ${records.currentStreak}`,
    },
    {
      label: "Most reading in a day",
      value: r.bestDayMinutes ? `${Math.round(r.bestDayMinutes.value)} min` : "None yet",
      note: r.bestDayMinutes ? dayLabel(r.bestDayMinutes.date) : "",
    },
    {
      label: "Most right in a day",
      value: r.mostRightInDay ? `${r.mostRightInDay.value}` : "None yet",
      note: r.mostRightInDay ? dayLabel(r.mostRightInDay.date) : "First-try answers",
    },
    {
      label: "Fastest chapter",
      value: records.fastestChapter
        ? `${records.fastestChapter.days} ${records.fastestChapter.days === 1 ? "day" : "days"}`
        : "None yet",
      note: records.fastestChapter
        ? `Chapter ${records.fastestChapter.chapterNumber}: ${records.fastestChapter.chapterTitle}`
        : "Finish a chapter to set one",
    },
    {
      label: "Level",
      value: level.name,
      note: `${level.xp.toLocaleString()} XP in total`,
    },
  ];

  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </Link>
        <SettingsLink />
      </header>

      <main className="home-main lb-main">
        <nav aria-label="Breadcrumb" className="ov-crumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Leaderboard</span>
        </nav>
        <div>
          <h1 className="set-title">Leaderboard</h1>
          <p className="home-muted lb-intro">
            You against your own best. Every week you read is on the board.
          </p>
        </div>

        <RaceCard race={records.race} />

        <section className="home-card" aria-labelledby="weeks-title">
          <h2 id="weeks-title" className="home-section-title">
            Your best weeks
          </h2>
          {top.length === 0 ? (
            <p className="home-muted">
              No weeks on the board yet. Read, answer quick checks, and review to earn XP.
            </p>
          ) : (
            <ol className="lb-list">
              {top.map((w, i) => (
                <WeekRow key={w.start} week={w} rank={i + 1} current={w.start === thisStart} />
              ))}
              {below && records.thisWeekRank && (
                <>
                  <li className="lb-gap" aria-hidden="true">
                    ⋯
                  </li>
                  <WeekRow week={below} rank={records.thisWeekRank} current />
                </>
              )}
            </ol>
          )}
        </section>

        <section aria-labelledby="records-title">
          <h2 id="records-title" className="home-section-title lb-records-title">
            Personal records
          </h2>
          <div className="lb-records">
            {cards.map((c) => (
              <div key={c.label} className="home-card lb-record">
                <p className="lb-record-label">{c.label}</p>
                <p className="lb-record-value">{c.value}</p>
                {c.note && <p className="home-muted lb-record-note">{c.note}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="home-card lb-share">
          <div>
            <h2 className="home-section-title">Show it off</h2>
            <p className="home-muted">
              Put your level, streak, and badges on GitHub, LinkedIn, or anywhere else.
            </p>
          </div>
          <Link href="/share" className="ov-secondary">
            Share your progress
          </Link>
        </section>
      </main>
    </div>
  );
}
