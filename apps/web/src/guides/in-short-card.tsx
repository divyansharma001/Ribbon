import type { InShort } from "./in-short";

/** A plain-English summary card at the start of a section. */
export function InShortCard({ summary }: { summary: InShort }) {
  return (
    <aside className="in-short" aria-label="In short">
      <p className="in-short-label">In short</p>
      <p className="in-short-text">{summary.text}</p>
      {summary.terms.length > 0 && (
        <ul className="in-short-terms" aria-label="Key terms">
          {summary.terms.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
