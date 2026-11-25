import { describe, expect, it } from "vitest";
import { reminderMessage, whatsAppLink } from "./whatsapp";
import { formatClock, formatDateLong, formatDayShort, formatDuration, ordinal } from "./format";

describe("whatsapp", () => {
  it("builds a wa.me link with digits only and encoded text", () => {
    const link = whatsAppLink("+234 801 234 5678", "Hi & welcome\nSee you");
    expect(link).toBe("https://wa.me/2348012345678?text=Hi%20%26%20welcome%0ASee%20you");
  });
  it("writes a friendly reminder", () => {
    const m = reminderMessage({ customerName: "Emeka Okafor", businessName: "Crown Cuts", serviceName: "Haircut", date: "2026-11-24", startTime: "14:00", manageUrl: "https://x.test/booking/abc" });
    expect(m).toContain("Hello Emeka");
    expect(m).toContain("Tuesday 24 November at 2:00 pm");
    expect(m).toContain("https://x.test/booking/abc");
  });
  it("leaves out the link when there is none", () => {
    expect(reminderMessage({ customerName: "A", businessName: "B", serviceName: "C", date: "2026-11-24", startTime: "09:00" })).not.toContain("http");
  });
});
describe("format", () => {
  it("formats times", () => {
    expect(formatClock("00:05")).toBe("12:05 am");
    expect(formatClock("12:00")).toBe("12:00 pm");
    expect(formatClock("17:30")).toBe("5:30 pm");
  });
  it("formats dates without time-zone drift", () => {
    expect(formatDateLong("2026-11-29")).toBe("Sunday 29 November");
    expect(formatDayShort("2026-11-23")).toBe("Mon 23 Nov");
    expect(formatDateLong("2028-02-29")).toBe("Tuesday 29 February");
  });
  it("makes ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st"]);
  });
  it("formats durations", () => { expect(formatDuration(40)).toBe("40 min"); expect(formatDuration(60)).toBe("1 hr"); expect(formatDuration(90)).toBe("1 hr 30 min"); });
});
