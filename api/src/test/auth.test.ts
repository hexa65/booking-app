import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { pool } from "../db.js";
import { bearer, registerBusiness, resetDb } from "./helpers.js";

// Cases: register works and returns a token; duplicate email 409; weak password 400; two shops with the same
// name get different links; login works; wrong password and unknown email give the SAME 401 message;
// /auth/me needs a valid token; a tampered token is refused.
beforeEach(resetDb);
afterAll(async () => { await pool.end(); });

describe("auth", () => {
  it("registers a business and owner in one go", async () => {
    const res = await request(app).post("/auth/register").send({ businessName: "Crown Cuts", email: "Owner@Example.com", password: "Test-Password-1" });
    expect(res.status).toBe(201);
    expect(res.body.user.businessSlug).toBe("crown-cuts");
    expect(res.body.user.email).toBe("owner@example.com");
    expect(typeof res.body.token).toBe("string");
    expect(JSON.stringify(res.body)).not.toContain("password");
  });
  it("refuses a duplicate email with 409", async () => {
    await registerBusiness("Shop One", "a@example.com");
    const res = await request(app).post("/auth/register").send({ businessName: "Shop Two", email: "a@example.com", password: "Test-Password-1" });
    expect(res.status).toBe(409);
  });
  it("refuses a short password and bad email with 400", async () => {
    const short = await request(app).post("/auth/register").send({ businessName: "Shop", email: "a@example.com", password: "123" });
    expect(short.status).toBe(400);
    const bad = await request(app).post("/auth/register").send({ businessName: "Shop", email: "nope", password: "Test-Password-1" });
    expect(bad.status).toBe(400);
  });
  it("gives two shops with the same name different links", async () => {
    const one = await registerBusiness("Crown Cuts", "a@example.com");
    const two = await registerBusiness("Crown Cuts", "b@example.com");
    expect(one.slug).toBe("crown-cuts");
    expect(two.slug).toBe("crown-cuts-2");
  });
  it("logs in with the right password", async () => {
    await registerBusiness("Shop", "a@example.com");
    const res = await request(app).post("/auth/login").send({ email: "a@example.com", password: "Test-Password-1" });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });
  it("gives the same error for a wrong password and an unknown email", async () => {
    await registerBusiness("Shop", "a@example.com");
    const wrong = await request(app).post("/auth/login").send({ email: "a@example.com", password: "Wrong-Password-1" });
    const unknown = await request(app).post("/auth/login").send({ email: "who@example.com", password: "Wrong-Password-1" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });
  it("returns the account at /auth/me with a valid token", async () => {
    const acct = await registerBusiness("Shop", "a@example.com");
    const res = await request(app).get("/auth/me").set("Authorization", bearer(acct.token));
    expect(res.status).toBe(200);
    expect(res.body.user.businessId).toBe(acct.businessId);
  });
  it("refuses /auth/me with no token or a tampered token", async () => {
    const acct = await registerBusiness("Shop", "a@example.com");
    expect((await request(app).get("/auth/me")).status).toBe(401);
    const tampered = acct.token.slice(0, -3) + (acct.token.endsWith("aaa") ? "bbb" : "aaa");
    expect((await request(app).get("/auth/me").set("Authorization", bearer(tampered))).status).toBe(401);
    expect((await request(app).get("/auth/me").set("Authorization", "Bearer garbage")).status).toBe(401);
  });
});
