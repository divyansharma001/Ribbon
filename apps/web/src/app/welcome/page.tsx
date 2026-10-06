import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OwnershipForm } from "@/components/invites/ownership-form";
import { RibbonMark } from "@/components/ribbon-mark";
import { getBooks } from "@/lib/books";
import { hasBookAccess } from "@/lib/invites/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome" };

/** First stop for a friend who just joined: confirm they own the book. */
export default async function Welcome() {
  const user = await requireUser();
  const [book] = await getBooks();
  if (!book || (await hasBookAccess(user, book.id))) redirect("/");
  return (
    <main className="join-main">
      <div className="home-card join-card">
        <RibbonMark className="h-9 w-[27px] text-accent" />
        <p className="home-eyebrow">Welcome to Ribbon</p>
        <h1 className="join-title">Hi {user.name.split(" ")[0]}, one quick thing</h1>
        <p className="join-pitch">
          Ribbon has <em>{book.title}</em> ready to read. It's a paid book, so please read it here
          only if you own a copy.
        </p>
        <OwnershipForm bookId={book.id} title={book.title} next="/" />
      </div>
    </main>
  );
}
