# Ribbon

A personal book reader with exact "where was I" tracking, quizzes, an AI helper, and voice.

## Layout

| Path | What |
|---|---|
| `packages/book-schema` | The book format shared by the ingest tool and the web app |
| `packages/ingest` | Turns an EPUB into the book format |
| `books/` | Your own book files. Never committed. |
| `content/` | Generated book content. Never committed, because it contains book text. |

## Ingest a book

1. Put the EPUB at the path set in `packages/ingest/src/books.ts` (for DDIA 2nd edition: `books/ddia-2e.epub`).
2. Run `pnpm install`, then `pnpm ingest ddia-2e`.
3. Read `content/ddia-2e/report.md`.
   The run fails if any error is found, for example a lost figure or a link that goes nowhere.

## Checks

```sh
pnpm test
pnpm typecheck
pnpm lint
```
