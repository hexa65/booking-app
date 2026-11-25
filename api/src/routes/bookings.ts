import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import { notFound } from "../errors.js";
import { BOOKING_SELECT, getActiveService, getBusinessById, insertBooking, lockAndCheck } from "../lib/data.js";
import { toCsv } from "../lib/csv.js";
import { addMinutes } from "../lib/time.js";
import { getAuth } from "../middleware/auth.js";
import { parseBody, parseId } from "../middleware/validate.js";
import { bookingPatchSchema, manualBookingSchema } from "../schemas.js";

export const bookingsRouter = Router();

const STATUSES = ["confirmed", "completed", "cancelled", "no_show"];
function queryText(value: unknown): string | null { return typeof value === "string" && value !== "" ? value : null; }
function queryDate(value: unknown): string | null { const t = queryText(value); return t !== null && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null; }
function queryInt(value: unknown): number | null { const t = queryText(value); return t !== null && /^\d{1,9}$/.test(t) ? Number(t) : null; }

bookingsRouter.get("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const from = queryDate(req.query.from);
  const to = queryDate(req.query.to) ?? from;
  const staffId = queryInt(req.query.staffId);
  const status = queryText(req.query.status);
  const r = await pool.query(
    `SELECT ${BOOKING_SELECT}, c.name AS "customerName", c.phone AS "customerPhone", sv.name AS "serviceName", st.name AS "staffName"
       FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN services sv ON sv.id = b.service_id JOIN staff st ON st.id = b.staff_id
      WHERE b.business_id = $1 AND ($2::date IS NULL OR b.starts_at >= $2::date) AND ($3::date IS NULL OR b.starts_at < $3::date + 1)
        AND ($4::int IS NULL OR b.staff_id = $4) AND ($5::text IS NULL OR b.status = $5)
      ORDER BY b.starts_at, b.id LIMIT 1000`,
    [businessId, from, to, staffId, status && STATUSES.includes(status) ? status : null]);
  res.json(r.rows);
});

// CSV export for the pilot. Declared BEFORE "/:id" routes so "export.csv" is never read as an id.
bookingsRouter.get("/export.csv", async (req, res) => {
  const { businessId } = getAuth(req);
  const r = await pool.query<{ date: string; startTime: string; service: string; staff: string; customer: string; status: string; source: string; priceMinor: number }>(
    `SELECT to_char(b.starts_at, 'YYYY-MM-DD') AS date, to_char(b.starts_at, 'HH24:MI') AS "startTime", sv.name AS service, st.name AS staff,
            c.name AS customer, b.status, b.source, b.price_minor AS "priceMinor"
       FROM bookings b JOIN customers c ON c.id = b.customer_id JOIN services sv ON sv.id = b.service_id JOIN staff st ON st.id = b.staff_id
      WHERE b.business_id = $1 ORDER BY b.starts_at`, [businessId]);
  const rows: (string | number)[][] = [["date", "start", "service", "staff", "customer", "status", "source", "price_naira"]];
  for (const b of r.rows) rows.push([b.date, b.startTime, b.service, b.staff, b.customer, b.status, b.source, b.priceMinor / 100]);
  res.type("text/csv").set("Content-Disposition", 'attachment; filename="bookings.csv"').send(toCsv(rows));
});

bookingsRouter.post("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const input = parseBody(manualBookingSchema, req.body);
  const biz = await getBusinessById(pool, businessId);
  const created = await withTransaction(async (client) => {
    const service = await getActiveService(client, businessId, input.serviceId);
    return insertBooking(client, {
      biz, service, staffId: input.staffId, date: input.date, startTime: input.startTime,
      customerName: input.customerName, customerPhone: input.customerPhone, source: input.source, notes: input.notes, manual: true,
    });
  });
  const row = await pool.query(`SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1 AND b.business_id = $2`, [created.id, businessId]);
  res.status(201).json(row.rows[0]);
});

bookingsRouter.patch("/:id", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const input = parseBody(bookingPatchSchema, req.body);
  const biz = await getBusinessById(pool, businessId);
  const updated = await withTransaction(async (client) => {
    const found = await client.query<{ staffId: number; serviceId: number }>(
      `SELECT staff_id AS "staffId", service_id AS "serviceId" FROM bookings WHERE id = $1 AND business_id = $2 FOR UPDATE`, [id, businessId]);
    const current = found.rows[0];
    if (!current) throw notFound("Booking not found."); // also the answer for another business's booking
    if (input.move) {
      const targetStaff = input.move.staffId ?? current.staffId;
      const service = await getActiveService(client, businessId, current.serviceId);
      await lockAndCheck(client, biz, service, targetStaff, input.move.date, input.move.startTime, { manual: true, excludeBookingId: id });
      const end = addMinutes(input.move.startTime, service.durationMinutes);
      await client.query("UPDATE bookings SET staff_id = $1, starts_at = $2, ends_at = $3 WHERE id = $4 AND business_id = $5",
        [targetStaff, `${input.move.date} ${input.move.startTime}:00`, `${input.move.date} ${end}:00`, id, businessId]);
    }
    if (input.status !== undefined) await client.query("UPDATE bookings SET status = $1 WHERE id = $2 AND business_id = $3", [input.status, id, businessId]);
    if (input.notes !== undefined) await client.query("UPDATE bookings SET notes = $1 WHERE id = $2 AND business_id = $3", [input.notes, id, businessId]);
    const row = await client.query(`SELECT ${BOOKING_SELECT} FROM bookings b WHERE b.id = $1 AND b.business_id = $2`, [id, businessId]);
    return row.rows[0];
  });
  res.json(updated);
});
