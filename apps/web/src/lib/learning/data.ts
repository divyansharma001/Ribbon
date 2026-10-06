import "server-only";
import { and, count, eq, schema, sql } from "@ribbon/db";
import { cache } from "react";
import { QUIZZES, questionIndex } from "@/guides/quizzes";
import { db } from "../db";
import { getStreak } from "../streaks/data";
import { firstSchedule, type LearningStats, scheduleReview } from "./logic";

/** The reader's answers for one chapter: question id -> right on the first try. */
export async function getChapterAnswers(userId: string, bookId: string, chapterId: string) {
  const rows = await db
    .select({ id: schema.quizAnswers.questionId, firstCorrect: schema.quizAnswers.firstCorrect })
    .from(schema.quizAnswers)
    .where(
      and(
        eq(schema.quizAnswers.userId, userId),
        eq(schema.quizAnswers.bookId, bookId),
        eq(schema.quizAnswers.chapterId, chapterId),
      ),
    );
  return Object.fromEntries(rows.map((r) => [r.id, r.firstCorrect])) as Record<string, boolean>;
}

/** Saves an answer. The first answer counts for XP and puts the question in the review deck. */
export async function recordAnswer(
  userId: string,
  bookId: string,
  questionId: string,
  correct: boolean,
) {
  const found = questionIndex(bookId).get(questionId);
  if (!found) throw new Error("Unknown question");
  const now = new Date();
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.quizAnswers)
      .values({ userId, bookId, questionId, chapterId: found.chapterId, firstCorrect: correct })
      .onConflictDoUpdate({
        target: [
          schema.quizAnswers.userId,
          schema.quizAnswers.bookId,
          schema.quizAnswers.questionId,
        ],
        set: { attempts: sql`${schema.quizAnswers.attempts} + 1`, lastAnsweredAt: now },
      })
      .returning({ attempts: schema.quizAnswers.attempts });
    if (inserted[0]?.attempts === 1) {
      const { box, dueAt } = firstSchedule(correct, now);
      await tx
        .insert(schema.reviewCards)
        .values({ userId, bookId, questionId, box, dueAt })
        .onConflictDoNothing();
    }
  });
}

/** Records a review and moves the card to its next box. */
export async function recordReview(
  userId: string,
  bookId: string,
  questionId: string,
  correct: boolean,
) {
  if (!questionIndex(bookId).has(questionId)) throw new Error("Unknown question");
  const now = new Date();
  const where = and(
    eq(schema.reviewCards.userId, userId),
    eq(schema.reviewCards.bookId, bookId),
    eq(schema.reviewCards.questionId, questionId),
  );
  const [card] = await db.select().from(schema.reviewCards).where(where);
  if (!card) return;
  const next = scheduleReview(card.box, correct, now);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.reviewCards)
      .set({
        box: next.box,
        dueAt: next.dueAt,
        reviews: card.reviews + 1,
        lapses: card.lapses + (correct ? 0 : 1),
        lastReviewedAt: now,
      })
      .where(where);
    // Kept per review so reviews count towards the right day and week.
    await tx.insert(schema.reviewEvents).values({
      id: crypto.randomUUID(),
      userId,
      bookId,
      questionId,
      correct,
      reviewedAt: now,
    });
  });
}

/** Cards due now, oldest first. */
export async function getDueCards(userId: string, limit = 20) {
  const rows = await db
    .select({
      bookId: schema.reviewCards.bookId,
      questionId: schema.reviewCards.questionId,
      box: schema.reviewCards.box,
    })
    .from(schema.reviewCards)
    .where(and(eq(schema.reviewCards.userId, userId), sql`${schema.reviewCards.dueAt} <= now()`))
    .orderBy(schema.reviewCards.dueAt)
    .limit(limit);
  return rows.flatMap((r) => {
    const found = questionIndex(r.bookId).get(r.questionId);
    return found ? [{ ...r, question: found.question, chapterId: found.chapterId }] : [];
  });
}

export const getDueCount = cache(async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(schema.reviewCards)
    .where(and(eq(schema.reviewCards.userId, userId), sql`${schema.reviewCards.dueAt} <= now()`));
  return row?.n ?? 0;
});

/** Everything XP, levels, and badges are worked out from. */
export const getLearningStats = cache(async (userId: string): Promise<LearningStats> => {
  const [minutes, answers, reviews, chapters, streak] = await Promise.all([
    db.execute<{ m: number }>(
      sql`select coalesce(sum(active_seconds), 0) / 60.0 as m from reading_sessions where user_id = ${userId}`,
    ),
    db
      .select({
        questionId: schema.quizAnswers.questionId,
        firstCorrect: schema.quizAnswers.firstCorrect,
        bookId: schema.quizAnswers.bookId,
      })
      .from(schema.quizAnswers)
      .where(eq(schema.quizAnswers.userId, userId)),
    db.execute<{ n: number }>(
      sql`select coalesce(sum(reviews), 0)::int as n from review_cards where user_id = ${userId}`,
    ),
    db.execute<{ finished: number }>(sql`
      select count(*)::int as finished from (
        select c.book_id, c.id
        from chapters c
        left join block_reads r on r.book_id = c.book_id and r.chapter_id = c.id and r.user_id = ${userId}
        where c.number is not null
        group by c.book_id, c.id, c.block_count
        having count(r.block_id) >= 0.9 * c.block_count
      ) t
    `),
    getStreak(userId),
  ]);

  // A chapter check is perfect when every question in it was right on the first try.
  const right = new Set(
    answers.filter((a) => a.firstCorrect).map((a) => `${a.bookId}:${a.questionId}`),
  );
  let perfectChecks = 0;
  for (const [bookId, chapters] of Object.entries(QUIZZES)) {
    for (const sets of Object.values(chapters)) {
      for (const set of sets) {
        if (
          set.id.endsWith(".check") &&
          set.questions.every((q) => right.has(`${bookId}:${q.id}`))
        ) {
          perfectChecks++;
        }
      }
    }
  }

  return {
    minutesRead: Number(minutes.rows[0]?.m ?? 0),
    answered: answers.length,
    firstTryCorrect: answers.filter((a) => a.firstCorrect).length,
    reviews: Number(reviews.rows[0]?.n ?? 0),
    currentStreak: streak.current,
    bestStreak: streak.best,
    chaptersFinished: Number(chapters.rows[0]?.finished ?? 0),
    perfectChecks,
  };
});

/** When the next review card comes due, or null if the deck is empty. */
export async function getNextDue(userId: string): Promise<Date | null> {
  const rows = await db.execute<{ next: string | null }>(
    sql`select min(due_at) as next from review_cards where user_id = ${userId}`,
  );
  const next = rows.rows[0]?.next;
  return next ? new Date(next) : null;
}
