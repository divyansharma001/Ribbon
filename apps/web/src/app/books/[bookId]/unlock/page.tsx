import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OwnershipForm } from "@/components/invites/ownership-form";
import { RibbonMark } from "@/components/ribbon-mark";
import { getBook } from "@/lib/books";
import { hasBookAccess } from "@/lib/invites/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Unlock the book" };

/** Shown instead of a book until the reader confirms they own it. */
export default async function Unlock({ params }: PageProps<"/books/[bookId]/unlock">) {
  const user = await requireUser();
  const { bookId } = await params;
  const book = await getBook(bookId);
  if (!book) notFound();
  if (await hasBookAccess(user, book.id)) redirect(`/books/${book.id}`);
  return (
    <main className="join-main">
      <div className="home-card join-card">
        <RibbonMark className="h-9 w-[27px] text-accent" />
        <h1 className="join-title">Do you own this book?</h1>
        <p className="join-pitch">
          <em>{book.title}</em> is a paid book. Please read it here only if you own a copy.
        </p>
        <OwnershipForm bookId={book.id} title={book.title} next={`/books/${book.id}`} />
        <Link href="/" className="home-muted join-back">
          Back to Home
        </Link>
      </div>
    </main>
  );
}
