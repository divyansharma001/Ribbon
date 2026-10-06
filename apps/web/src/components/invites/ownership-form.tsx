"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmOwnershipAction } from "@/lib/invites/actions";

/** "I own this book": unlocks it for this reader. */
export function OwnershipForm({
  bookId,
  title,
  next,
}: {
  bookId: string;
  title: string;
  next: string;
}) {
  const router = useRouter();
  const [owns, setOwns] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form
      className="own-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!owns) return;
        start(async () => {
          await confirmOwnershipAction(bookId);
          router.push(next as Route);
        });
      }}
    >
      <label className="own-check">
        <input type="checkbox" checked={owns} onChange={(e) => setOwns(e.target.checked)} />
        <span>
          I own a copy of <em>{title}</em> (print or ebook).
        </span>
      </label>
      <button type="submit" className="home-button own-button" disabled={!owns || pending}>
        {pending ? "Unlocking…" : "Start reading"}
      </button>
    </form>
  );
}
