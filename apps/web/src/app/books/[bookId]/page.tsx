import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook, getChapterList } from "@/lib/books";
import { requireUser } from "@/lib/session";

// Placeholder list of chapters. The full book overview (progress, sections) comes in step 7.
export default async function BookPage({ params }: PageProps<"/books/[bookId]">) {
  await requireUser();
  const { bookId } = await params;
  const [book, chapters] = await Promise.all([getBook(bookId), getChapterList(bookId)]);
  if (!book) notFound();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-serif text-3xl font-semibold">{book.title}</h1>
      <ol className="mt-8 space-y-2">
        {chapters.map((c) => (
          <li key={c.id}>
            <Link href={`/books/${bookId}/${c.id}`} className="hover:text-accent">
              {c.number ? `${c.number}. ` : ""}
              {c.title}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
