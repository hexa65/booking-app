import request from "supertest";
import { app } from "../app.js";
import { pool } from "../db.js";

/** Wipes every table. Only ever runs against the TEST database branch (see .env.test). */
export async function resetDb(): Promise<void> {
  await pool.query("TRUNCATE events, queue_entries, bookings, customers, time_off, working_hours, staff_services, services, staff, users, businesses RESTART IDENTITY CASCADE");
}

export interface TestAccount { token: string; businessId: number; slug: string; }

export async function registerBusiness(businessName: string, email: string, password = "Test-Password-1"): Promise<TestAccount> {
  const res = await request(app).post("/auth/register").send({ businessName, email, password });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const body = res.body as { token: string; user: { businessId: number; businessSlug: string } };
  return { token: body.token, businessId: body.user.businessId, slug: body.user.businessSlug };
}

export const bearer = (token: string): string => `Bearer ${token}`;
