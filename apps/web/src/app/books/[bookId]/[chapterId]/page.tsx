import type { Inline } from "@ribbon/book-schema";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockView } from "@/components/reader/blocks";
import { Inlines, noteDomId, type RenderContext } from "@/components/reader/inlines";
import { ReaderShell } from "@/components/reader/reader-shell";
import {
  collectXrefTargets,
  getBook,
  getChapter,
  getChapterBlocks,
  getChapterList,
  resolveAnchors,
} from "@/lib/books";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: PageProps<"/books/[bookId]/[chapterId]">): Promise<Metadata> {
  const { bookId, chapterId } = await params;
  const chapter = await getChapter(bookId, chapterId);
  return { title: chapter?.title ?? "Not found" };
}

export default async function ChapterPage({ params }: PageProps<"/books/[bookId]/[chapterId]">) {
  await requireUser();
  const { bookId, chapterId } = await params;
  const [book, chapter, blocks, chapters] = await Promise.all([
    getBook(bookId),
    getChapter(bookId, chapterId),
    getChapterBlocks(bookId, chapterId),
    getChapterList(bookId),
  ]);
  if (!book || !chapter) notFound();

  const noteInlines: Inline[] = chapter.notes.flatMap((n) => n.content);
  const targets = collectXrefTargets([
    ...blocks.map((b) => b.data),
    { id: "notes", type: "paragraph", content: noteInlines },
  ]);
  const ctx: RenderContext = { bookId, chapterId, anchors: await resolveAnchors(bookId, targets) };

  const index = chapters.findIndex((c) => c.id === chapterId);
  const prev = chapters[index - 1];
  const next = chapters[index + 1];

  return (
    <ReaderShell
      bookId={bookId}
      bookTitle={book.title}
      chapterId={chapterId}
      chapterTitle={chapter.title}
      chapterLabel={chapter.number ? `Chapter ${chapter.number}` : chapter.title}
      outline={chapter.outline}
    >
      <article className="reader-body px-5 pt-24 pb-16 sm:px-8" data-chapter={chapterId}>
        {blocks.map((b) => (
          <div
            key={b.id}
            id={b.id}
            className="reader-block"
            data-block-id={b.id}
            data-hash={b.hash}
            data-words={b.words}
            data-section={b.sectionAnchor}
          >
            <BlockView block={b.data} ctx={ctx} />
          </div>
        ))}

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
      </article>
    </ReaderShell>
  );
}
