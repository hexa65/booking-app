import { describe, expect, it } from "vitest";
import { estimateWaitMinutes, queuePosition, roundWaitToFive } from "./queue.js";

const e = (id: number, status: "waiting" | "in_service" | "done" | "left", joinedAt: string) => ({ id, status, joinedAt });

describe("queue position", () => {
  const entries = [e(1, "done", "2026-11-23 09:00"), e(2, "waiting", "2026-11-23 09:10"), e(3, "waiting", "2026-11-23 09:05"), e(4, "left", "2026-11-23 09:06")];
  it("orders by join time among waiting people only", () => {
    expect(queuePosition(entries, 3)).toBe(1);
    expect(queuePosition(entries, 2)).toBe(2);
  });
  it("returns null when not waiting", () => {
    expect(queuePosition(entries, 1)).toBeNull();
    expect(queuePosition(entries, 99)).toBeNull();
  });
  it("breaks ties by id", () => {
    expect(queuePosition([e(8, "waiting", "x"), e(7, "waiting", "x")], 7)).toBe(1);
  });
});

describe("estimated wait", () => {
  it("is 0 when a chair is free and nobody is ahead", () => { expect(estimateWaitMinutes([], [0, 20])).toBe(0); });
  it("waits for the chair that frees first", () => { expect(estimateWaitMinutes([], [15, 30])).toBe(15); });
  it("spreads people ahead across chairs", () => {
    expect(estimateWaitMinutes([40, 30], [0, 0])).toBe(30);
    expect(estimateWaitMinutes([40], [0, 10])).toBe(10);
  });
  it("returns null when nobody is working", () => { expect(estimateWaitMinutes([30], [])).toBeNull(); });
  it("rounds up to 5 minutes", () => { expect(roundWaitToFive(21)).toBe(25); expect(roundWaitToFive(25)).toBe(25); });
});
