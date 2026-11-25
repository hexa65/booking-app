import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv.js";

describe("csv", () => {
  it("leaves plain text alone", () => { expect(csvCell("Haircut")).toBe("Haircut"); });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it("defuses spreadsheet formulas", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+234801")).toBe("'+234801");
  });
  it("handles null and numbers", () => { expect(csvCell(null)).toBe(""); expect(csvCell(300000)).toBe("300000"); });
  it("joins rows", () => { expect(toCsv([["a", "b"], [1, 2]])).toBe("a,b\r\n1,2\r\n"); });
});
