import { Router } from "express";
import { pool } from "../db.js";
import { getBusinessById } from "../lib/data.js";
import { addDays, nowInTimezone } from "../lib/time.js";
import { getAuth } from "../middleware/auth.js";

export const statsRouter = Router();

function dateParam(v: unknown): string | null { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; }

statsRouter.get("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const biz = await getBusinessById(pool, businessId);
  const today = nowInTimezone(biz.timezone, new Date()).date;
  const to = dateParam(req.query.to) ?? today;
  const from = dateParam(req.query.from) ?? addDays(to, -29);
  const range = [businessId, from, to];
  const where = "business_id = $1 AND starts_at >= $2::date AND starts_at < $3::date + 1";

  const perDay = await pool.query<{ date: string; bookings: number }>(
    `SELECT to_char(starts_at, 'YYYY-MM-DD') AS date, count(*)::int AS bookings FROM bookings WHERE ${where} AND status <> 'cancelled' GROUP BY 1 ORDER BY 1`, range);
  const totals = await pool.query<{ completed: number; noShow: number; cancelled: number; revenueMinor: string }>(
    `SELECT count(*) FILTER (WHERE status = 'completed')::int AS completed, count(*) FILTER (WHERE status = 'no_show')::int AS "noShow",
            count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
            COALESCE(sum(price_minor) FILTER (WHERE status = 'completed'), 0)::bigint AS "revenueMinor"
       FROM bookings WHERE ${where}`, range);
  const hoursRows = await pool.query<{ hour: number; bookings: number }>(
    `SELECT extract(hour FROM starts_at)::int AS hour, count(*)::int AS bookings FROM bookings WHERE ${where} AND status <> 'cancelled' GROUP BY 1 ORDER BY 1`, range);
  const repeat = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM (SELECT customer_id FROM bookings WHERE ${where} AND status = 'completed' GROUP BY customer_id HAVING count(*) >= 2) t`, range);

  const t = totals.rows[0]!;
  const denominator = t.completed + t.noShow; // cancelled bookings are excluded from the no-show rate
  res.json({
    from, to, perDay: perDay.rows, completed: t.completed, noShow: t.noShow, cancelled: t.cancelled,
    noShowRate: denominator === 0 ? null : t.noShow / denominator,
    revenueMinor: Number(t.revenueMinor), busiestHours: hoursRows.rows, repeatCustomers: repeat.rows[0]?.n ?? 0,
  });
});

// Pilot metrics: did the owner get set up, and are bookings still coming in each week?
statsRouter.get("/pilot", async (req, res) => {
  const { businessId } = getAuth(req);
  const milestones = await pool.query<{ name: string; at: string }>(
    "SELECT name, to_char(min(created_at), 'YYYY-MM-DD HH24:MI') AS at FROM events WHERE business_id = $1 GROUP BY name", [businessId]);
  const weekly = await pool.query<{ week: string; bookings: number }>(
    `SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week, count(*)::int AS bookings
       FROM events WHERE business_id = $1 AND name = 'booking_received' GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, [businessId]);
  res.json({ milestones: milestones.rows, bookingsPerWeek: weekly.rows });
});
