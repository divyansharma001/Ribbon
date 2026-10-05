import type { Block, CodeBlock } from "@ribbon/book-schema";
import { highlightCode } from "@/lib/highlight";
import { Inlines, type RenderContext } from "./inlines";

/** Draws one block. Async because code blocks are colored on the server. */
export async function BlockView({ block, ctx }: { block: Block; ctx: RenderContext }) {
  switch (block.type) {
    case "heading": {
      if (block.level === 1) {
        return (
          <header className="reader-chapter-title">
            {block.label && (
              <p className="reader-chapter-label">{block.label.replace(/\.$/, "")}</p>
            )}
            <h1 id={block.anchor}>
              <Inlines nodes={block.title} ctx={ctx} />
            </h1>
          </header>
        );
      }
      const Tag = (["h2", "h3", "h4"] as const)[block.level - 2] ?? "h4";
      return (
        <Tag id={block.anchor} className={`reader-h${block.level}`}>
          <Inlines nodes={block.title} ctx={ctx} />
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p>
          <Inlines nodes={block.content} ctx={ctx} />
        </p>
      );

    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={block.ordered ? "reader-ol" : "reader-ul"}>
          {block.items.map((item, i) => (
            <li key={item[0]?.id ?? i}>
              <Blocks blocks={item} ctx={ctx} />
            </li>
          ))}
        </Tag>
      );
    }

    case "definitions":
      return (
        <dl className="reader-dl">
          {block.items.map((item, i) => (
            // Terms have no ids of their own; position is stable for a given block.
            // biome-ignore lint/suspicious/noArrayIndexKey: static content, never reordered
            <div key={i}>
              <dt>
                <Inlines nodes={item.term} ctx={ctx} />
              </dt>
              <dd>
                <Blocks blocks={item.body} ctx={ctx} />
              </dd>
            </div>
          ))}
        </dl>
      );

    case "code":
      return <CodeView block={block} />;

    case "callouts":
      return (
        <ol className="reader-callouts">
          {block.items.map((item) => (
            <li key={item.number}>
              <span className="reader-callout-number" aria-hidden="true">
                {item.number}
              </span>
              <div>
                <Blocks blocks={item.body} ctx={ctx} />
              </div>
            </li>
          ))}
        </ol>
      );

    case "figure": {
      const file = block.image.src.split("/").at(-1);
      return (
        <figure className="reader-figure">
          {/* Plain <img>: figures need the login cookie, which next/image does not forward. */}
          {/* biome-ignore lint/performance/noImgElement: see comment above */}
          <img
            src={`/api/books/${ctx.bookId}/figures/${file}`}
            alt={block.image.alt}
            width={block.image.width}
            height={block.image.height}
            loading="lazy"
            decoding="async"
          />
          <figcaption>
            {block.label && <span className="reader-caption-label">{block.label}</span>}{" "}
            <Inlines nodes={block.caption} ctx={ctx} />
          </figcaption>
        </figure>
      );
    }

    case "table":
      return (
        <figure className="reader-table">
          <figcaption>
            {block.label && <span className="reader-caption-label">{block.label}</span>}{" "}
            <Inlines nodes={block.caption} ctx={ctx} />
          </figcaption>
          <div className="reader-table-scroll">
            <table>
              {block.head.length > 0 && (
                <thead>
                  {block.head.map((row, r) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static table rows
                    <tr key={r}>
                      {row.map((cell, c) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: static table cells
                        <th key={c} scope="col">
                          <Inlines nodes={cell} ctx={ctx} />
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
              )}
              <tbody>
                {block.body.map((row, r) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static table rows
                  <tr key={r}>
                    {row.map((cell, c) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: static table cells
                      <td key={c}>
                        <Inlines nodes={cell} ctx={ctx} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );

    case "example":
      return (
        <figure className="reader-example">
          <figcaption>
            {block.label && <span className="reader-caption-label">{block.label}</span>}{" "}
            <Inlines nodes={block.caption} ctx={ctx} />
          </figcaption>
          <Blocks blocks={block.body} ctx={ctx} />
        </figure>
      );

    case "note":
      return (
        <aside className="reader-note" data-kind={block.kind}>
          <p className="reader-note-label">
            {block.kind === "warning" ? "Warning" : block.kind === "tip" ? "Tip" : "Note"}
          </p>
          <Blocks blocks={block.body} ctx={ctx} />
        </aside>
      );

    case "sidebar":
      return (
        <aside className="reader-sidebar" id={block.anchor}>
          <p className="reader-sidebar-title">
            <Inlines nodes={block.title} ctx={ctx} />
          </p>
          <Blocks blocks={block.body} ctx={ctx} />
        </aside>
      );

    case "quote":
      return (
        <blockquote className={block.kind === "epigraph" ? "reader-epigraph" : "reader-quote"}>
          <Blocks blocks={block.body} ctx={ctx} />
          {block.attribution && (
            <footer>
              <Inlines nodes={block.attribution} ctx={ctx} />
            </footer>
          )}
        </blockquote>
      );
  }
}

/** Draws nested blocks (inside lists, notes, sidebars, ...). */
export function Blocks({ blocks, ctx }: { blocks: readonly Block[]; ctx: RenderContext }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} ctx={ctx} />
      ))}
    </>
  );
}

async function CodeView({ block }: { block: CodeBlock }) {
  const lines = await highlightCode(block.code, block.language);
  const callouts = new Map<number, number[]>();
  for (const c of block.callouts ?? [])
    callouts.set(c.line, [...(callouts.get(c.line) ?? []), c.number]);

  return (
    <div className="reader-pre-wrap">
      {block.language && <span className="reader-pre-lang">{block.language}</span>}
      <pre className="reader-pre">
        <code>
          {lines.map((tokens, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: code lines never reorder
            <span key={i} className="reader-line">
              {/* A space keeps empty lines from collapsing. */}
              {tokens.every((t) => t.content === "") && " "}
              {tokens.map((t, j) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: tokens never reorder
                  key={j}
                  style={
                    t.color || t.dark
                      ? ({ "--c": t.color, "--cd": t.dark } as React.CSSProperties)
                      : undefined
                  }
                  className={
                    [t.color || t.dark ? "tok" : "", t.fontStyle === 1 ? "italic" : ""]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  {t.content}
                </span>
              ))}
              {callouts.get(i)?.map((n) => (
                <span
                  key={n}
                  role="img"
                  className="reader-callout-number reader-callout-inline"
                  aria-label={`Note ${n}`}
                >
                  {n}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
