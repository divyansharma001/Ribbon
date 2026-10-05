import { describe, expect, it } from "vitest";
import {
  type DevicePosition,
  deviceLabelFromUserAgent,
  newestSpot,
  otherDeviceSpot,
  pickCurrentBlock,
  readingLine,
  readThresholdMs,
  resolveSpot,
  scrollTargetFor,
  sectionOfBlockId,
  timeAgo,
} from "./logic";

// Blocks 100px tall with 20px gaps: tops at 0, 120, 240, ...
const boxes = (scroll: number) => (i: number) => ({ top: i * 120 - scroll, height: 100 });

describe("pickCurrentBlock", () => {
  it("finds the block under the line and the offset into it", () => {
    expect(pickCurrentBlock(10, boxes(0), 150)).toEqual({ index: 1, offset: 0.3 });
  });

  it("picks the block above when the line is in a gap", () => {
    expect(pickCurrentBlock(10, boxes(0), 110)).toEqual({ index: 0, offset: 1 });
  });

  it("handles the line above the first block and an empty page", () => {
    expect(pickCurrentBlock(10, boxes(-500), 100)).toEqual({ index: 0, offset: 0 });
    expect(pickCurrentBlock(0, boxes(0), 100)).toBeNull();
  });

  it("measures only a few blocks", () => {
    let calls = 0;
    pickCurrentBlock(
      4000,
      (i) => {
        calls++;
        return boxes(250_000)(i);
      },
      160,
    );
    expect(calls).toBeLessThan(20);
  });
});

describe("scrollTargetFor and readingLine", () => {
  it("round-trips with pickCurrentBlock", () => {
    const line = readingLine(800);
    const target = scrollTargetFor(0, { top: 5000, height: 200 }, 0.4, line);
    // After scrolling to target, the block's top is at 5000 - target.
    const picked = pickCurrentBlock(1, () => ({ top: 5000 - target, height: 200 }), line);
    expect(picked?.offset).toBeCloseTo(0.4, 2);
  });

  it("keeps the line below the top bar on short screens", () => {
    expect(readingLine(800)).toBe(160);
    expect(readingLine(300)).toBe(72);
  });
});

describe("readThresholdMs", () => {
  it("scales with words and has a floor", () => {
    expect(readThresholdMs(1)).toBe(1500);
    expect(readThresholdMs(120)).toBe(10_000);
  });
});

describe("resolveSpot", () => {
  const blocks = [
    { id: "sec_a.0", hash: "aaaa0000", section: "sec_a" },
    { id: "sec_a.1", hash: "aaaa1111", section: "sec_a" },
    { id: "sec_b.0", hash: "bbbb0000", section: "sec_b" },
  ];

  it("prefers the id, then the hash, then the section", () => {
    expect(resolveSpot({ blockId: "sec_a.1", blockHash: "x" }, blocks)).toEqual({
      blockId: "sec_a.1",
      exact: true,
    });
    expect(resolveSpot({ blockId: "gone.4", blockHash: "bbbb0000" }, blocks)).toEqual({
      blockId: "sec_b.0",
      exact: true,
    });
    expect(resolveSpot({ blockId: "sec_a.9", blockHash: "x" }, blocks)).toEqual({
      blockId: "sec_a.0",
      exact: false,
    });
    expect(resolveSpot({ blockId: "nope.1", blockHash: "x" }, blocks)).toBeNull();
  });

  it("gets the section from a block id", () => {
    expect(sectionOfBlockId("sec_replication_sync_async.3")).toBe("sec_replication_sync_async");
    expect(sectionOfBlockId("plain")).toBe("plain");
  });
});

describe("otherDeviceSpot", () => {
  const pos = (deviceId: string, readAt: string, blockId = "b.1"): DevicePosition => ({
    deviceId,
    deviceLabel: deviceId,
    chapterId: "ch06",
    blockId,
    blockHash: "h",
    offset: 0,
    readAt,
  });
  const mine = pos("mac", "2026-10-05T10:00:00Z");

  it("offers the other device when it read more recently somewhere else", () => {
    const phone = pos("phone", "2026-10-05T11:00:00Z", "b.9");
    expect(otherDeviceSpot(mine, phone, "mac")).toBe(phone);
  });

  it("stays quiet when this device is newest, at the same spot, or the newest is this device", () => {
    expect(otherDeviceSpot(mine, pos("phone", "2026-10-05T09:00:00Z", "b.9"), "mac")).toBeNull();
    expect(otherDeviceSpot(mine, pos("phone", "2026-10-05T11:00:00Z"), "mac")).toBeNull();
    expect(otherDeviceSpot(mine, mine, "mac")).toBeNull();
  });

  it("offers the newest spot on a brand new device", () => {
    const phone = pos("phone", "2026-10-05T11:00:00Z");
    expect(otherDeviceSpot(null, phone, null)).toBe(phone);
  });

  it("picks the newest of several spots", () => {
    const a = pos("a", "2026-10-05T10:00:00Z");
    const b = pos("b", "2026-10-05T12:00:00Z");
    expect(newestSpot(a, null, b)).toBe(b);
  });
});

describe("labels", () => {
  it("names devices", () => {
    expect(
      deviceLabelFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("iPhone · Safari");
    expect(
      deviceLabelFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
      ),
    ).toBe("Mac · Chrome");
  });

  it("says how long ago", () => {
    const now = Date.parse("2026-10-05T12:00:00Z");
    expect(timeAgo("2026-10-05T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-05T11:55:00Z", now)).toBe("5\u00a0min ago");
    expect(timeAgo("2026-10-05T10:00:00Z", now)).toBe("2h ago");
    expect(timeAgo("2026-10-04T10:00:00Z", now)).toBe("yesterday");
  });
});
