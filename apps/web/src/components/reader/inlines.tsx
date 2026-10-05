import type { Inline } from "@ribbon/book-schema";
import type { ReactNode } from "react";

export interface RenderContext {
  bookId: string;
  chapterId: string;
  /** Cross-link target anchor -> where it lives. */
  anchors: Map<string, { chapterId: string; blockId: string }>;
}

/** Page link for a cross-reference target. Same-chapter links stay on the page. */
export function xrefHref(ctx: RenderContext, target: string): string | null {
  const place = ctx.anchors.get(target);
  if (!place) return null;
  if (place.chapterId === ctx.chapterId) return `#${place.blockId}`;
  return `/books/${ctx.bookId}/${place.chapterId}#${place.blockId}`;
}

export function noteDomId(anchor: string): string {
  return `note-${anchor}`;
}

export function Inlines({ nodes, ctx }: { nodes: readonly Inline[]; ctx: RenderContext }) {
  return <>{nodes.map((node, i) => renderInline(node, i, ctx))}</>;
}

function renderInline(node: Inline, key: number, ctx: RenderContext): ReactNode {
  switch (node.t) {
    case "text":
      return node.text;
    case "br":
      return <br key={key} />;
    case "em":
      return (
        <em key={key}>
          <Inlines nodes={node.children} ctx={ctx} />
        </em>
      );
    case "strong":
      return (
        <strong key={key} className="font-semibold">
          <Inlines nodes={node.children} ctx={ctx} />
        </strong>
      );
    case "sub":
      return (
        <sub key={key}>
          <Inlines nodes={node.children} ctx={ctx} />
        </sub>
      );
    case "sup":
      return (
        <sup key={key}>
          <Inlines nodes={node.children} ctx={ctx} />
        </sup>
      );
    case "code":
      return (
        <code key={key} className="reader-code">
          {node.text}
        </code>
      );
    case "link":
      return (
        <a
          key={key}
          href={node.href}
          target="_blank"
          rel="noopener noreferrer"
          className="reader-link"
        >
          <Inlines nodes={node.children} ctx={ctx} />
        </a>
      );
    case "xref": {
      const href = xrefHref(ctx, node.target);
      const children = <Inlines nodes={node.children} ctx={ctx} />;
      return href ? (
        <a key={key} href={href} className="reader-link">
          {children}
        </a>
      ) : (
        <span key={key}>{children}</span>
      );
    }
    case "noteref":
      return (
        <a
          key={key}
          href={`#${noteDomId(node.target)}`}
          data-noteref={node.target}
          className="reader-noteref"
          aria-label={`Reference ${node.label}${node.suffix ?? ""}`}
        >
          {node.label}
          {node.suffix}
        </a>
      );
  }
}
