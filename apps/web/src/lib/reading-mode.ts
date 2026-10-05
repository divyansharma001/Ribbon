/** How a chapter is shown: as a book with pages, or as one long scroll. */
export const READING_MODES = ["book", "scroll"] as const;
export type ReadingMode = (typeof READING_MODES)[number];
export const DEFAULT_READING_MODE: ReadingMode = "book";
export const READING_MODE_COOKIE = "ribbon-mode";

export function isReadingMode(value: string | undefined): value is ReadingMode {
  return READING_MODES.includes(value as ReadingMode);
}
