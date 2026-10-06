/*
 * Public profile: handles, and what a profile may show. Pure functions.
 */

/** 3 to 30 characters: lowercase letters, digits, dashes, not at either end. */
export const HANDLE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Turns a name or email into a starting handle, e.g. "Divyansh Sharma" -> "divyansh-sharma". */
export function suggestHandle(from: string): string {
  const base = from
    .toLowerCase()
    .split("@")[0]
    ?.normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
  return base && HANDLE.test(base) ? base : "reader";
}

export function cleanHandle(input: string): string | null {
  const h = input.trim().toLowerCase();
  return HANDLE.test(h) ? h : null;
}

/** Escapes text for use inside SVG/XML. */
export function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** LinkedIn's "Add to profile" link for a certification-style milestone. */
export function linkedInAddUrl(m: {
  name: string;
  issuer: string;
  issued: Date;
  credentialUrl: string;
  credentialId: string;
}): string {
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: m.name,
    organizationName: m.issuer,
    issueYear: String(m.issued.getUTCFullYear()),
    issueMonth: String(m.issued.getUTCMonth() + 1),
    certUrl: m.credentialUrl,
    certId: m.credentialId,
  });
  return `https://www.linkedin.com/profile/add?${q}`;
}
