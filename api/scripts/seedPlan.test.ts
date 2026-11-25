import { describe, expect, it } from "vitest";
import { buildSeedPlan, STAFF_SERVICES } from "./seedPlan.js";
import { addDays, isoWeekday } from "../src/lib/time.js";

// Run the plan for every weekday so the seed works whatever day you run it.
const START = "2026-11-23";
describe("seed plan (DATA RULES)", () => {
  for (let k = 0; k < 8; k++) {
    const today = addDays(START, k);
    it(`has the exact counts when run on ${today} (weekday ${isoWeekday(today)})`, () => {
      const { bookings } = buildSeedPlan(today);
      const past = bookings.filter((b) => b.date < today);
      expect(past).toHaveLength(24);
      expect(past.filter((b) => b.status === "completed")).toHaveLength(19);
      expect(past.filter((b) => b.status === "no_show")).toHaveLength(3);
      expect(past.filter((b) => b.status === "cancelled")).toHaveLength(2);
      expect(bookings.filter((b) => b.date === today)).toHaveLength(6);
      expect(bookings.filter((b) => b.date === addDays(today, 1))).toHaveLength(5);
      expect(past.some((b) => b.date === today)).toBe(false);
    });
    it(`never overlaps one person's bookings (${today})`, () => {
      const { bookings } = buildSeedPlan(today).bookings.length ? buildSeedPlan(today) : { bookings: [] };
      const active = bookings.filter((b) => b.status !== "cancelled");
      for (const a of active) for (const b of active) {
        if (a === b || a.staffName !== b.staffName || a.date !== b.date) continue;
        expect(a.startTime < b.endTime && b.startTime < a.endTime).toBe(false);
      }
    });
  }
  it("respects Ibrahim's Wednesdays, Tunde's lunch and who offers what", () => {
    const { bookings } = buildSeedPlan(START);
    for (const b of bookings) {
      if (b.staffName === "Ibrahim") expect(isoWeekday(b.date)).not.toBe(3);
      if (b.staffName === "Tunde") expect(b.startTime < "13:00" && b.endTime > "13:00").toBe(false);
      expect(STAFF_SERVICES[b.staffName]!.includes(b.serviceName)).toBe(true);
      if (isoWeekday(b.date) !== 7) expect(isoWeekday(b.date)).toBeGreaterThan(0);
    }
  });
  it("gives the no-show rate 3 / 22", () => {
    const past = buildSeedPlan(START).bookings.filter((b) => b.date < START);
    const noShow = past.filter((b) => b.status === "no_show").length;
    const completed = past.filter((b) => b.status === "completed").length;
    expect(noShow / (noShow + completed)).toBe(3 / 22);
  });
});
