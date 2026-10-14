import type { Metadata } from "next";
import Link from "next/link";
import { RibbonMark } from "@/components/ribbon-mark";

export const metadata: Metadata = { title: "Stop reminder emails" };

/**
 * Where the "Stop these emails" link lands. Nothing changes until the button
 * is pressed, so mail scanners that open links can't turn reminders off.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string; done?: string }>;
}) {
  const { u, t, done } = await searchParams;
  const action = `/api/email/unsubscribe?u=${encodeURIComponent(u ?? "")}&t=${encodeURIComponent(t ?? "")}`;

  return (
    <main className="unsub">
      <div className="home-card unsub-card">
        <RibbonMark className="h-7 w-[21px] text-accent" />
        {done ? (
          <>
            <h1 className="unsub-title">Reminder emails are off</h1>
            <p className="home-muted">
              You won't get any more. You can turn them back on in Settings at any time.
            </p>
            <Link href="/settings#reminder" className="ov-secondary">
              Open Settings
            </Link>
          </>
        ) : u && t ? (
          <>
            <h1 className="unsub-title">Stop reminder emails?</h1>
            <p className="home-muted">
              Ribbon will stop emailing you a daily reading reminder. Your streak and reading are
              not affected.
            </p>
            <form method="post" action={action}>
              <button type="submit" className="home-button">
                Stop reminder emails
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="unsub-title">This link is not complete</h1>
            <p className="home-muted">
              Use the link at the bottom of a reminder email, or turn reminders off in Settings.
            </p>
            <Link href="/settings#reminder" className="ov-secondary">
              Open Settings
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
