import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it("handles local format with spaces", () => { expect(normalizePhone("0801 234 5678")).toBe("+2348012345678"); });
  it("handles international format", () => { expect(normalizePhone("+234 801 234 5678")).toBe("+2348012345678"); });
  it("handles 234 without plus", () => { expect(normalizePhone("2348012345678")).toBe("+2348012345678"); });
  it("handles 10 digits without the leading zero", () => { expect(normalizePhone("8012345678")).toBe("+2348012345678"); });
  it("handles dashes and brackets", () => { expect(normalizePhone("(0801) 234-5678")).toBe("+2348012345678"); });
  it("handles 00 prefix", () => { expect(normalizePhone("00234 801 234 5678")).toBe("+2348012345678"); });
  it("accepts other countries in international form", () => { expect(normalizePhone("+44 7911 123456")).toBe("+447911123456"); });
  it("rejects letters, empty and too short or long", () => {
    expect(normalizePhone("call me")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("0801")).toBeNull();
    expect(normalizePhone("+2348012345678999")).toBeNull();
  });
  it("rejects wrong-length Nigerian numbers", () => { expect(normalizePhone("0801 234 567")).toBeNull(); });
});
