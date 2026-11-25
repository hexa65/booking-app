import { describe, expect, it } from "vitest";
import { addDays, addMinutes, isoWeekday, isValidDate, minutesToTime, nowInTimezone, overlaps, timeToMinutes } from "./time.js";

// Cases: conversions, half-open overlap, Monday=1 / Sunday=7, month/year/leap boundaries, timezone "now".
describe("time helpers", () => {
  it("converts HH:MM to minutes and back", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(1439)).toBe("23:59");
  });
  it("rejects bad times", () => {
    expect(() => timeToMinutes("9:30")).toThrow();
    expect(() => timeToMinutes("24:00")).toThrow();
    expect(() => minutesToTime(1440)).toThrow();
  });
  it("adds minutes", () => { expect(addMinutes("10:30", 40)).toBe("11:10"); });
  it("a booking ending at 10:30 does not clash with one starting at 10:30", () => {
    expect(overlaps("10:00", "10:30", "10:30", "11:00")).toBe(false);
    expect(overlaps("10:30", "11:00", "10:00", "10:30")).toBe(false);
  });
  it("detects real overlaps", () => {
    expect(overlaps("10:00", "10:31", "10:30", "11:00")).toBe(true);
    expect(overlaps("09:00", "12:00", "10:00", "11:00")).toBe(true);
  });
  it("numbers weekdays Monday=1 to Sunday=7", () => {
    expect(isoWeekday("2026-11-23")).toBe(1); // Monday
    expect(isoWeekday("2026-11-29")).toBe(7); // Sunday
    expect(isoWeekday("2026-11-28")).toBe(6); // Saturday
  });
  it("handles month, year and leap-year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("validates dates", () => {
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
  });
  it("finds the shop's local 'now' from an instant", () => {
    const instant = new Date("2026-11-23T23:30:00Z"); // 00:30 next day in Lagos (UTC+1)
    expect(nowInTimezone("Africa/Lagos", instant)).toEqual({ date: "2026-11-24", time: "00:30" });
    expect(nowInTimezone("UTC", instant)).toEqual({ date: "2026-11-23", time: "23:30" });
  });
});

import { minutesBetween } from "./time.js";
describe("minutesBetween", () => {
  it("counts minutes on the same day", () => { expect(minutesBetween("2026-11-24", "10:00", "2026-11-24", "12:30")).toBe(150); });
  it("counts across midnight and month ends", () => {
    expect(minutesBetween("2026-11-30", "23:00", "2026-12-01", "01:00")).toBe(120);
    expect(minutesBetween("2026-12-01", "01:00", "2026-11-30", "23:00")).toBe(-120);
  });
});
