import { describe, expect, it } from "vitest";
import { cleanHandle, linkedInAddUrl, suggestHandle, xml } from "./logic";

describe("public profile", () => {
  it("suggests a handle from a name or email", () => {
    expect(suggestHandle("Divyansh Sharma")).toBe("divyansh-sharma");
    expect(suggestHandle("reader.one@example.com")).toBe("reader-one");
    expect(suggestHandle("É")).toBe("reader");
  });

  it("accepts only clean handles", () => {
    expect(cleanHandle("  My-Name ")).toBe("my-name");
    expect(cleanHandle("ab")).toBeNull();
    expect(cleanHandle("-dash")).toBeNull();
    expect(cleanHandle("has space")).toBeNull();
    expect(cleanHandle("a".repeat(31))).toBeNull();
  });

  it("escapes text for SVG", () => {
    expect(xml(`<b>"Tom" & 'Jerry'</b>`)).toBe(
      "&lt;b&gt;&quot;Tom&quot; &amp; &apos;Jerry&apos;&lt;/b&gt;",
    );
  });

  it("builds LinkedIn's add-certification link", () => {
    const url = new URL(
      linkedInAddUrl({
        name: "Read: Designing Data-Intensive Applications",
        issuer: "Ribbon",
        issued: new Date(Date.UTC(2026, 9, 6)),
        credentialUrl: "https://ribbon.example/u/me/badge/book",
        credentialId: "me-book",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      startTask: "CERTIFICATION_NAME",
      name: "Read: Designing Data-Intensive Applications",
      organizationName: "Ribbon",
      issueYear: "2026",
      issueMonth: "10",
      certUrl: "https://ribbon.example/u/me/badge/book",
      certId: "me-book",
    });
  });
});
