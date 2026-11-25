import { describe, expect, it } from "vitest";
import { isValidSlug, slugCandidate, slugify } from "./slug.js";

describe("slugify", () => {
  it("makes a clean link", () => { expect(slugify("Crown Cuts & Salon!")).toBe("crown-cuts-salon"); });
  it("removes accents", () => { expect(slugify("Café Ọlá")).toBe("cafe-ola"); });
  it("never returns an empty slug", () => { expect(slugify("!!!")).toBe("shop"); });
  it("avoids reserved words", () => { expect(slugify("Login")).toBe("login-shop"); expect(slugify("API")).toBe("api-shop"); });
  it("limits the length and trailing dashes", () => {
    const s = slugify("a".repeat(39) + " bbbbbbbb");
    expect(s.length < 41).toBe(true);
    expect(s.endsWith("-")).toBe(false);
  });
  it("adds a number for repeats", () => {
    expect(slugCandidate("crown-cuts", 1)).toBe("crown-cuts");
    expect(slugCandidate("crown-cuts", 3)).toBe("crown-cuts-3");
  });
  it("validates slugs", () => {
    expect(isValidSlug("crown-cuts")).toBe(true);
    expect(isValidSlug("Crown")).toBe(false);
    expect(isValidSlug("a--b")).toBe(false);
  });
});
