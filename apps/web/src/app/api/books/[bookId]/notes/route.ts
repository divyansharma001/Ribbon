import type { NextRequest } from "next/server";
import { getBookNotes } from "@/lib/annotations/data";
import { getBook } from "@/lib/books";
import { getSession } from "@/lib/session";

/** Quotes text as a Markdown blockquote, keeping its line breaks. */
const quote = (text: string) =>
  text
    .split("\n")
    .map((line) => `> ${line}`.trimEnd())
    .join("\n");

/** Every highlight, note, and bookmark in a book, as a Markdown file. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/books/[bookId]/notes">) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { bookId } = await ctx.params;
  const book = await getBook(bookId);
  if (!book) return new Response("Not found", { status: 404 });
  const notes = await getBookNotes(session.user.id, bookId);

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines = [
    `# ${book.title}`,
    "",
    `Notes and highlights, exported from Ribbon on ${date}.`,
    "",
  ];
  if (notes.length === 0) lines.push("No notes or highlights yet.", "");
  let chapter = "";
  for (const n of notes) {
    if (n.chapterId !== chapter) {
      chapter = n.chapterId;
      lines.push(
        `## ${n.chapterNumber ? `Chapter ${n.chapterNumber}: ` : ""}${n.chapterTitle}`,
        "",
      );
    }
    if (n.kind === "bookmark") {
      lines.push(`**Bookmark:** ${n.text}`, "");
      continue;
    }
    lines.push(quote(n.text), "");
    if (n.note) lines.push(n.note, "");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="ribbon-notes-${bookId}.md"`,
      "Cache-Control": "private, no-store",
    },
  });
}
