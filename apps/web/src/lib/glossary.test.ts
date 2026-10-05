import { describe, expect, it } from "vitest";
import { glossaryLookup, matchTerm } from "./glossary";

describe("glossary matching", () => {
  const lookup = glossaryLookup(["leader", "two-phase commit (2PC)", "CAP theorem", "index"]);

  it("matches a term whatever its case or spacing", () => {
    expect(matchTerm(lookup, "Leader")).toBe("leader");
    expect(matchTerm(lookup, "CAP  theorem")).toBe("CAP theorem");
  });

  it("matches plurals", () => {
    expect(matchTerm(lookup, "leaders")).toBe("leader");
    expect(matchTerm(lookup, "indexes")).toBe("index");
  });

  it("matches the full name, the name without its short form, and the short form", () => {
    expect(matchTerm(lookup, "two-phase commit (2PC)")).toBe("two-phase commit (2PC)");
    expect(matchTerm(lookup, "two-phase commit")).toBe("two-phase commit (2PC)");
    expect(matchTerm(lookup, "2PC")).toBe("two-phase commit (2PC)");
  });

  it("ignores text that only contains a term", () => {
    expect(matchTerm(lookup, "single leader replication")).toBeUndefined();
    expect(matchTerm(lookup, "")).toBeUndefined();
  });
});
