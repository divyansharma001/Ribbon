import type { Metadata } from "next";
import Link from "next/link";
import { GoalSettings, TimeZoneSync } from "@/components/home/goal-settings";
import { BadgeShelf, LevelCard, ReviewCard } from "@/components/home/learning-parts";
import {
  FlameIcon,
  GoalRing,
  SnowflakeIcon,
  StreakCalendar,
  WeekStrip,
} from "@/components/home/streak-parts";
import { RibbonMark } from "@/components/ribbon-mark";
import { SettingsLink } from "@/components/settings-link";
import { SoundButton } from "@/components/sound/sound-button";
import { ThemePicker } from "@/components/theme-picker";
import { getBookProgress, getContinueReading } from "@/lib/home";
import { getDueCount, getLearningStats, getNextDue } from "@/lib/learning/data";
import { badgesFor, levelFor, xpFrom } from "@/lib/learning/logic";
import { timeAgo } from "@/lib/reading/logic";
import { requireUser } from "@/lib/session";
import { getStreak } from "@/lib/streaks/data";
import { lastDays } from "@/lib/streaks/logic";

export const metadata: Metadata = { title: "Home" };

/** A year on wide screens; narrower screens show fewer of the latest weeks (see home.css). */
const CALENDAR_WEEKS = 52;

function greeting(timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(
      new Date(),
    ),
  );
  return hour < 5
    ? "Good night"
    : hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";
}

export default async function Home() {
  const user = await requireUser();
  const [streak, last, books, stats, due, nextDue] = await Promise.all([
    getStreak(user.id),
    getContinueReading(user.id),
    getBookProgress(user.id),
    getLearningStats(user.id),
    getDueCount(user.id),
    getNextDue(user.id),
  ]);
  const level = levelFor(xpFrom(stats));
  const { settings } = streak;
  const firstName = user.name.split(" ")[0] ?? user.name;
  const left = Math.max(0, Math.ceil(streak.goalMinutes - streak.todayMinutes));
  const days = lastDays(streak, streak.today, CALENDAR_WEEKS * 7);
  const dateLine = new Date(`${streak.today}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="home">
      <TimeZoneSync saved={settings.timeZone} />
      <header className="home-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </Link>
        <div className="flex items-center gap-1">
          <SoundButton />
          <ThemePicker />
          <SettingsLink />
        </div>
      </header>

      <main className="home-main">
        <section className="home-hello">
          <h1>
            {greeting(settings.timeZone)}, {firstName}
          </h1>
          <p>{dateLine}</p>
        </section>

        <div className="home-grid">
          {last ? (
            <Link
              href={`/books/${last.bookId}/${last.chapterId}#${last.blockId}`}
              className="home-card home-continue"
            >
              <p className="home-eyebrow">Continue reading</p>
              <p className="home-continue-where">
                {last.chapterNumber ? `Chapter ${last.chapterNumber} · ` : ""}
                {last.chapterTitle}
              </p>
              <h2>{last.sectionTitle}</h2>
              <blockquote>{last.snippet}</blockquote>
              <div className="home-continue-foot">
                <span className="home-progress" aria-hidden="true">
                  <span style={{ width: `${Math.round(last.chapterProgress * 100)}%` }} />
                </span>
                <span>{Math.round(last.chapterProgress * 100)}% of chapter</span>
                <span className="home-continue-device">
                  {last.deviceLabel}, {timeAgo(last.readAt)}
                </span>
              </div>
              <span className="home-button">Continue</span>
            </Link>
          ) : (
            <Link href="/books/ddia-2e/ch01" className="home-card home-continue">
              <p className="home-eyebrow">Start reading</p>
              <h2>{books[0]?.title ?? "Your first book"}</h2>
              <p className="home-muted">
                Open chapter 1. Ribbon remembers your place from here on.
              </p>
              <span className="home-button">Start</span>
            </Link>
          )}

          <section className="home-card home-streak" aria-labelledby="streak-title">
            <div className="home-streak-top">
              <div>
                <p className="home-eyebrow">Streak</p>
                <h2 id="streak-title" className="home-streak-count">
                  <FlameIcon className={streak.current > 0 ? "home-flame is-lit" : "home-flame"} />
                  {streak.current} {streak.current === 1 ? "day" : "days"}
                </h2>
                <p className="home-muted">
                  Best {streak.best}
                  {streak.freezes > 0 && (
                    <>
                      <span className="home-dot">·</span>
                      <SnowflakeIcon className="home-snow" />
                      {streak.freezes} {streak.freezes === 1 ? "freeze" : "freezes"}
                    </>
                  )}
                </p>
              </div>
              <GoalRing minutes={streak.todayMinutes} goal={streak.goalMinutes} />
            </div>
            <WeekStrip days={streak.days} today={streak.today} />
            <p className="home-streak-note">
              {streak.todayMet
                ? "Today's goal is done. See you tomorrow."
                : streak.repairMinutes
                  ? `You missed yesterday. Read ${streak.repairMinutes} minutes today to repair your streak.`
                  : `${left} ${left === 1 ? "minute" : "minutes"} left to reach today's goal.`}
            </p>
          </section>
        </div>

        <div className="home-grid home-grid-even">
          <LevelCard level={level} />
          <ReviewCard due={due} next={nextDue} />
        </div>

        <section className="home-card home-calendar" aria-labelledby="calendar-title">
          <div className="home-section-head">
            <h2 id="calendar-title">Reading calendar</h2>
            <div className="streak-legend" aria-hidden="true">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span
                  key={l}
                  className="streak-day"
                  data-status={l ? "met" : "none"}
                  data-level={l}
                />
              ))}
              <span>More</span>
              <span className="streak-day" data-status="frozen" />
              <span>Freeze</span>
            </div>
          </div>
          <StreakCalendar days={days} goal={streak.goalMinutes} />
        </section>

        <BadgeShelf badges={badgesFor(stats)} />

        <div className="home-grid home-grid-even">
          <section className="home-card" aria-labelledby="books-title">
            <h2 id="books-title" className="home-section-title">
              Your books
            </h2>
            {books.map((b) => (
              <Link key={b.id} href={`/books/${b.id}`} className="home-book">
                <span className="home-book-cover" aria-hidden="true">
                  <RibbonMark className="h-5 w-[15px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="home-book-title">{b.title}</span>
                  <span className="home-muted block">
                    {b.authors.join(", ")} · {b.chapters} chapters
                  </span>
                  <span className="home-progress home-book-progress" aria-hidden="true">
                    <span style={{ width: `${Math.max(1, Math.round(b.read * 100))}%` }} />
                  </span>
                  <span className="home-muted block">{Math.round(b.read * 100)}% read</span>
                </span>
              </Link>
            ))}
          </section>

          <section className="home-card" aria-labelledby="goal-title">
            <h2 id="goal-title" className="home-section-title">
              Your goal
            </h2>
            <GoalSettings goalMinutes={settings.goalMinutes} weekendsOff={settings.weekendsOff} />
            <p className="home-muted home-rules">
              Every 7 days in a row earns a freeze (up to 2), which saves your streak on a missed
              day. Once a month, reading double your goal the day after a miss repairs it.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
