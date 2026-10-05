import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_READING_MODE,
  isReadingMode,
  READING_MODE_COOKIE,
  type ReadingMode,
} from "./reading-mode";
import { DEFAULT_THEME, isTheme, THEME_COOKIE, type Theme } from "./themes";

/** The reader's theme, kept in a cookie so the first paint is already right. */
export async function getThemeCookie(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}

/** Book or scroll, from the reader's cookie. */
export async function getReadingModeCookie(): Promise<ReadingMode> {
  const value = (await cookies()).get(READING_MODE_COOKIE)?.value;
  return isReadingMode(value) ? value : DEFAULT_READING_MODE;
}
