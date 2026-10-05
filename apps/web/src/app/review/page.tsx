import type { Metadata } from "next";
import Link from "next/link";
import { RibbonMark } from "@/components/ribbon-mark";
import { getDueCards, getNextDue } from "@/lib/learning/data";
import { requireUser } from "@/lib/session";
import { ReviewSession } from "./review-session";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const user = await requireUser();
  const [cards, next] = await Promise.all([getDueCards(user.id, 20), getNextDue(user.id)]);

  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </Link>
      </header>
      <main className="review-main">
        <h1>Review</h1>
        <p className="home-muted">Questions you answered before, spaced out so they stick.</p>
        {cards.length > 0 ? (
          <ReviewSession
            cards={cards.map((c) => ({
              bookId: c.bookId,
              chapterId: c.chapterId,
              question: c.question,
            }))}
          />
        ) : (
          <div className="review-card review-done">
            <p className="home-eyebrow">All caught up</p>
            <h2>Nothing to review right now</h2>
            <p className="home-muted">
              {next
                ? `Your next card is due ${next.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}.`
                : "Answer some quick checks while reading and they will show up here."}
            </p>
            <Link href="/" className="home-button">
              Back home
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
