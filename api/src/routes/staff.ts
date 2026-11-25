import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import type { Db } from "../lib/data.js";
import { badRequest, notFound } from "../errors.js";
import { validateIntervals } from "../lib/hours.js";
import { getAuth } from "../middleware/auth.js";
import { parseBody, parseId } from "../middleware/validate.js";
import { createStaffSchema, hoursSchema, timeOffSchema, updateStaffSchema } from "../schemas.js";

export const staffRouter = Router();

const STAFF_SELECT = `SELECT s.id, s.name, s.active, COALESCE(array_agg(ss.service_id ORDER BY ss.service_id) FILTER (WHERE ss.service_id IS NOT NULL), '{}') AS "serviceIds"
  FROM staff s LEFT JOIN staff_services ss ON ss.staff_id = s.id`;

async function assertStaff(db: Db, businessId: number, staffId: number): Promise<void> {
  const r = await db.query("SELECT 1 FROM staff WHERE id = $1 AND business_id = $2", [staffId, businessId]);
  if (!r.rowCount) throw notFound("Staff member not found.");
}
async function assertServices(db: Db, businessId: number, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const r = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM services WHERE business_id = $1 AND id = ANY($2::int[])", [businessId, ids]);
  if (r.rows[0]?.n !== new Set(ids).size) throw badRequest("One of the selected services does not exist.");
}
async function setServices(db: Db, businessId: number, staffId: number, ids: number[]): Promise<void> {
  await db.query("DELETE FROM staff_services WHERE staff_id = $1 AND business_id = $2", [staffId, businessId]);
  for (const serviceId of new Set(ids)) {
    await db.query("INSERT INTO staff_services (business_id, staff_id, service_id) VALUES ($1, $2, $3)", [businessId, staffId, serviceId]);
  }
}
async function readOne(db: Db, businessId: number, staffId: number): Promise<unknown> {
  const r = await db.query(`${STAFF_SELECT} WHERE s.id = $1 AND s.business_id = $2 GROUP BY s.id`, [staffId, businessId]);
  if (!r.rows[0]) throw notFound("Staff member not found.");
  return r.rows[0];
}

staffRouter.get("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const r = await pool.query(`${STAFF_SELECT} WHERE s.business_id = $1 GROUP BY s.id ORDER BY s.active DESC, s.name`, [businessId]);
  res.json(r.rows);
});

staffRouter.post("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const input = parseBody(createStaffSchema, req.body);
  const created = await withTransaction(async (client) => {
    await assertServices(client, businessId, input.serviceIds);
    const r = await client.query<{ id: number }>("INSERT INTO staff (business_id, name, active) VALUES ($1, $2, $3) RETURNING id", [businessId, input.name, input.active ?? true]);
    const staffId = r.rows[0]!.id;
    await setServices(client, businessId, staffId, input.serviceIds);
    return readOne(client, businessId, staffId);
  });
  res.status(201).json(created);
});

staffRouter.patch("/:id", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const input = parseBody(updateStaffSchema, req.body);
  const updated = await withTransaction(async (client) => {
    await assertStaff(client, businessId, id);
    if (input.serviceIds) { await assertServices(client, businessId, input.serviceIds); await setServices(client, businessId, id, input.serviceIds); }
    if (input.name !== undefined) await client.query("UPDATE staff SET name = $1 WHERE id = $2 AND business_id = $3", [input.name, id, businessId]);
    if (input.active !== undefined) await client.query("UPDATE staff SET active = $1 WHERE id = $2 AND business_id = $3", [input.active, id, businessId]);
    return readOne(client, businessId, id);
  });
  res.json(updated);
});

// Working hours: the whole week is replaced at once, so the editor and the database always agree.
staffRouter.get("/:id/hours", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  await assertStaff(pool, businessId, id);
  const r = await pool.query(
    `SELECT id, staff_id AS "staffId", weekday, to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime"
       FROM working_hours WHERE staff_id = $1 AND business_id = $2 ORDER BY weekday, start_time`, [id, businessId]);
  res.json(r.rows);
});
staffRouter.put("/:id/hours", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const input = parseBody(hoursSchema, req.body);
  const problem = validateIntervals(input.intervals);
  if (problem) throw badRequest(problem);
  await withTransaction(async (client) => {
    await assertStaff(client, businessId, id);
    await client.query("DELETE FROM working_hours WHERE staff_id = $1 AND business_id = $2", [id, businessId]);
    for (const i of input.intervals) {
      await client.query("INSERT INTO working_hours (business_id, staff_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4, $5)", [businessId, id, i.weekday, i.startTime, i.endTime]);
    }
  });
  const r = await pool.query(
    `SELECT id, staff_id AS "staffId", weekday, to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime"
       FROM working_hours WHERE staff_id = $1 AND business_id = $2 ORDER BY weekday, start_time`, [id, businessId]);
  res.json(r.rows);
});

const TIME_OFF = `id, staff_id AS "staffId", date_from AS "dateFrom", date_to AS "dateTo", reason`;
staffRouter.get("/:id/time-off", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  await assertStaff(pool, businessId, id);
  const r = await pool.query(`SELECT ${TIME_OFF} FROM time_off WHERE staff_id = $1 AND business_id = $2 ORDER BY date_from DESC`, [id, businessId]);
  res.json(r.rows);
});
staffRouter.post("/:id/time-off", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const input = parseBody(timeOffSchema, req.body);
  await assertStaff(pool, businessId, id);
  const r = await pool.query(`INSERT INTO time_off (business_id, staff_id, date_from, date_to, reason) VALUES ($1, $2, $3, $4, $5) RETURNING ${TIME_OFF}`,
    [businessId, id, input.dateFrom, input.dateTo, input.reason]);
  res.status(201).json(r.rows[0]);
});
staffRouter.delete("/:id/time-off/:offId", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const offId = parseId(req.params.offId);
  const r = await pool.query("DELETE FROM time_off WHERE id = $1 AND staff_id = $2 AND business_id = $3", [offId, id, businessId]);
  if (!r.rowCount) throw notFound("Time off not found.");
  res.json({ deleted: true });
});
