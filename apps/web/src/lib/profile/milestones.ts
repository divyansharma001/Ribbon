import { BADGE_MARKS } from "./card";
import type { PublicStats } from "./data";

/** Something worth showing on LinkedIn, with its own proof page. */
export interface Milestone {
  id: string;
  /** Name as it appears on LinkedIn. */
  name: string;
  mark: string;
  /** One line on what it means. */
  detail: string;
}

/** The reader's milestones: the current level, a finished book, and every earned badge. */
export function milestonesFor(s: PublicStats): Milestone[] {
  const out: Milestone[] = [
    {
      id: "level",
      name: `Ribbon reading level: ${s.level.name}`,
      mark: String(s.level.index + 1),
      detail: `${s.level.xp.toLocaleString("en-US")} XP from reading, quick checks, and reviews.`,
    },
  ];
  if (s.book && s.book.chaptersDone >= s.book.chapters) {
    out.push({
      id: "book",
      name: `Read ${s.book.title}`,
      mark: "✓",
      detail: `Every chapter read, ${s.answered} quick-check questions answered.`,
    });
  }
  for (const b of s.badges) {
    if (b.earned) {
      out.push({
        id: b.id,
        name: `Ribbon reading badge: ${b.name}`,
        mark: BADGE_MARKS[b.id] ?? "•",
        detail: b.how,
      });
    }
  }
  return out;
}
