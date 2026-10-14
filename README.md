# Ribbon

A personal book reader with exact "where was I" tracking, quizzes, an AI helper, and voice.

## Layout

| Path | What |
|---|---|
| `apps/web` | The Next.js web app |
| `packages/book-schema` | The book format shared by the ingest tool and the web app |
| `packages/ingest` | Turns an EPUB into the book format |
| `books/` | Your own book files. Never committed. |
| `content/` | Generated book content. Never committed, because it contains book text. |

## Ingest a book

1. Put the EPUB at the path set in `packages/ingest/src/books.ts` (for DDIA 2nd edition: `books/ddia-2e.epub`).
2. Run `pnpm install`, then `pnpm ingest ddia-2e`.
3. Read `content/ddia-2e/report.md`.
   The run fails if any error is found, for example a lost figure or a link that goes nowhere.

## Run the web app

1. Copy `.env.example` to `.env` and fill it in.
2. Link it for Next.js, which only reads `.env` from the app folder: `ln -s ../../.env apps/web/.env`.
3. Start Postgres and set it up: `pnpm db:up && pnpm db:migrate && pnpm load`.
4. Run `pnpm dev` and open http://localhost:3210.

## Reminder emails

Readers pick a reminder time in Settings.
`/api/cron/reminders` emails everyone whose time has come and who hasn't met today's goal, at most once a day.
It needs `RESEND_API_KEY`, `EMAIL_FROM`, and `CRON_SECRET` (see `.env.example`).
A GitHub Actions workflow (`.github/workflows/reminders.yml`) calls it every 15 minutes, because Vercel's free plan only runs cron jobs once a day.
The workflow needs two repository secrets: `RIBBON_URL` (the site's address) and `CRON_SECRET`.
Without the email settings the app runs normally, sends nothing, and Settings says email isn't set up.

To try it locally: turn a reminder on for a time in the last three hours, then run
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3210/api/cron/reminders`.

## Checks

```sh
pnpm test        # unit tests (needs the local Postgres for db tests: pnpm db:up)
pnpm e2e         # browser tests against a production build and the test database
pnpm typecheck
pnpm lint
```
