import { randomBytes } from "node:crypto";
import type { QueryResult, QueryResultRow } from "pg";
import { conflict, notFound } from "../errors.js";
import type { StaffDay } from "./slots.js";
import { computeSlots } from "./slots.js";
import { addMinutes, nowInTimezone } from "./time.js";
import type { SlotOption, TimeOff, WorkingInterval, BookingSource } from "../types.js";

/** Anything with .query: the pool or one transaction client. */
export interface Db { query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>; }

export interface BusinessSettings {
  id: number; name: string; slug: string; timezone: string; slotStepMinutes: number; leadMinutes: number;
  bufferMinutes: number; bookingWindowDays: number; cancelCutoffHours: number;
}
const BUSINESS_COLUMNS = `id, name, slug, timezone, slot_step_minutes AS "slotStepMinutes", lead_minutes AS "leadMinutes",
  buffer_minutes AS "bufferMinutes", booking_window_days AS "bookingWindowDays", cancel_cutoff_hours AS "cancelCutoffHours"`;

export async function getBusinessById(db: Db, id: number): Promise<BusinessSettings> {
  const r = await db.query<BusinessSettings>(`SELECT ${BUSINESS_COLUMNS} FROM businesses WHERE id = $1`, [id]);
  if (!r.rows[0]) throw notFound("Business not found.");
  return r.rows[0];
}
export async function getBusinessBySlug(db: Db, slug: string): Promise<BusinessSettings> {
  const r = await db.query<BusinessSettings>(`SELECT ${BUSINESS_COLUMNS} FROM businesses WHERE slug = $1`, [slug]);
  if (!r.rows[0]) throw notFound("We could not find that business.");
  return r.rows[0];
}

export async function loadStaffDays(db: Db, businessId: number, date: string, excludeBookingId: number | null = null): Promise<StaffDay[]> {
  const staff = await db.query<{ id: number; serviceIds: number[] }>(
    `SELECT s.id, COALESCE(array_agg(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL), '{}') AS "serviceIds"
       FROM staff s LEFT JOIN staff_services ss ON ss.staff_id = s.id
      WHERE s.business_id = $1 AND s.active GROUP BY s.id ORDER BY s.id`, [businessId]);
  const hours = await db.query<WorkingInterval>(
    `SELECT id, staff_id AS "staffId", weekday, to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime"
       FROM working_hours WHERE business_id = $1`, [businessId]);
  const off = await db.query<TimeOff>(
    `SELECT id, staff_id AS "staffId", date_from AS "dateFrom", date_to AS "dateTo", reason FROM time_off WHERE business_id = $1 AND date_to >= $2::date`,
    [businessId, date]);
  const bookings = await db.query<{ staffId: number; startTime: string; endTime: string; status: "confirmed" | "completed" | "cancelled" | "no_show" }>(
    `SELECT staff_id AS "staffId", to_char(starts_at, 'HH24:MI') AS "startTime", to_char(ends_at, 'HH24:MI') AS "endTime", status
       FROM bookings WHERE business_id = $1 AND starts_at >= $2::date AND starts_at < $2::date + 1 AND ($3::int IS NULL OR id <> $3)`,
    [businessId, date, excludeBookingId]);
  return staff.rows.map((s) => ({
    staffId: s.id, serviceIds: s.serviceIds,
    hours: hours.rows.filter((h) => h.staffId === s.id),
    timeOff: off.rows.filter((t) => t.staffId === s.id),
    bookings: bookings.rows.filter((b) => b.staffId === s.id),
  }));
}

export interface ServiceRow { id: number; name: string; durationMinutes: number; priceMinor: number; }
export async function getActiveService(db: Db, businessId: number, serviceId: number): Promise<ServiceRow> {
  const r = await db.query<ServiceRow>(
    `SELECT id, name, duration_minutes AS "durationMinutes", price_minor AS "priceMinor" FROM services WHERE id = $1 AND business_id = $2 AND active`,
    [serviceId, businessId]);
  if (!r.rows[0]) throw notFound("Service not found.");
  return r.rows[0];
}

export interface FreeSlotOptions { manual?: boolean; excludeBookingId?: number | null; }

/** Loads this business's data, runs the pure slot engine, returns free start times. */
export async function freeSlots(db: Db, biz: BusinessSettings, service: ServiceRow, date: string, staffId: number | null, opts: FreeSlotOptions = {}): Promise<SlotOption[]> {
  const staff = await loadStaffDays(db, biz.id, date, opts.excludeBookingId ?? null);
  return computeSlots({
    date, serviceId: service.id, durationMinutes: service.durationMinutes, staff, staffId, bufferMinutes: biz.bufferMinutes,
    // The owner may book at any 5-minute mark, even sooner than the lead time, so manual bookings relax the rules.
    now: opts.manual ? { date, time: "00:00" } : nowInTimezone(biz.timezone, new Date()),
    stepMinutes: opts.manual ? 5 : biz.slotStepMinutes, leadMinutes: opts.manual ? 0 : biz.leadMinutes,
  });
}

/** Layer 1 of double-booking protection: lock the staff row, re-check, then the caller INSERTs/UPDATEs in the same transaction. */
export async function lockAndCheck(client: Db, biz: BusinessSettings, service: ServiceRow, staffId: number, date: string, startTime: string, opts: FreeSlotOptions = {}): Promise<void> {
  const locked = await client.query("SELECT id FROM staff WHERE id = $1 AND business_id = $2 AND active FOR UPDATE", [staffId, biz.id]);
  if (!locked.rows[0]) throw notFound("Staff member not found.");
  const slots = await freeSlots(client, biz, service, date, staffId, opts);
  if (!slots.some((s) => s.startTime === startTime && s.staffId === staffId)) throw conflict("That time was just taken. Please pick another.");
}

export interface NewBooking {
  biz: BusinessSettings; service: ServiceRow; staffId: number; date: string; startTime: string;
  customerName: string; customerPhone: string; source: BookingSource; notes: string; manual: boolean;
}
/** Runs inside a transaction. Finds or creates the customer by phone, then inserts. Layer 2 (the exclusion constraint) backs this up. */
export async function insertBooking(client: Db, b: NewBooking): Promise<{ id: number; manageToken: string }> {
  await lockAndCheck(client, b.biz, b.service, b.staffId, b.date, b.startTime, { manual: b.manual });
  const customer = await client.query<{ id: number }>(
    `INSERT INTO customers (business_id, name, phone) VALUES ($1, $2, $3)
     ON CONFLICT (business_id, phone) DO UPDATE SET phone = EXCLUDED.phone RETURNING id`, [b.biz.id, b.customerName, b.customerPhone]);
  const token = randomBytes(32).toString("hex");
  const endTime = addMinutes(b.startTime, b.service.durationMinutes);
  const r = await client.query<{ id: number }>(
    `INSERT INTO bookings (business_id, staff_id, service_id, customer_id, starts_at, ends_at, status, source, price_minor, notes, manage_token)
     VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9, $10) RETURNING id`,
    [b.biz.id, b.staffId, b.service.id, customer.rows[0]!.id, `${b.date} ${b.startTime}:00`, `${b.date} ${endTime}:00`, b.source, b.service.priceMinor, b.notes, token]);
  return { id: r.rows[0]!.id, manageToken: token };
}

export async function recordEvent(db: Db, businessId: number, name: "business_signed_up" | "first_service_added" | "booking_received"): Promise<void> {
  if (name !== "booking_received") {
    const done = await db.query("SELECT 1 FROM events WHERE business_id = $1 AND name = $2", [businessId, name]);
    if (done.rowCount) return;
  }
  await db.query("INSERT INTO events (business_id, name) VALUES ($1, $2)", [businessId, name]);
}

export const BOOKING_SELECT = `
  b.id, b.staff_id AS "staffId", b.service_id AS "serviceId", b.customer_id AS "customerId",
  to_char(b.starts_at, 'YYYY-MM-DD') AS date, to_char(b.starts_at, 'HH24:MI') AS "startTime", to_char(b.ends_at, 'HH24:MI') AS "endTime",
  b.status, b.source, b.price_minor AS "priceMinor", b.notes`;
