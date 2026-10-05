import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RibbonMark } from "@/components/ribbon-mark";
import { SoundButton } from "@/components/sound/sound-button";
import { ThemePicker } from "@/components/theme-picker";
import { getBook } from "@/lib/books";
import { getContinueReading } from "@/lib/home";
import { getDueCount } from "@/lib/learning/data";
import { getBookOverview } from "@/lib/overview/data";
import {
  addStats,
  EMPTY_STATS,
  MASTERY_LABELS,
  type Mastery,
  type OverviewNode,
  READ_THRESHOLD,
  readShare,
  type SectionStats,
} from "@/lib/overview/logic";
import { requireUser } from "@/lib/session";

/** Average adult reading speed, for "minutes left". */
const WORDS_PER_MINUTE = 230;

export async function generateMetadata({
  params,
}: PageProps<"/books/[bookId]">): Promise<Metadata> {
  const { bookId } = await params;
  const book = await getBook(bookId);
  return { title: book?.title ?? "Not found" };
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

function MasteryChip({ mastery }: { mastery: Mastery }) {
  return (
    <span className="ov-chip" data-mastery={mastery}>
      {MASTERY_LABELS[mastery]}
    </span>
  );
}

function Bar({ share, label }: { share: number; label: string }) {
  return (
    <span
      className="ov-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
    >
      <span style={{ width: percent(share) }} />
    </span>
  );
}

function quizLine(s: SectionStats): string | null {
  if (s.questions === 0) return null;
  return `${s.answered}/${s.questions} answered`;
}

function SectionRow({
  node,
  href,
  depth,
}: {
  node: OverviewNode;
  href: (blockId: string) => Route;
  depth: number;
}) {
  const quiz = quizLine(node.stats);
  return (
    <li>
      <div className="ov-section" data-depth={depth}>
        <Link href={href(node.blockId)} className="ov-section-title">
          {node.title}
        </Link>
        <span className="ov-section-meta">
          {node.stats.weak > 0 && (
            <Link href="/review" className="ov-weak">
              {node.stats.weak} to review
            </Link>
          )}
          {quiz && <span className="ov-quiz">{quiz}</span>}
          <Bar share={readShare(node.stats)} label={`${node.title}: read`} />
          <MasteryChip mastery={node.mastery} />
        </span>
      </div>
      {/* Two levels are enough to find your way; deeper subsections are added into their parent. */}
      {depth < 2 && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <SectionRow key={child.anchor} node={child} href={href} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function BookPage({ params }: PageProps<"/books/[bookId]">) {
  const user = await requireUser();
  const { bookId } = await params;
  const [book, chapters, last, due] = await Promise.all([
    getBook(bookId),
    getBookOverview(user.id, bookId),
    getContinueReading(user.id),
    getDueCount(user.id),
  ]);
  if (!book) notFound();

  const here = last?.bookId === bookId ? last : null;
  const numbered = chapters.filter((c) => c.number !== null);
  const all = chapters.reduce((sum, c) => addStats(sum, c.stats), EMPTY_STATS);
  const chaptersRead = numbered.filter((c) => readShare(c.stats) >= READ_THRESHOLD).length;
  const wordsLeft = chapters.reduce((sum, c) => sum + c.words * (1 - readShare(c.stats)), 0);
  const hoursLeft = wordsLeft / WORDS_PER_MINUTE / 60;
  const first = numbered[0] ?? chapters[0];

  return (
    <div className="home">
      <header className="home-bar">
        <Link href="/" className="flex items-center gap-2.5">
          <RibbonMark className="h-6 w-[18px] text-accent" />
          <span className="font-serif text-lg font-semibold">Ribbon</span>
        </Link>
        <div className="flex items-center gap-1">
          <SoundButton />
          <ThemePicker />
        </div>
      </header>

      <main className="home-main ov-main">
        <nav aria-label="Breadcrumb" className="ov-crumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>{book.title}</span>
        </nav>

        <section className="home-card ov-hero">
          <div className="ov-hero-text">
            <h1>{book.title}</h1>
            <p className="home-muted">{book.authors.join(", ")}</p>
          </div>
          <dl className="ov-stats">
            <div>
              <dt>Read</dt>
              <dd>{percent(readShare(all))}</dd>
            </div>
            <div>
              <dt>Chapters done</dt>
              <dd>
                {chaptersRead}
                <span className="ov-stat-of"> / {numbered.length}</span>
              </dd>
            </div>
            <div>
              <dt>Questions answered</dt>
              <dd>
                {all.answered}
                <span className="ov-stat-of"> / {all.questions}</span>
              </dd>
            </div>
            <div>
              <dt>Time left</dt>
              <dd>
                {hoursLeft >= 1 ? `${Math.round(hoursLeft)}h` : `${Math.round(hoursLeft * 60)} min`}
              </dd>
            </div>
          </dl>
          <div className="ov-actions">
            {here ? (
              <Link
                href={`/books/${bookId}/${here.chapterId}#${here.blockId}`}
                className="home-button ov-continue"
              >
                Continue · {here.chapterNumber ? `Ch ${here.chapterNumber}, ` : ""}
                {here.sectionTitle}
              </Link>
            ) : (
              first && (
                <Link href={`/books/${bookId}/${first.id}`} className="home-button ov-continue">
                  Start reading
                </Link>
              )
            )}
            {due > 0 && (
              <Link href="/review" className="ov-secondary">
                Review {due} {due === 1 ? "card" : "cards"}
              </Link>
            )}
          </div>
        </section>

        <section aria-labelledby="chapters-title">
          <div className="ov-list-head">
            <h2 id="chapters-title" className="home-section-title">
              Chapters
            </h2>
            <p className="ov-legend">
              {(Object.keys(MASTERY_LABELS) as Mastery[]).map((m) => (
                <MasteryChip key={m} mastery={m} />
              ))}
            </p>
          </div>
          <ol className="ov-chapters">
            {chapters.map((c) => {
              const share = readShare(c.stats);
              const quiz = quizLine(c.stats);
              const href = (blockId: string) => `/books/${bookId}/${c.id}#${blockId}` as Route;
              return (
                <li key={c.id}>
                  <details className="ov-chapter" open={c.id === here?.chapterId}>
                    <summary>
                      <span className="ov-num" aria-hidden="true">
                        {c.number ?? c.title.charAt(0)}
                      </span>
                      <span className="ov-chapter-main">
                        <span className="ov-chapter-title">{c.title}</span>
                        <span className="ov-chapter-meta">
                          {Math.max(1, Math.round(c.words / WORDS_PER_MINUTE))} min
                          {quiz && <> · {quiz}</>}
                          {c.stats.weak > 0 && <> · {c.stats.weak} to review</>}
                        </span>
                      </span>
                      <span className="ov-chapter-side">
                        <Bar share={share} label={`${c.title}: read`} />
                        <span className="ov-pct">{percent(share)}</span>
                        <MasteryChip mastery={c.mastery} />
                      </span>
                    </summary>
                    <div className="ov-chapter-body">
                      <ul className="ov-sections">
                        {c.sections.map((s) => (
                          <SectionRow key={s.anchor} node={s} href={href} depth={1} />
                        ))}
                      </ul>
                      <Link href={`/books/${bookId}/${c.id}`} className="ov-open">
                        Open chapter
                      </Link>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
