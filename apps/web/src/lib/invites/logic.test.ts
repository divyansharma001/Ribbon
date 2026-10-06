import { describe, expect, it } from "vitest";
import { FRIEND_INVITES, inviteStatus, invitesLeft, readCookie } from "./logic";

const now = new Date("2026-10-06T12:00:00Z");
const later = new Date("2026-10-10T00:00:00Z");
const earlier = new Date("2026-10-01T00:00:00Z");

describe("invites", () => {
  it("knows each invite's status", () => {
    expect(inviteStatus({ expiresAt: later, usedBy: null, revokedAt: null }, now)).toBe("pending");
    expect(inviteStatus({ expiresAt: earlier, usedBy: null, revokedAt: null }, now)).toBe(
      "expired",
    );
    expect(inviteStatus({ expiresAt: later, usedBy: null, revokedAt: earlier }, now)).toBe(
      "revoked",
    );
    // Used wins: the friend joined, whatever happened after.
    expect(inviteStatus({ expiresAt: earlier, usedBy: "u2", revokedAt: null }, now)).toBe("used");
  });

  it("gives friends 3 invites, gives cancelled and expired ones back, and the owner no limit", () => {
    const pending = { expiresAt: later, usedBy: null, revokedAt: null };
    const used = { expiresAt: later, usedBy: "u2", revokedAt: null };
    const cancelled = { expiresAt: later, usedBy: null, revokedAt: earlier };
    const expired = { expiresAt: earlier, usedBy: null, revokedAt: null };
    expect(invitesLeft(false, [], now)).toBe(FRIEND_INVITES);
    expect(invitesLeft(false, [pending, used, cancelled, expired], now)).toBe(1);
    expect(invitesLeft(false, [pending, used, used, used], now)).toBe(0);
    expect(invitesLeft(true, [pending, used, used, used], now)).toBeNull();
  });

  it("reads a cookie from a header", () => {
    expect(readCookie("a=1; ribbon-invite=abc%2Dx; b=2", "ribbon-invite")).toBe("abc-x");
    expect(readCookie("a=1", "ribbon-invite")).toBeNull();
    expect(readCookie(null, "ribbon-invite")).toBeNull();
  });
});
