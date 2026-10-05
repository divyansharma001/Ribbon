"use client";

import { useMemo, useState } from "react";
import type { Question, QuizSet } from "@/guides/quizzes";
import { answerQuestion } from "@/lib/learning/actions";

/** Same shuffle on the server and in the browser, so the page doesn't jump. */
function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  // Never show an "order" list already in the right order.
  if (out.every((v, i) => v === items[i]) && out.length > 1) out.push(out.shift() as T);
  return out;
}

export interface AnswerResult {
  correct: boolean;
}

/**
 * One question with its answer controls and feedback. Calls `onAnswer` once,
 * when the reader commits an answer.
 */
export function QuestionView({
  question,
  onAnswer,
  sourceHref,
}: {
  question: Question;
  onAnswer: (correct: boolean) => void;
  sourceHref: string;
}) {
  const [result, setResult] = useState<{ correct: boolean } | null>(null);
  const [picked, setPicked] = useState<number | boolean | null>(null);

  const commit = (correct: boolean) => {
    if (result) return;
    setResult({ correct });
    onAnswer(correct);
  };

  return (
    <div
      className="quiz-question"
      data-result={result ? (result.correct ? "right" : "wrong") : "open"}
    >
      <p className="quiz-prompt">
        {question.kind === "blank" ? (
          <BlankPrompt
            prompt={question.prompt}
            fill={result ? question.options[question.answer] : undefined}
          />
        ) : question.kind === "truefalse" ? (
          <>
            <span className="quiz-tf-label">True or false?</span> {question.prompt}
          </>
        ) : (
          question.prompt
        )}
      </p>

      {(question.kind === "choice" || question.kind === "blank") && (
        <div className={question.kind === "blank" ? "quiz-chips" : "quiz-options"}>
          {question.options.map((option, i) => {
            const state = !result
              ? ""
              : i === question.answer
                ? "is-right"
                : i === picked
                  ? "is-wrong"
                  : "is-dim";
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: options are fixed for a question
                key={i}
                type="button"
                disabled={!!result}
                className={`quiz-option ${state}`}
                onClick={() => {
                  setPicked(i);
                  commit(i === question.answer);
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}

      {question.kind === "truefalse" && (
        <div className="quiz-chips">
          {[true, false].map((v) => {
            const state = !result
              ? ""
              : v === question.answer
                ? "is-right"
                : v === picked
                  ? "is-wrong"
                  : "is-dim";
            return (
              <button
                key={String(v)}
                type="button"
                disabled={!!result}
                className={`quiz-option quiz-tf ${state}`}
                onClick={() => {
                  setPicked(v);
                  commit(v === question.answer);
                }}
              >
                {v ? "True" : "False"}
              </button>
            );
          })}
        </div>
      )}

      {question.kind === "order" && (
        <OrderQuestion question={question} done={!!result} onCheck={commit} />
      )}
      {question.kind === "match" && (
        <MatchQuestion question={question} done={!!result} onCheck={commit} />
      )}

      {result && (
        <div className="quiz-feedback" role="status">
          <p className="quiz-verdict">{result.correct ? "Right." : "Not quite."}</p>
          <p className="quiz-explain">{question.explain}</p>
          <a href={sourceHref} className="quiz-source">
            Read this part again
          </a>
        </div>
      )}
    </div>
  );
}

function BlankPrompt({ prompt, fill }: { prompt: string; fill: string | undefined }) {
  const [before, after] = prompt.split("___");
  return (
    <>
      {before}
      <span className={`quiz-blank ${fill ? "is-filled" : ""}`}>{fill ?? "   "}</span>
      {after}
    </>
  );
}

function OrderQuestion({
  question,
  done,
  onCheck,
}: {
  question: Extract<Question, { kind: "order" }>;
  done: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const shuffled = useMemo(() => seededShuffle(question.items, question.id), [question]);
  const [chosen, setChosen] = useState<string[]>([]);
  const remaining = shuffled.filter((i) => !chosen.includes(i));
  const correct = chosen.every((item, i) => item === question.items[i]);

  return (
    <div className="quiz-order">
      <ol className="quiz-order-chosen" aria-label="Your order">
        {chosen.map((item, i) => {
          const state = done ? (item === question.items[i] ? "is-right" : "is-wrong") : "";
          return (
            <li key={item}>
              <button
                type="button"
                disabled={done}
                className={`quiz-option ${state}`}
                onClick={() => setChosen(chosen.filter((c) => c !== item))}
                aria-label={`${i + 1}. ${item} (tap to remove)`}
              >
                <span className="quiz-num">{i + 1}</span>
                {item}
              </button>
            </li>
          );
        })}
      </ol>
      {!done && remaining.length > 0 && (
        <div className="quiz-options">
          <p className="quiz-hint">Tap the steps in order.</p>
          {remaining.map((item) => (
            <button
              key={item}
              type="button"
              className="quiz-option"
              onClick={() => setChosen([...chosen, item])}
            >
              {item}
            </button>
          ))}
        </div>
      )}
      {done && !correct && (
        <ol className="quiz-correct-list">
          {question.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      )}
      {!done && remaining.length === 0 && (
        <button type="button" className="quiz-check" onClick={() => onCheck(correct)}>
          Check
        </button>
      )}
    </div>
  );
}

function MatchQuestion({
  question,
  done,
  onCheck,
}: {
  question: Extract<Question, { kind: "match" }>;
  done: boolean;
  onCheck: (correct: boolean) => void;
}) {
  const meanings = useMemo(
    () =>
      seededShuffle(
        question.pairs.map((p) => p[1]),
        question.id,
      ),
    [question],
  );
  const [term, setTerm] = useState<string | null>(null);
  /** term -> meaning chosen by the reader */
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const used = new Set(Object.values(pairs));
  const allPaired = Object.keys(pairs).length === question.pairs.length;
  const right = (t: string) => question.pairs.find((p) => p[0] === t)?.[1];
  const correct = question.pairs.every(([t, m]) => pairs[t] === m);
  const number = (t: string) => question.pairs.findIndex((p) => p[0] === t) + 1;

  return (
    <div className="quiz-match">
      <div className="quiz-match-col">
        {question.pairs.map(([t]) => {
          const paired = pairs[t];
          const state = done
            ? paired === right(t)
              ? "is-right"
              : "is-wrong"
            : term === t
              ? "is-picked"
              : "";
          return (
            <button
              key={t}
              type="button"
              disabled={done}
              className={`quiz-option ${state} ${paired ? "is-paired" : ""}`}
              onClick={() => {
                if (paired) {
                  const next = { ...pairs };
                  delete next[t];
                  setPairs(next);
                }
                setTerm(term === t ? null : t);
              }}
            >
              {paired && <span className="quiz-num">{number(t)}</span>}
              {t}
            </button>
          );
        })}
      </div>
      <div className="quiz-match-col">
        {meanings.map((m) => {
          const owner = Object.keys(pairs).find((t) => pairs[t] === m);
          return (
            <button
              key={m}
              type="button"
              disabled={done || (!term && !owner) || (used.has(m) && !owner)}
              className={`quiz-option quiz-meaning ${owner ? "is-paired" : ""}`}
              onClick={() => {
                if (!term) return;
                const next = Object.fromEntries(Object.entries(pairs).filter(([, v]) => v !== m));
                next[term] = m;
                setPairs(next);
                setTerm(null);
              }}
            >
              {owner && <span className="quiz-num">{number(owner)}</span>}
              {m}
            </button>
          );
        })}
      </div>
      {!done && (
        <p className="quiz-hint">
          {term ? `Now tap the meaning of “${term}”.` : "Tap a term, then its meaning."}
        </p>
      )}
      {done && !correct && (
        <ul className="quiz-correct-list">
          {question.pairs.map(([t, m]) => (
            <li key={t}>
              <strong>{t}</strong>: {m}
            </li>
          ))}
        </ul>
      )}
      {!done && allPaired && (
        <button type="button" className="quiz-check" onClick={() => onCheck(correct)}>
          Check
        </button>
      )}
    </div>
  );
}

/**
 * A "Quick check" at the end of a section. In book mode the page will not turn
 * past it until every question is answered (see BookView).
 */
export function QuizCard({
  set,
  bookId,
  answered,
}: {
  set: QuizSet;
  bookId: string;
  /** Question id -> right on the first try, for questions answered before. */
  answered: Record<string, boolean>;
}) {
  const [results, setResults] = useState<Record<string, boolean>>(answered);
  const [index, setIndex] = useState(() => {
    const i = set.questions.findIndex((q) => !(q.id in answered));
    return i === -1 ? set.questions.length : i;
  });
  const [justAnswered, setJustAnswered] = useState(false);
  const done = set.questions.every((q) => q.id in results);
  const question = set.questions[index];
  const rightCount = set.questions.filter((q) => results[q.id]).length;
  const isCheck = set.id.endsWith(".check");

  return (
    <section
      className="quiz-card"
      data-quiz-state={done ? "done" : "open"}
      aria-label={isCheck ? "Chapter check" : "Quick check"}
    >
      <header className="quiz-head">
        <span className="quiz-badge">{isCheck ? "Chapter check" : "Quick check"}</span>
        <span className="quiz-title">{set.title}</span>
        <span className="quiz-count">
          {Math.min(index + 1, set.questions.length)}/{set.questions.length}
        </span>
      </header>

      {question && index < set.questions.length && (
        <>
          <QuestionView
            key={question.id}
            question={question}
            sourceHref={`#${question.source}`}
            onAnswer={(correct) => {
              setResults((r) => ({ ...r, [question.id]: correct }));
              setJustAnswered(true);
              void answerQuestion({ bookId, questionId: question.id, correct });
            }}
          />
          {justAnswered && (
            <button
              type="button"
              className="quiz-next"
              onClick={() => {
                setJustAnswered(false);
                setIndex(index + 1);
              }}
            >
              {index + 1 < set.questions.length ? "Next question" : "Finish"}
            </button>
          )}
        </>
      )}

      {index >= set.questions.length && (
        <div className="quiz-done">
          <p>
            <strong>
              {rightCount} of {set.questions.length}
            </strong>{" "}
            right on the first try.{" "}
            {rightCount < set.questions.length
              ? "The ones you missed will come back in your review deck."
              : "All of these will come back later to keep them fresh."}
          </p>
        </div>
      )}
      {!done && <p className="quiz-gate">Answer to keep reading</p>}
    </section>
  );
}
