import type { Inline } from "@ribbon/book-schema";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { BookView } from "@/components/book/book-view";
import { BlockView } from "@/components/reader/blocks";
import { Inlines, noteDomId, type RenderContext } from "@/components/reader/inlines";
import { ReaderShell } from "@/components/reader/reader-shell";
import { ReadingTracker } from "@/components/reader/reading-tracker";
import { diagramsFor } from "@/diagrams/registry";
import { inShortFor } from "@/guides/in-short";
import { InShortCard } from "@/guides/in-short-card";
import {
  collectXrefTargets,
  getBook,
  getChapter,
  getChapterBlocks,
  getChapterList,
  resolveAnchors,
} from "@/lib/books";
import { getResumeState } from "@/lib/reading/positions";
import { requireUser } from "@/lib/session";
import { getReadingModeCookie } from "@/lib/theme";

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
  const [book, chapter, blocks, chapters, resume, mode] = await Promise.all([
    getBook(bookId),
    getChapter(bookId, chapterId),
    getChapterBlocks(bookId, chapterId),
    getChapterList(bookId),
    getResumeState(user.id, bookId),
    getReadingModeCookie(),
  ]);
  if (!book || !chapter) notFound();

  const noteInlines: Inline[] = chapter.notes.flatMap((n) => n.content);
  const targets = collectXrefTargets([
    ...blocks.map((b) => b.data),
    { id: "notes", type: "paragraph", content: noteInlines },
  ]);
  const ctx: RenderContext = { bookId, chapterId, anchors: await resolveAnchors(bookId, targets) };

  const inShort = inShortFor(bookId, chapterId);

  // Ribbon diagrams, keyed by the block they follow.
  const diagrams = new Map(diagramsFor(bookId, chapterId).map((d) => [d.afterBlockId, d]));
  if (process.env.NODE_ENV !== "production") {
    for (const d of diagrams.values()) {
      const block = blocks.find((b) => b.id === d.afterBlockId);
      if (!block || block.hash !== d.blockHash) {
        console.warn(
          `Diagram "${d.id}" anchor block ${d.afterBlockId} is missing or changed. Check its placement.`,
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
            </div>
            {summary && <InShortCard summary={summary} />}
            {diagram && <diagram.Component />}
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
    >
      {mode === "book" ? (
        <BookView
          chapterLabel={chapterLabel}
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
      <ReadingTracker
        bookId={bookId}
        chapterId={chapterId}
        saved={resume.thisDevice}
        otherDevice={resume.otherDevice}
      />
    </ReaderShell>
  );
}
