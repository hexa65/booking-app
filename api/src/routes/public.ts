import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import { badRequest, conflict, forbidden, notFound } from "../errors.js";
import {
  BOOKING_SELECT, freeSlots, getActiveService, getBusinessBySlug, insertBooking, lockAndCheck, recordEvent,
} from "../lib/data.js";
import { addToQueue, queueView } from "../lib/queueData.js";
import { addDays, addMinutes, isValidDate, minutesBetween, nowInTimezone } from "../lib/time.js";
import { publicLimiter } from "../middleware/rateLimit.js";
import { parseBody, parseId } from "../middleware/validate.js";
import { publicBookingSchema, queueJoinSchema, rescheduleSchema } from "../schemas.js";

// Everything here is open to the internet: rate limited, validated, and it returns the same
// plain 404 for "not found", so nothing leaks about other businesses or customers.
export const publicRouter = Router();
publicRouter.use(publicLimiter);

const isToken = (t: unknown): t is string => typeof t === "string" && /^[a-f0-9]{64}$/.test(t);

const MANAGE_SELECT = `${BOOKING_SELECT}, sv.name AS "serviceName", st.name AS "staffName", biz.name AS "businessName", biz.slug AS "businessSlug",
  biz.cancel_cutoff_hours AS "cancelCutoffHours", biz.timezone AS timezone, c.name AS "customerName"`;
const MANAGE_FROM = `FROM bookings b JOIN services sv ON sv.id = b.service_id JOIN staff st ON st.id = b.staff_id
  JOIN businesses biz ON biz.id = b.business_id JOIN customers c ON c.id = b.customer_id`;

interface ManageRow {
  id: number; staffId: number; serviceId: number; date: string; startTime: string; endTime: string; status: string;
  cancelCutoffHours: number; timezone: string; [key: string]: unknown;
}
async function loadByToken(token: unknown): Promise<ManageRow> {
  if (!isToken(token)) throw notFound("We could not find that booking.");
  const r = await pool.query<ManageRow>(`SELECT ${MANAGE_SELECT} ${MANAGE_FROM} WHERE b.manage_token = $1`, [token]);
  if (!r.rows[0]) throw notFound("We could not find that booking.");
  return r.rows[0];
}
function withRules(row: ManageRow) {
  const now = nowInTimezone(row.timezone, new Date());
  const minutesLeft = minutesBetween(now.date, now.time, row.date, row.startTime);
  const { timezone: _tz, ...rest } = row;
  return { ...rest, canChange: row.status === "confirmed" && minutesLeft >= row.cancelCutoffHours * 60 };
}
function assertCanChange(row: ManageRow): void {
  if (row.status !== "confirmed") throw badRequest("This booking can no longer be changed.");
  const now = nowInTimezone(row.timezone, new Date());
  if (minutesBetween(now.date, now.time, row.date, row.startTime) < row.cancelCutoffHours * 60) {
    throw forbidden(`Bookings can only be changed up to ${row.cancelCutoffHours} hours before. Please call the shop.`);
  }
}

publicRouter.get("/bookings/:token", async (req, res) => { res.json(withRules(await loadByToken(req.params.token))); });

publicRouter.post("/bookings/:token/cancel", async (req, res) => {
  const row = await loadByToken(req.params.token);
  assertCanChange(row);
  await pool.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [row.id]);
  res.json(withRules(await loadByToken(req.params.token)));
});

publicRouter.post("/bookings/:token/reschedule", async (req, res) => {
  const row = await loadByToken(req.params.token);
  assertCanChange(row);
  const input = parseBody(rescheduleSchema, req.body);
  const bizRow = await pool.query<{ slug: string }>("SELECT slug FROM businesses WHERE id = (SELECT business_id FROM bookings WHERE id = $1)", [row.id]);
  const biz = await getBusinessBySlug(pool, bizRow.rows[0]!.slug);
  const today = nowInTimezone(biz.timezone, new Date()).date;
  if (input.date > addDays(today, biz.bookingWindowDays)) throw badRequest("That day is too far ahead to book.");
  await withTransaction(async (client) => {
    const service = await getActiveService(client, biz.id, row.serviceId);
    await lockAndCheck(client, biz, service, row.staffId, input.date, input.startTime, { excludeBookingId: row.id });
    await client.query("UPDATE bookings SET starts_at = $1, ends_at = $2 WHERE id = $3",
      [`${input.date} ${input.startTime}:00`, `${input.date} ${addMinutes(input.startTime, service.durationMinutes)}:00`, row.id]);
  });
  res.json(withRules(await loadByToken(req.params.token)));
});

publicRouter.get("/queue/:token", async (req, res) => {
  if (!isToken(req.params.token)) throw notFound("We could not find your place in the queue.");
  const r = await pool.query<{ id: number; businessId: number; name: string; status: string; businessName: string; serviceName: string }>(
    `SELECT q.id, q.business_id AS "businessId", q.name, q.status, biz.name AS "businessName", sv.name AS "serviceName"
       FROM queue_entries q JOIN businesses biz ON biz.id = q.business_id JOIN services sv ON sv.id = q.service_id WHERE q.queue_token = $1`, [req.params.token]);
  const e = r.rows[0];
  if (!e) throw notFound("We could not find your place in the queue.");
  const view = await queueView(pool, e.businessId, e.id);
  res.json({ name: e.name, status: e.status, businessName: e.businessName, serviceName: e.serviceName, ...view });
});

publicRouter.get("/:slug", async (req, res) => {
  const biz = await getBusinessBySlug(pool, String(req.params.slug));
  const services = await pool.query(
    `SELECT id, name, duration_minutes AS "durationMinutes", price_minor AS "priceMinor", active FROM services WHERE business_id = $1 AND active ORDER BY name`, [biz.id]);
  const staff = await pool.query(
    `SELECT s.id, s.name, s.active, COALESCE(array_agg(ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL), '{}') AS "serviceIds"
       FROM staff s LEFT JOIN staff_services ss ON ss.staff_id = s.id WHERE s.business_id = $1 AND s.active GROUP BY s.id ORDER BY s.name`, [biz.id]);
  res.json({
    business: { name: biz.name, slug: biz.slug, timezone: biz.timezone, bookingWindowDays: biz.bookingWindowDays, cancelCutoffHours: biz.cancelCutoffHours },
    services: services.rows, staff: staff.rows,
  });
});

publicRouter.get("/:slug/slots", async (req, res) => {
  const biz = await getBusinessBySlug(pool, String(req.params.slug));
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!isValidDate(date)) throw badRequest("Choose a valid day.");
  const today = nowInTimezone(biz.timezone, new Date()).date;
  if (date < today || date > addDays(today, biz.bookingWindowDays)) { res.json([]); return; }
  const service = await getActiveService(pool, biz.id, parseId(req.query.serviceId));
  const staffId = req.query.staffId === undefined || req.query.staffId === "" || req.query.staffId === "any" ? null : parseId(req.query.staffId);
  res.json(await freeSlots(pool, biz, service, date, staffId)); // only THIS business's data is loaded
});

publicRouter.post("/:slug/bookings", async (req, res) => {
  const biz = await getBusinessBySlug(pool, String(req.params.slug));
  const input = parseBody(publicBookingSchema, req.body);
  const today = nowInTimezone(biz.timezone, new Date()).date;
  if (input.date > addDays(today, biz.bookingWindowDays)) throw badRequest("That day is too far ahead to book.");
  const created = await withTransaction(async (client) => {
    const service = await getActiveService(client, biz.id, input.serviceId);
    let staffId = input.staffId;
    if (staffId === null) { // "anyone available": pick the person the engine assigns to that time
      const slots = await freeSlots(client, biz, service, input.date, null);
      staffId = slots.find((s) => s.startTime === input.startTime)?.staffId ?? null;
      if (staffId === null) throw conflict("That time was just taken. Please pick another.");
    }
    return insertBooking(client, {
      biz, service, staffId, date: input.date, startTime: input.startTime, customerName: input.name, customerPhone: input.phone,
      source: "online", notes: "", manual: false,
    });
  });
  await recordEvent(pool, biz.id, "booking_received");
  const row = await pool.query(`SELECT ${MANAGE_SELECT} ${MANAGE_FROM} WHERE b.id = $1`, [created.id]);
  const loaded = row.rows[0] as ManageRow;
  res.status(201).json({ manageToken: created.manageToken, booking: withRules(loaded) });
});

publicRouter.post("/:slug/queue", async (req, res) => {
  const biz = await getBusinessBySlug(pool, String(req.params.slug));
  const input = parseBody(queueJoinSchema, req.body);
  const entry = await addToQueue(pool, biz, input.name, input.phone, input.serviceId);
  res.status(201).json({ token: entry.token });
});
