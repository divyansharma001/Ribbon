/**
 * Quiz questions. Written for Ribbon from the book's text (not copied from it).
 * Every question points at the paragraph it tests, so a wrong answer can
 * send the reader straight back to it.
 */

interface Base {
  /** Stable id, e.g. "ch01.q07". Answers and review cards refer to it. */
  id: string;
  prompt: string;
  /** Shown after answering, right or wrong. Plain English. */
  explain: string;
  /** Block id of the paragraph this question is about. */
  source: string;
}

export type Question =
  | (Base & { kind: "choice"; options: string[]; answer: number })
  | (Base & { kind: "truefalse"; answer: boolean })
  /** A sentence with "___" and a few words to choose from. */
  | (Base & { kind: "blank"; options: string[]; answer: number })
  /** Items listed in the correct order; shown shuffled. */
  | (Base & { kind: "order"; items: string[] })
  /** Term and meaning pairs; meanings shown shuffled. */
  | (Base & { kind: "match"; pairs: [string, string][] });

export interface QuizSet {
  id: string;
  /** Shown after this block (the last block of the section it checks). */
  afterBlockId: string;
  /** Fingerprint of that block, to catch placement drift after a re-import. */
  blockHash: string;
  title: string;
  questions: Question[];
}
