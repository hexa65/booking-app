import { describe, expect, it } from "vitest";
import { noShowRisk } from "./clients";
describe("noShowRisk", () => {
  it("is none with no misses", () => { expect(noShowRisk(5, 0)).toBe("none"); expect(noShowRisk(0, 0)).toBe("none"); });
  it("is watch for one miss", () => { expect(noShowRisk(10, 1)).toBe("watch"); });
  it("is high for two misses", () => { expect(noShowRisk(10, 2)).toBe("high"); });
  it("is high when a third of visits are missed", () => { expect(noShowRisk(2, 1)).toBe("high"); });
});
