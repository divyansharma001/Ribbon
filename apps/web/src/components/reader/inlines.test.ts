import { describe, expect, it } from "vitest";
import { isKeyTerm } from "./inlines";

const terms = new Set([
  "leader-based replication",
  "followers",
  "canonical version (of data)",
  "systems of record",
  "replicas",
  "data",
]);

describe("isKeyTerm", () => {
  it("matches exact terms, plurals, and singulars", () => {
    expect(isKeyTerm("Followers", terms)).toBe(true);
    expect(isKeyTerm("replica", terms)).toBe(true);
    expect(isKeyTerm("systems of record", terms)).toBe(true);
  });

  it("matches a shorter form of a longer term", () => {
    expect(isKeyTerm("leader-based", terms)).toBe(true);
    expect(isKeyTerm("canonical", terms)).toBe(true);
  });

  it("ignores italics that are just emphasis", () => {
    expect(isKeyTerm("changes", terms)).toBe(false);
    expect(isKeyTerm("not", terms)).toBe(false);
    expect(isKeyTerm("anything at all", new Set())).toBe(false);
  });

  it("does not treat very short words as shorter forms", () => {
    expect(isKeyTerm("dat", new Set(["data warehouse"]))).toBe(false);
  });
});
