import { describe, expect, it } from "vitest";
import { computeSlots } from "./slots.js";
import type { SlotInput, StaffDay } from "./slots.js";

// Cases covered (plain words):
//  1 open day lists every step            2 service longer than the gap          3 booking ending exactly where next starts
//  4 lunch break                          5 day off (time off)                   6 staff who does not offer the service
//  7 past times today                     8 lead time                            9 slot that would end after closing
// 10 two staff, different hours          11 anyone available (once, least busy) 12 cancelled booking frees time
// 13 closed weekday                      14 past date                           15 buffer after bookings
// 16 specific staff only                 17 time off range edges                18 step of 30
// 19 completed/no_show still block       20 interval not aligned to the step    21 unknown staff id
// 22 tie goes to the lowest id           23 service exactly fills the day       24 future date ignores "now" time
// 25 no staff at all                     26 two intervals on one day            27 duration equal to gap

const MON = "2026-11-23";
const SUN = "2026-11-29";
const hours = (staffId: number, weekdays: number[], start = "09:00", end = "19:00") =>
  weekdays.map((weekday, i) => ({ id: staffId * 100 + i, staffId, weekday, startTime: start, endTime: end }));

function staff(over: Partial<StaffDay> & { staffId: number }): StaffDay {
  return { serviceIds: [1], hours: hours(over.staffId, [1, 2, 3, 4, 5, 6]), timeOff: [], bookings: [], ...over };
}
function input(over: Partial<SlotInput> & { staff: StaffDay[] }): SlotInput {
  return {
    date: MON, now: { date: "2026-11-20", time: "08:00" }, serviceId: 1, durationMinutes: 40,
    stepMinutes: 15, leadMinutes: 0, bufferMinutes: 0, staffId: null, ...over,
  };
}
const times = (r: { startTime: string }[]) => r.map((s) => s.startTime);
const book = (startTime: string, endTime: string, status: "confirmed" | "cancelled" | "completed" | "no_show" = "confirmed") => ({ startTime, endTime, status });

describe("computeSlots", () => {
  it("1 lists every step of an open day that still fits the service", () => {
    const r = computeSlots(input({ staff: [staff({ staffId: 1 })] }));
    expect(r[0]).toEqual({ startTime: "09:00", staffId: 1 });
    expect(times(r)[times(r).length - 1]).toBe("18:15"); // 18:15 + 40 = 18:55
    expect(r).toHaveLength(((18 * 60 + 15) - 9 * 60) / 15 + 1);
  });
  it("2 hides slots when the service is longer than the gap", () => {
    const r = computeSlots(input({ staff: [staff({ staffId: 1, bookings: [book("09:00", "10:00"), book("10:30", "19:00")] })] }));
    expect(r).toHaveLength(0);
  });
  it("3 allows a slot that starts exactly when a booking ends, and one that ends exactly when the next starts", () => {
    const r = computeSlots(input({ durationMinutes: 30, staff: [staff({ staffId: 1, bookings: [book("09:00", "10:00"), book("11:00", "19:00")] })] }));
    expect(times(r)).toEqual(["10:00", "10:15", "10:30"]);
  });
  it("4 respects a lunch break (two intervals)", () => {
    const h = [
      { id: 1, staffId: 1, weekday: 1, startTime: "09:00", endTime: "13:00" },
      { id: 2, staffId: 1, weekday: 1, startTime: "14:00", endTime: "19:00" },
    ];
    const r = computeSlots(input({ staff: [staff({ staffId: 1, hours: h })] }));
    expect(times(r)).not.toContain("12:30"); // 12:30 + 40 crosses 13:00
    expect(times(r)).toContain("12:15");
    expect(times(r)).not.toContain("13:15");
    expect(times(r)).toContain("14:00");
  });
  it("5 returns nothing on a day off", () => {
    const r = computeSlots(input({ staff: [staff({ staffId: 1, timeOff: [{ id: 1, staffId: 1, dateFrom: MON, dateTo: MON, reason: "" }] })] }));
    expect(r).toHaveLength(0);
  });
  it("6 skips staff who do not offer the service", () => {
    const r = computeSlots(input({ serviceId: 5, staff: [staff({ staffId: 1, serviceIds: [1, 2] }), staff({ staffId: 2, serviceIds: [5] })] }));
    expect(new Set(r.map((s) => s.staffId))).toEqual(new Set([2]));
  });
  it("7 hides times already past today", () => {
    const r = computeSlots(input({ date: MON, now: { date: MON, time: "10:07" }, staff: [staff({ staffId: 1 })] }));
    expect(times(r)[0]).toBe("10:15");
  });
  it("8 applies the lead time", () => {
    const r = computeSlots(input({ date: MON, now: { date: MON, time: "10:00" }, leadMinutes: 30, staff: [staff({ staffId: 1 })] }));
    expect(times(r)[0]).toBe("10:30");
  });
  it("9 never offers a slot that would end after closing", () => {
    const r = computeSlots(input({ durationMinutes: 90, staff: [staff({ staffId: 1 })] }));
    expect(times(r)[times(r).length - 1]).toBe("17:30");
  });
  it("10 handles two staff with different hours", () => {
    const a = staff({ staffId: 1, hours: hours(1, [1], "09:00", "11:00") });
    const b = staff({ staffId: 2, hours: hours(2, [1], "15:00", "17:00") });
    const r = computeSlots(input({ staff: [a, b] }));
    expect(r.filter((s) => s.staffId === 1).every((s) => s.startTime < "11:00")).toBe(true);
    expect(r.filter((s) => s.staffId === 2).every((s) => s.startTime >= "15:00")).toBe(true);
  });
  it("11 'anyone available' lists each time once, given to the least busy person", () => {
    const busy = staff({ staffId: 1, bookings: [book("09:00", "09:40"), book("12:00", "12:40")] });
    const free = staff({ staffId: 2, bookings: [book("12:00", "12:40")].slice(0, 0) });
    const r = computeSlots(input({ staff: [busy, free] }));
    const t = times(r);
    expect(new Set(t).size).toBe(t.length);
    expect(r.find((s) => s.startTime === "09:45")?.staffId).toBe(2);
    expect(r.find((s) => s.startTime === "09:00")?.staffId).toBe(2); // staff 1 is busy at 09:00
  });
  it("12 a cancelled booking frees its time", () => {
    const r = computeSlots(input({ staff: [staff({ staffId: 1, bookings: [book("09:00", "10:00", "cancelled")] })] }));
    expect(times(r)[0]).toBe("09:00");
  });
  it("13 returns nothing on a closed weekday (Sunday)", () => {
    expect(computeSlots(input({ date: SUN, staff: [staff({ staffId: 1 })] }))).toHaveLength(0);
  });
  it("14 returns nothing for a past date", () => {
    expect(computeSlots(input({ date: "2026-11-19", staff: [staff({ staffId: 1 })] }))).toHaveLength(0);
  });
  it("15 keeps a buffer free after each booking", () => {
    const r = computeSlots(input({ bufferMinutes: 10, durationMinutes: 30, staff: [staff({ staffId: 1, bookings: [book("09:00", "10:00")] })] }));
    expect(times(r)[0]).toBe("10:15");
  });
  it("16 a chosen person returns only their slots", () => {
    const r = computeSlots(input({ staffId: 2, staff: [staff({ staffId: 1 }), staff({ staffId: 2 })] }));
    expect(r.every((s) => s.staffId === 2)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });
  it("17 time off ranges include both end dates", () => {
    const off = [{ id: 1, staffId: 1, dateFrom: "2026-11-20", dateTo: MON, reason: "" }];
    expect(computeSlots(input({ staff: [staff({ staffId: 1, timeOff: off })] }))).toHaveLength(0);
    expect(computeSlots(input({ date: "2026-11-24", staff: [staff({ staffId: 1, timeOff: off })] })).length).toBeGreaterThan(0);
  });
  it("18 honours a 30-minute step", () => {
    const r = computeSlots(input({ stepMinutes: 30, staff: [staff({ staffId: 1 })] }));
    expect(times(r).slice(0, 3)).toEqual(["09:00", "09:30", "10:00"]);
  });
  it("19 completed and no_show bookings still block the time", () => {
    const r = computeSlots(input({ staff: [staff({ staffId: 1, bookings: [book("09:00", "10:00", "completed"), book("10:00", "11:00", "no_show")] })] }));
    expect(times(r)[0]).toBe("11:00");
  });
  it("20 aligns to the step when the day starts off-grid", () => {
    const r = computeSlots(input({ staff: [staff({ staffId: 1, hours: hours(1, [1], "09:10", "12:00") })] }));
    expect(times(r)[0]).toBe("09:15");
  });
  it("21 an unknown staff id returns nothing", () => {
    expect(computeSlots(input({ staffId: 99, staff: [staff({ staffId: 1 })] }))).toHaveLength(0);
  });
  it("22 ties in 'anyone available' go to the lowest id", () => {
    const r = computeSlots(input({ staff: [staff({ staffId: 2 }), staff({ staffId: 1 })] }));
    expect(r[0]?.staffId).toBe(1);
  });
  it("23 a service that exactly fills the day gives one slot", () => {
    const r = computeSlots(input({ durationMinutes: 600, staff: [staff({ staffId: 1 })] }));
    expect(times(r)).toEqual(["09:00"]);
  });
  it("24 a future date ignores today's current time", () => {
    const r = computeSlots(input({ now: { date: "2026-11-22", time: "23:59" }, staff: [staff({ staffId: 1 })] }));
    expect(times(r)[0]).toBe("09:00");
  });
  it("25 returns nothing when there is no staff", () => {
    expect(computeSlots(input({ staff: [] }))).toHaveLength(0);
  });
  it("26 'anyone' shows a time if at least one person is free", () => {
    const a = staff({ staffId: 1, bookings: [book("09:00", "19:00")] });
    const b = staff({ staffId: 2 });
    expect(times(computeSlots(input({ staff: [a, b] })))[0]).toBe("09:00");
  });
  it("27 a service exactly as long as the gap fits", () => {
    const r = computeSlots(input({ durationMinutes: 45, staff: [staff({ staffId: 1, bookings: [book("09:00", "10:00"), book("10:45", "19:00")] })] }));
    expect(times(r)).toEqual(["10:00"]);
  });
});
