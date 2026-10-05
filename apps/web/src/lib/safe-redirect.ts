/** Only allow same-site paths like "/books/x", never "//evil.com" or full URLs. */
export function safeNextPath(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
