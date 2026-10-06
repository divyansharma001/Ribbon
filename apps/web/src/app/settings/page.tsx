import type { Metadata } from "next";
import Link from "next/link";
import { GoalSettings } from "@/components/home/goal-settings";
import { RibbonMark } from "@/components/ribbon-mark";
import { ReadingSettings } from "@/components/settings/reading-settings";
import { SignOutButton } from "@/components/settings/sign-out";
import { getBooks } from "@/lib/books";
import { getReaderPrefs } from "@/lib/prefs-server";
import { requireUser } from "@/lib/session";
import { getStreakSettings } from "@/lib/streaks/data";

export const metadata: Metadata = { title: "Settings" };

/** "in India Standard Time" for "Asia/Kolkata", or the id itself if the name is unknown. */
function zoneName(timeZone: string) {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    if (name) return <strong>{/^GMT/.test(name) ? `at ${name}` : `in ${name}`}</strong>;
  } catch {}
  return <strong>in {timeZone}</strong>;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const [prefs, goal, books] = await Promise.all([
    getReaderPrefs(),
    getStreakSettings(user.id),
    getBooks(),
  ]);

  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </Link>
      </header>

      <main className="home-main set-main">
        <nav aria-label="Breadcrumb" className="ov-crumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Settings</span>
        </nav>
        <h1 className="set-title">Settings</h1>

        <section className="home-card set-section" aria-labelledby="reading-title">
          <h2 id="reading-title" className="home-section-title">
            Reading
          </h2>
          <ReadingSettings initial={prefs} />
        </section>

        <section className="home-card set-section" aria-labelledby="goal-title">
          <h2 id="goal-title" className="home-section-title">
            Streak
          </h2>
          <GoalSettings
            goalMinutes={goal.goalMinutes}
            weekendsOff={goal.weekendsOff}
            strictFocus={goal.strictFocus}
          />
          <p className="home-muted">
            Every 7 days in a row earns a freeze (up to 2), which saves your streak on a missed day.
            Friends can gift you more. Once a month, reading double your goal the day after a miss
            repairs it.
          </p>
          <p className="set-hint set-zone">
            Days start at midnight {zoneName(goal.timeZone)} ({goal.timeZone.replace(/_/g, " ")}),
            taken from this device.
          </p>
        </section>

        <section className="home-card set-section" aria-labelledby="data-title">
          <h2 id="data-title" className="home-section-title">
            Your notes
          </h2>
          <p className="home-muted">
            Download every highlight, note, and bookmark as a Markdown file, grouped by chapter.
          </p>
          <div className="set-actions">
            {books.map((b) => (
              <a key={b.id} href={`/api/books/${b.id}/notes`} className="ov-secondary" download>
                Export notes{books.length > 1 ? `: ${b.title}` : ""}
              </a>
            ))}
          </div>
        </section>

        <section className="home-card set-section" aria-labelledby="sharing-title">
          <h2 id="sharing-title" className="home-section-title">
            Sharing
          </h2>
          <p className="home-muted">
            A public profile with your level, streak, and badges, for GitHub, LinkedIn, and anywhere
            else. Off unless you turn it on.
          </p>
          <div className="set-actions">
            <Link href="/share" className="ov-secondary">
              Public profile and badges
            </Link>
            <Link href="/leaderboard" className="ov-secondary">
              Leaderboard
            </Link>
            <Link href="/invite" className="ov-secondary">
              Invite friends
            </Link>
          </div>
        </section>

        <section className="home-card set-section" aria-labelledby="account-title">
          <h2 id="account-title" className="home-section-title">
            Account
          </h2>
          <div className="set-account">
            <span className="set-avatar" aria-hidden="true">
              {user.name.charAt(0)}
            </span>
            <span className="set-who">
              <span className="font-medium">{user.name}</span>
              <span className="home-muted">{user.email}</span>
            </span>
            <SignOutButton />
          </div>
        </section>
      </main>
    </div>
  );
}
