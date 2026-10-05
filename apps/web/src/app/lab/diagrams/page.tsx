import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DIAGRAMS } from "@/diagrams/registry";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Diagram lab" };

/** Development-only page that shows every diagram, for checking them on their own. */
export default async function DiagramLab() {
  if (process.env.NODE_ENV === "production") notFound();
  await requireUser();
  const all = Object.entries(DIAGRAMS).flatMap(([book, chapters]) =>
    Object.entries(chapters).flatMap(([chapter, list]) =>
      list.map((d) => ({ ...d, book, chapter })),
    ),
  );
  return (
    <main className="reader-body px-5 py-12 sm:px-8">
      {all.map(({ id, book, chapter, Component }) => (
        <section key={`${book}-${chapter}-${id}`} id={id}>
          <p className="font-sans text-xs text-muted">
            {book} / {chapter} / {id}
          </p>
          <Component />
        </section>
      ))}
    </main>
  );
}
