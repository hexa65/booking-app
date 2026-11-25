import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { pool } from "../db.js";

// Cases: health answers ok, unknown route gives a JSON 404, broken JSON gives a clean 400.
afterAll(async () => { await pool.end(); });

describe("basics", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
  it("unknown route returns a JSON 404", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Not found." });
  });
  it("invalid JSON returns 400 and leaks nothing", async () => {
    const res = await request(app).post("/auth/login").set("Content-Type", "application/json").send("{ bad json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid JSON." });
  });
});
