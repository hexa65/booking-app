import { Router } from "express";
import { pool } from "../db.js";
import { notFound } from "../errors.js";
import { getAuth } from "../middleware/auth.js";
import { parseBody, parseId } from "../middleware/validate.js";
import { customerPatchSchema } from "../schemas.js";

export const customersRouter = Router();

const SELECT = `SELECT c.id, c.name, c.phone, c.notes,
    count(b.id) FILTER (WHERE b.status = 'completed')::int AS "visitCount",
    count(b.id) FILTER (WHERE b.status = 'no_show')::int AS "noShowCount",
    max(to_char(b.starts_at, 'YYYY-MM-DD')) FILTER (WHERE b.status = 'completed') AS "lastVisitDate"
  FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id AND b.business_id = c.business_id`;

customersRouter.get("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 60) : "";
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const r = await pool.query(`${SELECT} WHERE c.business_id = $1 AND ($2 = '' OR c.name ILIKE $3 OR c.phone LIKE $3) GROUP BY c.id ORDER BY c.name LIMIT 500`, [businessId, q, like]);
  res.json(r.rows);
});

customersRouter.patch("/:id", async (req, res) => {
  const { businessId } = getAuth(req);
  const id = parseId(req.params.id);
  const input = parseBody(customerPatchSchema, req.body);
  const upd = await pool.query("UPDATE customers SET notes = $1 WHERE id = $2 AND business_id = $3", [input.notes, id, businessId]);
  if (!upd.rowCount) throw notFound("Client not found.");
  const r = await pool.query(`${SELECT} WHERE c.id = $1 AND c.business_id = $2 GROUP BY c.id`, [id, businessId]);
  res.json(r.rows[0]);
});
