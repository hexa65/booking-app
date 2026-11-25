import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("passwords", () => {
  it("accepts the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("Correct-Horse-1");
    expect(await verifyPassword("Correct-Horse-1", hash)).toBe(true);
    expect(await verifyPassword("correct-horse-1", hash)).toBe(false);
  });
  it("uses a different salt every time", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });
  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt$zz$zz")).toBe(false);
  });
});
