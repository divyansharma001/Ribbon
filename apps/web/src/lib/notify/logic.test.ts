import { describe, expect, it } from "vitest";
import { localClock, REMINDER_TIMES, reminderDueOn, reminderEmail, timeLabel } from "./logic";
import { isUnsubscribeToken, unsubscribeToken } from "./token";

describe("reminderDueOn", () => {
  // 13:45 UTC is 19:15 in India (UTC+5:30).
  const now = new Date("2026-10-14T13:45:00Z");

  it("is due from the reminder time, on the reader's local date", () => {
    expect(reminderDueOn("19:00", "Asia/Kolkata", now)).toBe("2026-10-14");
    expect(reminderDueOn("19:15", "Asia/Kolkata", now)).toBe("2026-10-14");
  });

  it("is not due before the reminder time", () => {
    expect(reminderDueOn("19:30", "Asia/Kolkata", now)).toBeNull();
  });

  it("stops being due three hours later, so a late setting change does not send at once", () => {
    expect(reminderDueOn("16:16", "Asia/Kolkata", now)).toBe("2026-10-14");
    expect(reminderDueOn("16:15", "Asia/Kolkata", now)).toBeNull();
    expect(reminderDueOn("09:00", "Asia/Kolkata", now)).toBeNull();
  });

  it("never carries over past midnight", () => {
    // 00:30 the next day in India.
    const late = new Date("2026-10-14T19:00:00Z");
    expect(reminderDueOn("23:00", "Asia/Kolkata", late)).toBeNull();
  });

  it("uses the reader's own date across the date line", () => {
    // 13:45 UTC on the 14th is 02:45 on the 15th in Auckland (UTC+13).
    expect(reminderDueOn("02:30", "Pacific/Auckland", now)).toBe("2026-10-15");
  });

  it("ignores a bad time", () => {
    expect(reminderDueOn("7pm", "UTC", now)).toBeNull();
  });
});

describe("localClock", () => {
  it("reads midnight as 0, not 24", () => {
    expect(localClock("UTC", new Date("2026-10-14T00:05:00Z"))).toEqual({
      date: "2026-10-14",
      minutes: 5,
    });
  });
});

describe("times", () => {
  it("offers every half hour", () => {
    expect(REMINDER_TIMES).toHaveLength(48);
    expect(REMINDER_TIMES[0]).toBe("00:00");
    expect(REMINDER_TIMES[39]).toBe("19:30");
  });

  it("labels times the way people say them", () => {
    expect(timeLabel("00:00")).toBe("12:00 AM");
    expect(timeLabel("12:30")).toBe("12:30 PM");
    expect(timeLabel("19:00")).toBe("7:00 PM");
  });
});

describe("unsubscribe tokens", () => {
  it("accepts the reader's own token only", () => {
    const token = unsubscribeToken("user-1", "secret");
    expect(isUnsubscribeToken("user-1", token, "secret")).toBe(true);
    expect(isUnsubscribeToken("user-2", token, "secret")).toBe(false);
    expect(isUnsubscribeToken("user-1", token, "other-secret")).toBe(false);
    expect(isUnsubscribeToken("user-1", "", "secret")).toBe(false);
  });
});

describe("reminderEmail", () => {
  const base = {
    firstName: "Asha",
    goalMinutes: 10,
    progress: 0,
    streak: 0,
    strictFocus: false,
    readUrl: "https://ribbon.test/",
    settingsUrl: "https://ribbon.test/settings",
    unsubscribeUrl: "https://ribbon.test/unsubscribe?u=1&t=x",
  };

  it("leads with the streak when there is one", () => {
    const email = reminderEmail({ ...base, streak: 12, progress: 4 });
    expect(email.subject).toBe("Keep your 12-day streak: 6 minutes to go");
    expect(email.text).toContain("You're 6 minutes away from today's goal.");
    expect(email.text).toContain("You've read 12 days in a row.");
  });

  it("states the goal when nothing is read yet", () => {
    const email = reminderEmail(base);
    expect(email.subject).toBe("10 minutes of reading today");
    expect(email.text).toContain("Today's goal is 10 minutes.");
  });

  it("asks for one unbroken run in strict focus mode", () => {
    expect(reminderEmail({ ...base, strictFocus: true }).text).toContain(
      "Read 10 minutes in one go",
    );
  });

  it("always carries the stop link, in text and HTML", () => {
    const email = reminderEmail(base);
    expect(email.text).toContain(`Stop these emails: ${base.unsubscribeUrl}`);
    expect(email.html).toContain("https://ribbon.test/unsubscribe?u=1&amp;t=x");
  });

  it("escapes the name in HTML", () => {
    expect(reminderEmail({ ...base, firstName: "<b>" }).html).toContain("Hi &lt;b&gt;,");
  });
});
