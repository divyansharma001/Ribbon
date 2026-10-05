"use server";

import { refresh } from "next/cache";
import { requireUser } from "../session";
import { recordAnswer, recordReview } from "./data";

/** Saves a quiz answer from the reader. */
export async function answerQuestion(input: {
  bookId: string;
  questionId: string;
  correct: boolean;
}) {
  const user = await requireUser();
  await recordAnswer(
    user.id,
    String(input.bookId),
    String(input.questionId),
    Boolean(input.correct),
  );
}

/** Saves a review answer and schedules the card's next showing. */
export async function answerReview(input: {
  bookId: string;
  questionId: string;
  correct: boolean;
}) {
  const user = await requireUser();
  await recordReview(
    user.id,
    String(input.bookId),
    String(input.questionId),
    Boolean(input.correct),
  );
}

/** Refreshes the page data (used when a review session ends). */
export async function finishReview() {
  await requireUser();
  refresh();
}
