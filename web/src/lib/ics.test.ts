import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";
describe("ics", () => {
  const ics = buildIcs({ uid: "abc", title: "Haircut, Crown Cuts", date: "2026-11-24", startTime: "10:30", endTime: "11:10" });
  it("has the right times", () => { expect(ics).toContain("DTSTART:20261124T103000"); expect(ics).toContain("DTEND:20261124T111000"); });
  it("escapes commas and ends with a newline", () => { expect(ics).toContain("SUMMARY:Haircut\\, Crown Cuts"); expect(ics.endsWith("\r\n")).toBe(true); });
  it("is a calendar", () => { expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true); });
});
