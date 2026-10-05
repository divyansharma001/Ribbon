/** Reading themes. Shared by the server (first paint) and the theme picker. */
export const THEMES = ["bright", "light", "sepia", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "bright";
export const THEME_COOKIE = "ribbon-theme";

export const THEME_LABELS: Record<Theme, string> = {
  bright: "Bright",
  light: "Light",
  sepia: "Sepia",
  dark: "Dark",
  system: "Match device",
};

export function isTheme(value: string | undefined): value is Theme {
  return THEMES.includes(value as Theme);
}
