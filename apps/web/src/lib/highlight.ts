import "server-only";
import { type BundledLanguage, bundledLanguages, codeToTokens } from "shiki";

export interface CodeToken {
  content: string;
  /** Light theme color, dark theme color. */
  color?: string;
  dark?: string;
  fontStyle?: number;
}

/** Book language names that Shiki knows by another name. */
const ALIASES: Record<string, string> = { protobuf: "proto" };

function toLanguage(language: string | undefined): BundledLanguage | null {
  if (!language) return null;
  const name = ALIASES[language] ?? language;
  return name in bundledLanguages ? (name as BundledLanguage) : null;
}

/**
 * Splits code into colored tokens per line, with colors for both light and
 * dark themes. Unknown languages come back as plain text.
 */
export async function highlightCode(code: string, language?: string): Promise<CodeToken[][]> {
  const lang = toLanguage(language);
  if (!lang) return code.split("\n").map((line) => [{ content: line }]);
  const { tokens } = await codeToTokens(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
  return tokens.map((line) =>
    line.map((t) => {
      const token: CodeToken = { content: t.content };
      const light = t.htmlStyle?.["--shiki-light"];
      const dark = t.htmlStyle?.["--shiki-dark"];
      if (light) token.color = light;
      if (dark) token.dark = dark;
      if (t.fontStyle) token.fontStyle = t.fontStyle;
      return token;
    }),
  );
}
