import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../app.js";
import { pool } from "../db.js";
import { addDays, isoWeekday, nowInTimezone } from "../lib/time.js";
import { bearer, registerBusiness, resetDb } from "./helpers.js";
import type { TestAccount } from "./helpers.js";

// Cases: the slots endpoint lists times; a public booking works and returns a manage link; the SAME slot
// requested twice at once gives exactly one 201 and one 409; a cancelled booking frees the slot;
// another business never sees this business's slots; the customer link cancels; bad tokens give 404.
let acct: TestAccount;
let serviceId: number;
let staffId: number;
let date: string;

function nextOpenDay(): string {
  let d = addDays(nowInTimezone("Africa/Lagos", new Date()).date, 2);
  while (isoWeekday(d) === 7) d = addDays(d, 1);
  return d;
}
const auth = () => ({ Authorization: bearer(acct.token) });

beforeEach(async () => {
  await resetDb();
  acct = await registerBusiness("Test Shop", "owner@example.com");
  date = nextOpenDay();
  serviceId = (await request(app).post("/services").set(auth()).send({ name: "Haircut", durationMinutes: 40, priceMinor: 300000 })).body.id;
  staffId = (await request(app).post("/staff").set(auth()).send({ name: "Tunde", serviceIds: [serviceId] })).body.id;
  const intervals = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "09:00", endTime: "19:00" }));
  await request(app).put(`/staff/${staffId}/hours`).set(auth()).send({ intervals });
});
afterAll(async () => { await pool.end(); });

const body = (startTime: string, phone = "0801 234 5678") => ({ serviceId, staffId, date, startTime, name: "Emeka", phone, consent: true });

describe("slots and booking", () => {
  it("lists free times for the shop's own services", async () => {
    const res = await request(app).get(`/public/${acct.slug}/slots`).query({ serviceId, date });
    expect(res.status).toBe(200);
    expect((res.body as { startTime: string }[])[0]?.startTime).toBe("09:00");
  });
  it("books a time and returns a manage link", async () => {
    const res = await request(app).post(`/public/${acct.slug}/bookings`).send(body("10:00"));
    expect(res.status).toBe(201);
    expect(res.body.manageToken).toHaveLength(64);
    const view = await request(app).get(`/public/bookings/${res.body.manageToken}`);
    expect(view.status).toBe(200);
    expect(view.body.startTime).toBe("10:00");
  });
  it("gives exactly one 201 and one 409 when two people take the same slot at once", async () => {
    const [one, two] = await Promise.all([
      request(app).post(`/public/${acct.slug}/bookings`).send(body("11:00", "0801 111 1111")),
      request(app).post(`/public/${acct.slug}/bookings`).send(body("11:00", "0802 222 2222")),
    ]);
    expect([one.status, two.status].sort()).toEqual([201, 409]);
  });
  it("hides a booked time and frees it again after cancelling", async () => {
    const made = await request(app).post(`/public/${acct.slug}/bookings`).send(body("12:00"));
    const taken = await request(app).get(`/public/${acct.slug}/slots`).query({ serviceId, date });
    expect((taken.body as { startTime: string }[]).some((s) => s.startTime === "12:00")).toBe(false);
    const cancelled = await request(app).post(`/public/bookings/${made.body.manageToken}/cancel`);
    expect(cancelled.status).toBe(200);
    const freed = await request(app).get(`/public/${acct.slug}/slots`).query({ serviceId, date });
    expect((freed.body as { startTime: string }[]).some((s) => s.startTime === "12:00")).toBe(true);
  });
  it("never shows another business's slots", async () => {
    const other = await registerBusiness("Other Shop", "other@example.com");
    const res = await request(app).get(`/public/${other.slug}/slots`).query({ serviceId, date });
    expect(res.status).toBe(404); // the service id belongs to the first shop
  });
  it("answers 404 for a bad or unknown manage token", async () => {
    expect((await request(app).get("/public/bookings/nope")).status).toBe(404);
    expect((await request(app).get(`/public/bookings/${"a".repeat(64)}`)).status).toBe(404);
  });
  it("rejects a booking without consent or with a bad phone", async () => {
    expect((await request(app).post(`/public/${acct.slug}/bookings`).send({ ...body("10:00"), consent: false })).status).toBe(400);
    expect((await request(app).post(`/public/${acct.slug}/bookings`).send(body("10:00", "abc"))).status).toBe(400);
  });
  it("lets the owner move a booking onto a free time but not onto a taken one", async () => {
    const a = await request(app).post("/bookings").set(auth()).send({ serviceId, staffId, date, startTime: "09:00", customerName: "A", customerPhone: "0801 000 0001" });
    await request(app).post("/bookings").set(auth()).send({ serviceId, staffId, date, startTime: "10:00", customerName: "B", customerPhone: "0801 000 0002" });
    const clash = await request(app).patch(`/bookings/${a.body.id}`).set(auth()).send({ move: { date, startTime: "10:20" } });
    expect(clash.status).toBe(409);
    const ok = await request(app).patch(`/bookings/${a.body.id}`).set(auth()).send({ move: { date, startTime: "11:00" } });
    expect(ok.status).toBe(200);
    expect(ok.body.startTime).toBe("11:00");
  });
});
