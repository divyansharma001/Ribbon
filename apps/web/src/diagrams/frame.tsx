"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./diagrams.css";

/** The card every Ribbon diagram sits in: label, title, picture, controls, narration. */
export function DiagramFrame({
  title,
  children,
  controls,
  narration,
  caption,
  live = true,
}: {
  title: string;
  /** Announce narration changes to screen readers. Off for diagrams that loop on their own. */
  live?: boolean;
  children: ReactNode;
  controls?: ReactNode;
  /** What is happening right now, in plain words. Read out by screen readers. */
  narration?: ReactNode;
  /** One line under the diagram: the idea it shows. */
  caption?: ReactNode;
}) {
  return (
    <figure className="diagram" aria-label={`Diagram: ${title}`}>
      <div className="diagram-head">
        <span className="diagram-badge">Ribbon diagram</span>
        <p className="diagram-title">{title}</p>
      </div>
      <div className="diagram-stage">{children}</div>
      {(controls || narration) && (
        <div className="diagram-foot">
          {narration !== undefined && (
            <p className="diagram-narration" aria-live={live ? "polite" : "off"}>
              {narration}
            </p>
          )}
          {controls && <div className="diagram-controls">{controls}</div>}
        </div>
      )}
      {caption && <figcaption className="diagram-caption">{caption}</figcaption>}
    </figure>
  );
}

export function DiagramButton({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      aria-pressed={active}
      className={`diagram-button ${active ? "is-active" : ""} ${className ?? ""}`}
    />
  );
}
