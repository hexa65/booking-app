import { describe, expect, it } from "vitest";
import { formatNaira, nairaToKobo } from "./money.js";

describe("money", () => {
  it("formats whole naira without decimals", () => { expect(formatNaira(300000)).toBe("₦3,000"); });
  it("formats kobo when present", () => { expect(formatNaira(150050)).toBe("₦1,500.50"); });
  it("parses naira text into kobo", () => {
    expect(nairaToKobo("3,000")).toBe(300000);
    expect(nairaToKobo("₦4500")).toBe(450000);
    expect(nairaToKobo("1500.5")).toBe(150050);
    expect(nairaToKobo("0")).toBe(0);
  });
  it("rejects nonsense and too-large prices", () => {
    expect(nairaToKobo("abc")).toBeNull();
    expect(nairaToKobo("-5")).toBeNull();
    expect(nairaToKobo("1.234")).toBeNull();
    expect(nairaToKobo("30000000")).toBeNull();
  });
  it("avoids the 0.1 + 0.2 float trap by using integers", () => {
    expect(nairaToKobo("0.10")! + nairaToKobo("0.20")!).toBe(30);
  });
});
