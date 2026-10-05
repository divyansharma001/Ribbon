/** Books we know how to ingest. Source files live in /books and are never committed. */
export interface BookConfig {
  id: string;
  /** Path relative to the repo root. */
  source: string;
  edition: number;
  /** The EPUB's own identifier can be wrong (DDIA 2e reuses the 1st edition ISBN). */
  isbn: string;
  published: string;
}

export const BOOKS: Record<string, BookConfig> = {
  "ddia-2e": {
    id: "ddia-2e",
    source: "books/ddia-2e.epub",
    edition: 2,
    isbn: "9781098119058",
    published: "2026-02",
  },
};
