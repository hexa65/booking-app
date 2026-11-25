import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import { notFound } from "../errors.js";
import { getBusinessById } from "../lib/data.js";
import { addToQueue } from "../lib/queueData.js";
import { getAuth } from "../middleware/auth.js";
import { parseBody, parseId } from "../middleware/validate.js";
import { callNextSchema, ownerQueueSchema, queuePatchSchema } from "../schemas.js";

export const queueRouter = Router();

const SELECT = `q.id, q.name, q.phone, q.service_id AS "serviceId", q.staff_id AS "staffId", q.status,
  to_char(q.joined_at, 'YYYY-MM-DD HH24:MI:SS') AS "joinedAt", sv.name AS "serviceName", sv.duration_minutes AS "durationMinutes"`;

queueRouter.get("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const r = await pool.query(
    `SELECT ${SELECT} FROM queue_entries q JOIN services sv ON sv.id = q.service_id
      WHERE q.business_id = $1 AND q.status IN ('waiting', 'in_service') ORDER BY q.joined_at, q.id`, [businessId]);
  res.json(r.rows);
});

queueRouter.post("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const input = parseBody(ownerQueueSchema, req.body);
  const biz = await getBusinessById(pool, businessId);
  await addToQueue(pool, biz, input.name, input.phone, input.serviceId);
  res.status(201).json({ ok: true });
});

// Declared before "/:id" so "call-next" is never read as an id.
queueRouter.post("/call-next", async (req, res) => {
  const { businessId } = getAuth(req);
  const input = parseBody(callNextSchema, req.body);
  const entry = await withTransaction(async (client) => {
    // SKIP LOCKED: two owners tapping at once never call the same person.
    const next = await client.query<{ id: number }>(
      "SELECT id FROM queue_entries WHERE business_id = $1 AND status = 'waiting' ORDER BY joined_at, id LIMIT 1 FOR UPDATE SKIP LOCKED", [businessId]);
    if (!next.rows[0]) throw notFound("Nobody is waiting.");
    await client.query("UPDATE queue_entries SET status = 'in_service', staff_id = $1 WHERE id = $2 AND business_id = $3", [input.staffId ?? null, next.rows[0].id, businessId]);
    const r = await client.query(`SELECT ${SELECT} FROM queue_entries q JOIN services sv ON sv.id = q.service_id WHERE q.id = $1 AND q.business_id = $2`, [next.rows[0].id, businessId]);
    return r.rows[0];
  });
  res.json(entry);
});

queueRouter.patch("/:id", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const input = parseBody(queuePatchSchema, req.body);
  const own = await pool.query("SELECT 1 FROM queue_entries WHERE id = $1 AND business_id = $2", [id, businessId]);
  if (!own.rowCount) throw notFound("Queue entry not found.");
  if (input.status !== undefined) await pool.query("UPDATE queue_entries SET status = $1 WHERE id = $2 AND business_id = $3", [input.status, id, businessId]);
  if (input.staffId !== undefined) await pool.query("UPDATE queue_entries SET staff_id = $1 WHERE id = $2 AND business_id = $3", [input.staffId, id, businessId]);
  const r = await pool.query(`SELECT ${SELECT} FROM queue_entries q JOIN services sv ON sv.id = q.service_id WHERE q.id = $1 AND q.business_id = $2`, [id, businessId]);
  res.json(r.rows[0]);
});
