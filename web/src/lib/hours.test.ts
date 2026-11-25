import { describe, expect, it } from "vitest";
import { validateIntervals } from "./hours";

describe("validateIntervals", () => {
  it("accepts a day with a lunch break", () => {
    expect(validateIntervals([{ weekday: 1, startTime: "09:00", endTime: "13:00" }, { weekday: 1, startTime: "14:00", endTime: "19:00" }])).toBeNull();
  });
  it("accepts touching intervals", () => {
    expect(validateIntervals([{ weekday: 1, startTime: "09:00", endTime: "13:00" }, { weekday: 1, startTime: "13:00", endTime: "19:00" }])).toBeNull();
  });
  it("rejects end before start", () => { expect(validateIntervals([{ weekday: 1, startTime: "10:00", endTime: "09:00" }])).not.toBeNull(); });
  it("rejects overlaps on the same day only", () => {
    expect(validateIntervals([{ weekday: 1, startTime: "09:00", endTime: "13:00" }, { weekday: 1, startTime: "12:00", endTime: "14:00" }])).not.toBeNull();
    expect(validateIntervals([{ weekday: 1, startTime: "09:00", endTime: "13:00" }, { weekday: 2, startTime: "12:00", endTime: "14:00" }])).toBeNull();
  });
  it("rejects bad weekdays and times", () => {
    expect(validateIntervals([{ weekday: 0, startTime: "09:00", endTime: "10:00" }])).not.toBeNull();
    expect(validateIntervals([{ weekday: 8, startTime: "09:00", endTime: "10:00" }])).not.toBeNull();
    expect(validateIntervals([{ weekday: 1, startTime: "9am", endTime: "10:00" }])).not.toBeNull();
  });
  it("accepts an empty week (a day off)", () => { expect(validateIntervals([])).toBeNull(); });
});
