"use client";

import Link from "next/link";
import { useState } from "react";
import { QuestionView } from "@/components/quiz/quiz-card";
import type { Question } from "@/guides/quizzes";
import { answerReview, finishReview } from "@/lib/learning/actions";

export interface DueCard {
  bookId: string;
  chapterId: string;
  question: Question;
}

/** Goes through today's review cards one at a time. */
export function ReviewSession({ cards }: { cards: DueCard[] }) {
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [right, setRight] = useState(0);
  const card = cards[index];

  if (!card) {
    return (
      <div className="review-card review-done">
        <p className="home-eyebrow">Review done</p>
        <h2>
          {right} of {cards.length} right
        </h2>
        <p className="home-muted">
          Right answers come back after a longer gap. Missed ones come back tomorrow.
        </p>
        <Link href="/" className="home-button" onClick={() => void finishReview()}>
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="review-card">
      <div className="review-progress" aria-hidden="true">
        <span style={{ width: `${(index / cards.length) * 100}%` }} />
      </div>
      <p className="review-count">
        Card {index + 1} of {cards.length}
      </p>
      <QuestionView
        key={card.question.id}
        question={card.question}
        sourceHref={`/books/${card.bookId}/${card.chapterId}#${card.question.source}`}
        onAnswer={(correct) => {
          setAnswered(true);
          if (correct) setRight((r) => r + 1);
          void answerReview({ bookId: card.bookId, questionId: card.question.id, correct });
        }}
      />
      {answered && (
        <button
          type="button"
          className="review-next"
          onClick={() => {
            setAnswered(false);
            setIndex(index + 1);
          }}
        >
          {index + 1 < cards.length ? "Next card" : "Finish"}
        </button>
      )}
    </div>
  );
}
