/** Reading themes. Shared by the server (first paint) and the theme picker. */
export const THEMES = ["system", "light", "sepia", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "system";
export const THEME_COOKIE = "ribbon-theme";

export const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  sepia: "Sepia",
  dark: "Dark",
  system: "Match device",
};

export function isTheme(value: string | undefined): value is Theme {
  return THEMES.includes(value as Theme);
}
