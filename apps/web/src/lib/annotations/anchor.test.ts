import { describe, expect, it } from "vitest";
import { anchorRange, describeRange } from "./anchor";

const text = "The leader writes to the log. Followers read the log and apply it.";

describe("highlight anchoring", () => {
  it("keeps the quote and some context on each side", () => {
    const r = describeRange(text, 4, 10);
    expect(r).toMatchObject({
      start: 4,
      end: 10,
      quote: "leader",
      prefix: "The ",
      suffix: " writes to the log. Followers re",
    });
  });

  it("uses the saved offsets when the text has not changed", () => {
    const saved = describeRange(text, 50, 53);
    expect(anchorRange(text, saved)).toEqual({ start: 50, end: 53 });
  });

  it("follows the quote when text before it changed", () => {
    const saved = describeRange(text, 4, 10);
    expect(anchorRange(`In short: ${text}`, saved)).toEqual({ start: 14, end: 20 });
  });

  it("picks the copy of a repeated quote whose surroundings match", () => {
    // "log" appears twice; the saved one is the second, after "read the ".
    const saved = describeRange(text, text.lastIndexOf("log"), text.lastIndexOf("log") + 3);
    const changed = text.replace("The leader", "One leader");
    const found = anchorRange(changed, saved);
    expect(found && changed.slice(found.start - 9, found.start)).toBe("read the ");
  });

  it("gives up when the quote is gone", () => {
    expect(anchorRange("Something else entirely.", describeRange(text, 4, 10))).toBeNull();
  });
});
