import "dotenv/config";
import pg from "pg";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/password.js";
import { nowInTimezone } from "../src/lib/time.js";
import { buildSeedPlan, CUSTOMERS, SERVICES, STAFF_SERVICES } from "./seedPlan.js";

// DEMO LOGIN (fake, documented, never use for a real account): demo@example.com / Demo-Pass-2026
// Wednesdays: Ibrahim has no working-hours rows on Wednesday = his day off.
// Running this again RESETS the database to the same demo data (relative to today).
const url = process.env.DATABASE_URL_DIRECT;
if (!url) throw new Error("DATABASE_URL_DIRECT is missing in .env");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const today = nowInTimezone("Africa/Lagos", new Date()).date;
  const plan = buildSeedPlan(today);
  await client.query("BEGIN");
  await client.query("TRUNCATE events, queue_entries, bookings, customers, time_off, working_hours, staff_services, services, staff, users, businesses RESTART IDENTITY CASCADE");

  const biz = await client.query<{ id: number }>(
    "INSERT INTO businesses (name, slug, timezone, slot_step_minutes) VALUES ($1, $2, $3, $4) RETURNING id",
    ["Crown Cuts", "crown-cuts", "Africa/Lagos", 15]);
  const businessId = biz.rows[0]!.id;
  await client.query("INSERT INTO users (business_id, email, password_hash, role) VALUES ($1, $2, $3, 'owner')",
    [businessId, "demo@example.com", await hashPassword("Demo-Pass-2026")]);

  const serviceIds = new Map<string, number>();
  const serviceDurations = new Map<string, number>();
  for (const s of SERVICES) {
    const r = await client.query<{ id: number }>(
      "INSERT INTO services (business_id, name, duration_minutes, price_minor) VALUES ($1, $2, $3, $4) RETURNING id",
      [businessId, s.name, s.durationMinutes, s.priceMinor]);
    serviceIds.set(s.name, r.rows[0]!.id);
    serviceDurations.set(s.name, s.durationMinutes);
  }
  const staffIds = new Map<string, number>();
  for (const [name, offered] of Object.entries(STAFF_SERVICES)) {
    const r = await client.query<{ id: number }>("INSERT INTO staff (business_id, name) VALUES ($1, $2) RETURNING id", [businessId, name]);
    const staffId = r.rows[0]!.id;
    staffIds.set(name, staffId);
    for (const svc of offered) {
      await client.query("INSERT INTO staff_services (business_id, staff_id, service_id) VALUES ($1, $2, $3)", [businessId, staffId, serviceIds.get(svc)]);
    }
  }
  for (const h of plan.hours) {
    await client.query("INSERT INTO working_hours (business_id, staff_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4, $5)",
      [businessId, staffIds.get(h.staffName), h.weekday, h.startTime, h.endTime]);
  }
  const customerIds: number[] = [];
  for (const c of CUSTOMERS) {
    const r = await client.query<{ id: number }>("INSERT INTO customers (business_id, name, phone) VALUES ($1, $2, $3) RETURNING id", [businessId, c.name, c.phone]);
    customerIds.push(r.rows[0]!.id);
  }
  for (const b of plan.bookings) {
    await client.query(
      `INSERT INTO bookings (business_id, staff_id, service_id, customer_id, starts_at, ends_at, status, source, price_minor, manage_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [businessId, staffIds.get(b.staffName), serviceIds.get(b.serviceName), customerIds[b.customerIndex],
       `${b.date} ${b.startTime}:00`, `${b.date} ${b.endTime}:00`, b.status, b.source, b.priceMinor, randomBytes(32).toString("hex")]);
  }
  await client.query("COMMIT");
  console.log("Seeded Crown Cuts. Login: demo@example.com / Demo-Pass-2026. Today:", today);
} catch (err: unknown) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  await client.end();
}
