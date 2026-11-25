import { describe, expect, it } from "vitest";
import { hourMarks, layoutBlocks, nowQuarter, timelineRange, totalQuarters } from "./timeline";

const b = (id: number, staffId: number, startTime: string, endTime: string, status: "confirmed" | "cancelled" = "confirmed") => ({ id, staffId, startTime, endTime, status });

describe("timeline", () => {
  it("uses opening hours by default", () => {
    const r = timelineRange([]);
    expect(r).toEqual({ openMinutes: 540, closeMinutes: 1140 });
    expect(totalQuarters(r)).toBe(40);
  });
  it("widens for early and late bookings, to whole hours", () => {
    const r = timelineRange([b(1, 1, "08:15", "09:00"), b(2, 1, "19:30", "20:10")]);
    expect(r).toEqual({ openMinutes: 480, closeMinutes: 1260 });
  });
  it("positions a block in quarter-hours", () => {
    const r = timelineRange([]);
    const [block] = layoutBlocks([b(1, 1, "10:30", "11:10")], r);
    expect(block?.startQuarter).toBe(6);
    expect(block?.spanQuarters).toBeGreaterThan(2);
    expect(block?.spanQuarters).toBe(40 / 15);
  });
  it("gives no block to cancelled bookings", () => {
    expect(layoutBlocks([b(1, 1, "10:00", "10:30", "cancelled")], timelineRange([]))).toHaveLength(0);
  });
  it("keeps one person's blocks from overlapping when bookings do not overlap", () => {
    const blocks = layoutBlocks([b(1, 1, "09:00", "09:40"), b(2, 1, "09:45", "10:15"), b(3, 1, "10:15", "10:45")], timelineRange([]));
    for (const x of blocks) for (const y of blocks) {
      if (x.id === y.id) continue;
      expect(x.startQuarter < y.startQuarter + y.spanQuarters && y.startQuarter < x.startQuarter + x.spanQuarters).toBe(false);
    }
  });
  it("sorts blocks by time", () => {
    const ids = layoutBlocks([b(2, 1, "11:00", "11:30"), b(1, 1, "09:00", "09:30")], timelineRange([])).map((x) => x.id);
    expect(ids).toEqual([1, 2]);
  });
  it("places the now line only on today and inside the range", () => {
    const r = timelineRange([]);
    expect(nowQuarter({ date: "2026-11-24", time: "10:30" }, "2026-11-24", r)).toBe(6);
    expect(nowQuarter({ date: "2026-11-24", time: "10:30" }, "2026-11-25", r)).toBeNull();
    expect(nowQuarter({ date: "2026-11-24", time: "07:00" }, "2026-11-24", r)).toBeNull();
    expect(nowQuarter({ date: "2026-11-24", time: "10:07" }, "2026-11-24", r)).toBeCloseTo(4 + 7 / 15);
  });
  it("marks every hour", () => {
    const marks = hourMarks(timelineRange([]));
    expect(marks).toHaveLength(10);
    expect(marks[0]).toEqual({ time: "09:00", quarter: 0 });
    expect(marks[9]).toEqual({ time: "18:00", quarter: 36 });
  });
});
