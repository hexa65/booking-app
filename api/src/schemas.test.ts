import { describe, expect, it } from "vitest";
import { createServiceSchema, loginSchema, registerSchema, updateServiceSchema } from "./schemas.js";

describe("schemas", () => {
  it("normalises the email", () => {
    const r = registerSchema.safeParse({ businessName: "Crown", email: "  A@Example.COM ", password: "12345678" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("a@example.com");
  });
  it("rejects short passwords and bad emails", () => {
    expect(registerSchema.safeParse({ businessName: "Crown", email: "a@b.co", password: "1234567" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
  it("accepts a valid service and rejects bad ones", () => {
    expect(createServiceSchema.safeParse({ name: "Haircut", durationMinutes: 40, priceMinor: 300000 }).success).toBe(true);
    expect(createServiceSchema.safeParse({ name: "Haircut", durationMinutes: 40.5, priceMinor: 300000 }).success).toBe(false);
    expect(createServiceSchema.safeParse({ name: "Haircut", durationMinutes: 40, priceMinor: -1 }).success).toBe(false);
    expect(createServiceSchema.safeParse({ name: "", durationMinutes: 40, priceMinor: 1 }).success).toBe(false);
    expect(createServiceSchema.safeParse({ name: "H", durationMinutes: 40, priceMinor: 3000000000 }).success).toBe(false);
  });
  it("allows partial updates but not empty ones", () => {
    expect(updateServiceSchema.safeParse({ active: false }).success).toBe(true);
    expect(updateServiceSchema.safeParse({}).success).toBe(false);
  });
  it("strips unknown keys such as businessId", () => {
    const r = createServiceSchema.safeParse({ name: "X", durationMinutes: 20, priceMinor: 1, businessId: 7 });
    expect(r.success).toBe(true);
    if (r.success) expect("businessId" in r.data).toBe(false);
  });
});
