import "server-only";
import { cookies } from "next/headers";

export const THEMES = ["system", "light", "sepia", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "ribbon-theme";

function isTheme(value: string | undefined): value is Theme {
  return THEMES.includes(value as Theme);
}

/** The reader's theme, kept in a cookie so the first paint is already right. */
export async function getThemeCookie(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : "system";
}
