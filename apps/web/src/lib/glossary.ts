/*
 * Glossary terms in the text. The book prints a term in italics where it
 * introduces it, so only italic text is matched: "the *leader* node", not
 * every "leader" in a sentence.
 */

export type GlossaryLookup = Map<string, string>;

function clean(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Spellings that point at each term: plurals, and "2PC" for "two-phase commit (2PC)". */
export function glossaryLookup(terms: readonly string[]): GlossaryLookup {
  const lookup: GlossaryLookup = new Map();
  const add = (spelling: string, term: string) => {
    const key = clean(spelling);
    if (key && !lookup.has(key)) lookup.set(key, term);
  };
  for (const term of terms) {
    const base = term.replace(/\s*\(([^)]+)\)\s*$/, "");
    const short = term.match(/\(([^)]+)\)\s*$/)?.[1];
    for (const word of [term, base]) {
      add(word, term);
      add(`${word}s`, term);
      add(`${word}es`, term);
    }
    if (short) {
      add(short, term);
      add(`${short}s`, term);
    }
  }
  return lookup;
}

/** The glossary term this italic text names, if any. */
export function matchTerm(lookup: GlossaryLookup, text: string): string | undefined {
  return lookup.get(clean(text));
}

/** Glossary terms named in italics anywhere in these blocks. */
export function termsUsed(blocks: readonly unknown[], lookup: GlossaryLookup): Set<string> {
  const used = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!node || typeof node !== "object") return;
    const n = node as { t?: string; children?: { t?: string; text?: string }[] };
    if (n.t === "em" && n.children?.length === 1 && n.children[0]?.t === "text") {
      const term = matchTerm(lookup, n.children[0].text ?? "");
      if (term) used.add(term);
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(blocks);
  return used;
}
