import "server-only";
import { and, asc, count, eq, schema } from "@ribbon/db";
import { QUIZZES } from "@/guides/quizzes";
import { db } from "../db";
import {
  buildSections,
  chapterStats,
  EMPTY_STATS,
  type Mastery,
  masteryOf,
  type OverviewNode,
  type SectionStats,
  sectionOfBlock,
} from "./logic";

export interface ChapterOverview {
  id: string;
  number: number | null;
  title: string;
  words: number;
  stats: SectionStats;
  mastery: Mastery;
  sections: OverviewNode[];
}

/** Every chapter of a book with reading and quiz progress, down to each section. */
export async function getBookOverview(userId: string, bookId: string): Promise<ChapterOverview[]> {
  const [chapters, totals, reads, answers] = await Promise.all([
    db
      .select({
        id: schema.chapters.id,
        number: schema.chapters.number,
        title: schema.chapters.title,
        anchor: schema.chapters.anchor,
        words: schema.chapters.words,
        outline: schema.chapters.outline,
      })
      .from(schema.chapters)
      .where(eq(schema.chapters.bookId, bookId))
      .orderBy(asc(schema.chapters.position)),
    db
      .select({
        chapterId: schema.blocks.chapterId,
        section: schema.blocks.sectionAnchor,
        n: count(),
      })
      .from(schema.blocks)
      .where(eq(schema.blocks.bookId, bookId))
      .groupBy(schema.blocks.chapterId, schema.blocks.sectionAnchor),
    db
      .select({
        chapterId: schema.blocks.chapterId,
        section: schema.blocks.sectionAnchor,
        n: count(),
      })
      .from(schema.blockReads)
      .innerJoin(
        schema.blocks,
        and(
          eq(schema.blocks.bookId, schema.blockReads.bookId),
          eq(schema.blocks.id, schema.blockReads.blockId),
        ),
      )
      .where(and(eq(schema.blockReads.userId, userId), eq(schema.blockReads.bookId, bookId)))
      .groupBy(schema.blocks.chapterId, schema.blocks.sectionAnchor),
    db
      .select({ questionId: schema.reviewCards.questionId, box: schema.reviewCards.box })
      .from(schema.reviewCards)
      .where(and(eq(schema.reviewCards.userId, userId), eq(schema.reviewCards.bookId, bookId))),
  ]);

  // Each section's own numbers, keyed by chapter then section anchor.
  const own = new Map<string, Map<string, SectionStats>>();
  const bump = (chapterId: string, section: string, add: Partial<SectionStats>) => {
    const sections = own.get(chapterId) ?? new Map<string, SectionStats>();
    own.set(chapterId, sections);
    const s = { ...(sections.get(section) ?? EMPTY_STATS) };
    for (const [k, v] of Object.entries(add) as [keyof SectionStats, number][]) s[k] += v;
    sections.set(section, s);
  };
  for (const t of totals) bump(t.chapterId, t.section, { total: t.n });
  for (const r of reads) bump(r.chapterId, r.section, { read: r.n });

  // Every answered question has a review card; its box says how well it is remembered.
  const boxes = new Map(answers.map((a) => [a.questionId, a.box]));
  for (const [chapterId, sets] of Object.entries(QUIZZES[bookId] ?? {})) {
    for (const set of sets) {
      const section = sectionOfBlock(set.afterBlockId);
      for (const q of set.questions) {
        const box = boxes.get(q.id);
        bump(chapterId, section, {
          questions: 1,
          answered: box === undefined ? 0 : 1,
          solid: box !== undefined && box >= 2 ? 1 : 0,
          weak: box === 0 ? 1 : 0,
        });
      }
    }
  }

  return chapters.map((c) => {
    const sections = buildSections(c.anchor, c.outline, own.get(c.id) ?? new Map());
    const stats = chapterStats(sections);
    return {
      id: c.id,
      number: c.number,
      title: c.title,
      words: c.words,
      stats,
      mastery: masteryOf(stats),
      sections,
    };
  });
}
