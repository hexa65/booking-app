import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { pool } from "../db.js";
import { bearer, registerBusiness, resetDb } from "./helpers.js";
import type { TestAccount } from "./helpers.js";

// THE SECURITY TEST. Cases: business B cannot list, change or delete business A's service (404, and A's data
// is unchanged); no token and a tampered token give 401; a businessId in the request body is ignored.
let a: TestAccount;
let b: TestAccount;
let serviceId: number;

beforeEach(async () => {
  await resetDb();
  a = await registerBusiness("Shop A", "a@example.com");
  b = await registerBusiness("Shop B", "b@example.com");
  const res = await request(app).post("/services").set("Authorization", bearer(a.token)).send({ name: "Haircut", durationMinutes: 40, priceMinor: 300000 });
  expect(res.status).toBe(201);
  serviceId = (res.body as { id: number }).id;
});
afterAll(async () => { await pool.end(); });

describe("tenant isolation", () => {
  it("B does not see A's services in the list", async () => {
    const res = await request(app).get("/services").set("Authorization", bearer(b.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
  it("B cannot change A's service (404) and A's data stays the same", async () => {
    const res = await request(app).patch(`/services/${serviceId}`).set("Authorization", bearer(b.token)).send({ name: "Hacked" });
    expect(res.status).toBe(404);
    const mine = await request(app).get("/services").set("Authorization", bearer(a.token));
    expect((mine.body as { name: string }[])[0]?.name).toBe("Haircut");
  });
  it("B cannot delete A's service (404) and it still exists", async () => {
    const res = await request(app).delete(`/services/${serviceId}`).set("Authorization", bearer(b.token));
    expect(res.status).toBe(404);
    const mine = await request(app).get("/services").set("Authorization", bearer(a.token));
    expect(mine.body).toHaveLength(1);
  });
  it("answers 401 with no token or a tampered token", async () => {
    expect((await request(app).get("/services")).status).toBe(401);
    const tampered = a.token.slice(0, -3) + (a.token.endsWith("aaa") ? "bbb" : "aaa");
    expect((await request(app).get("/services").set("Authorization", bearer(tampered))).status).toBe(401);
  });
  it("ignores a businessId sent in the body", async () => {
    const res = await request(app).post("/services").set("Authorization", bearer(b.token))
      .send({ name: "Sneaky", durationMinutes: 20, priceMinor: 100, businessId: a.businessId, business_id: a.businessId });
    expect(res.status).toBe(201);
    const aList = await request(app).get("/services").set("Authorization", bearer(a.token));
    expect((aList.body as { name: string }[]).map((s) => s.name)).toEqual(["Haircut"]);
    const bList = await request(app).get("/services").set("Authorization", bearer(b.token));
    expect((bList.body as { name: string }[]).map((s) => s.name)).toEqual(["Sneaky"]);
  });
  it("validates input: bad duration and non-numeric id", async () => {
    const bad = await request(app).post("/services").set("Authorization", bearer(a.token)).send({ name: "X", durationMinutes: 1, priceMinor: 100 });
    expect(bad.status).toBe(400);
    const badId = await request(app).patch("/services/abc").set("Authorization", bearer(a.token)).send({ name: "Y" });
    expect(badId.status).toBe(400);
  });
});
