import type { Inline } from "@ribbon/book-schema";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { AnnotationLayer } from "@/components/annotations/annotation-layer";
import { BookmarkFlag } from "@/components/annotations/bookmarks";
import { BookView } from "@/components/book/book-view";
import { QuizCard } from "@/components/quiz/quiz-card";
import { Blocks, BlockView } from "@/components/reader/blocks";
import { Inlines, noteDomId, type RenderContext, termDomId } from "@/components/reader/inlines";
import { ReaderPopups } from "@/components/reader/reader-popups";
import { ReaderShell } from "@/components/reader/reader-shell";
import { ReadingTracker } from "@/components/reader/reading-tracker";
import { TodayRing } from "@/components/reader/today-ring";
import { diagramsFor } from "@/diagrams/registry";
import { inShortFor } from "@/guides/in-short";
import { InShortCard } from "@/guides/in-short-card";
import { quizzesFor } from "@/guides/quizzes";
import { getAnnotations } from "@/lib/annotations/data";
import {
  collectXrefTargets,
  getBook,
  getChapter,
  getChapterBlocks,
  getChapterList,
  getGlossary,
  resolveAnchors,
} from "@/lib/books";
import { glossaryLookup, termsUsed } from "@/lib/glossary";
import { getChapterAnswers } from "@/lib/learning/data";
import { TEXT_SCALE } from "@/lib/prefs";
import { getReaderPrefs } from "@/lib/prefs-server";
import { getResumeState } from "@/lib/reading/positions";
import { requireUser } from "@/lib/session";
import { getStreak } from "@/lib/streaks/data";

export async function generateMetadata({
  params,
}: PageProps<"/books/[bookId]/[chapterId]">): Promise<Metadata> {
  const { bookId, chapterId } = await params;
  const chapter = await getChapter(bookId, chapterId);
  return { title: chapter?.title ?? "Not found" };
}

export default async function ChapterPage({ params }: PageProps<"/books/[bookId]/[chapterId]">) {
  const user = await requireUser();
  const { bookId, chapterId } = await params;
  const [book, chapter, blocks, chapters, resume, prefs, streak, answers, glossary, marks] =
    await Promise.all([
      getBook(bookId),
      getChapter(bookId, chapterId),
      getChapterBlocks(bookId, chapterId),
      getChapterList(bookId),
      getResumeState(user.id, bookId),
      getReaderPrefs(),
      getStreak(user.id),
      getChapterAnswers(user.id, bookId, chapterId),
      getGlossary(bookId),
      getAnnotations(user.id, bookId, chapterId),
    ]);
  if (!book || !chapter) notFound();

  // Glossary terms named in this chapter. Their definitions ride along, hidden, for the popups.
  const lookup = glossaryLookup(glossary.map((g) => g.term));
  const used = termsUsed(
    blocks.map((b) => b.data),
    lookup,
  );
  const definitions = glossary.filter((g) => used.has(g.term));

  const noteInlines: Inline[] = chapter.notes.flatMap((n) => n.content);
  const targets = collectXrefTargets([
    ...blocks.map((b) => b.data),
    ...definitions.flatMap((d) => d.body),
    { id: "notes", type: "paragraph", content: noteInlines },
  ]);
  const ctx: RenderContext = {
    bookId,
    chapterId,
    anchors: await resolveAnchors(bookId, targets),
    glossary: lookup,
  };
  // Definitions themselves don't open more popups.
  const plainCtx: RenderContext = { bookId, chapterId, anchors: ctx.anchors };

  const inShort = inShortFor(bookId, chapterId);

  // Quick checks at the end of sections, keyed by the block they follow.
  const quizzes = new Map(quizzesFor(bookId, chapterId).map((q) => [q.afterBlockId, q]));

  // Ribbon diagrams, keyed by the block they follow.
  const diagrams = new Map(diagramsFor(bookId, chapterId).map((d) => [d.afterBlockId, d]));
  if (process.env.NODE_ENV !== "production") {
    for (const d of [...diagrams.values(), ...quizzes.values()]) {
      const block = blocks.find((b) => b.id === d.afterBlockId);
      if (!block || block.hash !== d.blockHash) {
        console.warn(
          `"${d.id}" anchor block ${d.afterBlockId} is missing or changed. Check its placement.`,
        );
      }
    }
  }

  const index = chapters.findIndex((c) => c.id === chapterId);
  const prev = chapters[index - 1];
  const next = chapters[index + 1];

  const chapterLabel = chapter.number ? `Chapter ${chapter.number}` : chapter.title;
  // The chapter's text, shown either as book pages or as one long scroll.
  const content = (
    <>
      {blocks.map((b) => {
        const diagram = diagrams.get(b.id);
        const quiz = quizzes.get(b.id);
        const summary = b.data.type === "heading" ? inShort[b.data.anchor] : undefined;
        return (
          <Fragment key={b.id}>
            <div
              id={b.id}
              className="reader-block"
              data-block-id={b.id}
              data-hash={b.hash}
              data-words={b.words}
              data-section={b.sectionAnchor}
            >
              <BlockView block={b.data} ctx={ctx} />
              <BookmarkFlag blockId={b.id} />
            </div>
            {summary && <InShortCard summary={summary} />}
            {diagram && <diagram.Component />}
            {quiz && <QuizCard set={quiz} bookId={bookId} answered={answers} />}
          </Fragment>
        );
      })}

      {chapter.notes.length > 0 && (
        <section className="reader-references" aria-labelledby="references">
          <h2 id="references">References</h2>
          <ol>
            {chapter.notes.map((note) => (
              <li key={note.anchor} id={noteDomId(note.anchor)}>
                <span className="reader-ref-label">{note.label}</span>
                <span>
                  <Inlines nodes={note.content} ctx={ctx} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <nav className="mt-16 grid grid-cols-2 gap-3 font-sans text-sm" aria-label="Chapters">
        {prev ? (
          <Link href={`/books/${bookId}/${prev.id}`} className="chapter-nav">
            <span className="text-muted">Previous</span>
            <span className="font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/books/${bookId}/${next.id}`} className="chapter-nav text-right">
            <span className="text-muted">Next</span>
            <span className="font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </>
  );

  return (
    <ReaderShell
      bookId={bookId}
      bookTitle={book.title}
      chapterId={chapterId}
      chapterTitle={chapter.title}
      chapterLabel={chapterLabel}
      outline={chapter.outline}
      today={
        <TodayRing
          baseMinutes={streak.todayMinutes}
          goal={streak.goalMinutes}
          streak={streak.current}
          today={streak.today}
        />
      }
    >
      {prefs.mode === "book" ? (
        <BookView
          chapterLabel={chapterLabel}
          textScale={TEXT_SCALE[prefs.textSize]}
          prevHref={prev ? `/books/${bookId}/${prev.id}#end` : null}
          nextHref={next ? `/books/${bookId}/${next.id}` : null}
        >
          {content}
        </BookView>
      ) : (
        <article className="reader-body px-5 pt-24 pb-16 sm:px-8" data-chapter={chapterId}>
          {content}
        </article>
      )}
      <div hidden>
        {definitions.map((d) => (
          <div key={d.term} id={termDomId(d.term)}>
            <Blocks blocks={d.body} ctx={plainCtx} />
          </div>
        ))}
      </div>
      <ReaderPopups />
      <AnnotationLayer bookId={bookId} chapterId={chapterId} initial={marks} />
      <ReadingTracker
        bookId={bookId}
        chapterId={chapterId}
        saved={resume.thisDevice}
        otherDevice={resume.otherDevice}
      />
    </ReaderShell>
  );
}
