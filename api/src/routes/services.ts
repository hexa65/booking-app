import { Router } from "express";
import { pool } from "../db.js";
import { notFound } from "../errors.js";
import { recordEvent } from "../lib/data.js";
import { getAuth } from "../middleware/auth.js";
import { parseBody, parseId } from "../middleware/validate.js";
import { createServiceSchema, updateServiceSchema } from "../schemas.js";

export const servicesRouter = Router();

const COLUMNS = `id, name, duration_minutes AS "durationMinutes", price_minor AS "priceMinor", active`;
// Column names in SQL text come ONLY from this fixed list. Values always go in parameters.
const UPDATABLE = { name: "name", durationMinutes: "duration_minutes", priceMinor: "price_minor", active: "active" } as const;

servicesRouter.get("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const r = await pool.query(`SELECT ${COLUMNS} FROM services WHERE business_id = $1 ORDER BY active DESC, name`, [businessId]);
  res.json(r.rows);
});

servicesRouter.post("/", async (req, res) => {
  const { businessId } = getAuth(req); // from the verified token. A businessId in the body is ignored.
  const input = parseBody(createServiceSchema, req.body);
  const r = await pool.query(
    `INSERT INTO services (business_id, name, duration_minutes, price_minor, active) VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
    [businessId, input.name, input.durationMinutes, input.priceMinor, input.active ?? true]);
  await recordEvent(pool, businessId, "first_service_added");
  res.status(201).json(r.rows[0]);
});

servicesRouter.patch("/:id", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const input = parseBody(updateServiceSchema, req.body);
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(UPDATABLE) as (keyof typeof UPDATABLE)[]) {
    const value = input[key];
    if (value === undefined) continue;
    values.push(value);
    sets.push(`${UPDATABLE[key]} = $${values.length}`);
  }
  values.push(id, businessId);
  const r = await pool.query(
    `UPDATE services SET ${sets.join(", ")} WHERE id = $${values.length - 1} AND business_id = $${values.length} RETURNING ${COLUMNS}`, values);
  if (!r.rows[0]) throw notFound("Service not found."); // another business's id gives the same 404
  res.json(r.rows[0]);
});

servicesRouter.delete("/:id", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const owned = await pool.query("SELECT 1 FROM services WHERE id = $1 AND business_id = $2", [id, businessId]);
  if (!owned.rowCount) throw notFound("Service not found.");
  const used = await pool.query("SELECT 1 FROM bookings WHERE service_id = $1 AND business_id = $2 LIMIT 1", [id, businessId]);
  if (used.rowCount) {
    // History must not break: a service with bookings is switched off, not deleted.
    await pool.query("UPDATE services SET active = FALSE WHERE id = $1 AND business_id = $2", [id, businessId]);
    res.json({ deactivated: true });
    return;
  }
  await pool.query("DELETE FROM services WHERE id = $1 AND business_id = $2", [id, businessId]);
  res.json({ deleted: true });
});
