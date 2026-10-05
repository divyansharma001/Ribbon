import { CH01 } from "./ddia-2e-ch01";
import type { Question, QuizSet } from "./types";

export type { Question, QuizSet } from "./types";

/** Quiz sets per book and chapter. */
export const QUIZZES: Record<string, Record<string, QuizSet[]>> = {
  "ddia-2e": { ch01: CH01 },
};

export function quizzesFor(bookId: string, chapterId: string): QuizSet[] {
  return QUIZZES[bookId]?.[chapterId] ?? [];
}

/** Every question of a book, by id, with the chapter it belongs to. */
export function questionIndex(
  bookId: string,
): Map<string, { question: Question; chapterId: string; setId: string }> {
  const out = new Map<string, { question: Question; chapterId: string; setId: string }>();
  for (const [chapterId, sets] of Object.entries(QUIZZES[bookId] ?? {})) {
    for (const set of sets)
      for (const q of set.questions) out.set(q.id, { question: q, chapterId, setId: set.id });
  }
  return out;
}
