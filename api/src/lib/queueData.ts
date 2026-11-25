import { randomBytes } from "node:crypto";
import { notFound } from "../errors.js";
import type { Db } from "./data.js";
import { estimateWaitMinutes, roundWaitToFive } from "./queue.js";
import { nowInTimezone } from "./time.js";

export async function addToQueue(db: Db, business: { id: number; timezone: string }, name: string, phone: string, serviceId: number): Promise<{ id: number; token: string }> {
  const svc = await db.query("SELECT 1 FROM services WHERE id = $1 AND business_id = $2 AND active", [serviceId, business.id]);
  if (!svc.rowCount) throw notFound("Service not found.");
  const now = nowInTimezone(business.timezone, new Date());
  const token = randomBytes(32).toString("hex");
  const r = await db.query<{ id: number }>(
    "INSERT INTO queue_entries (business_id, name, phone, service_id, status, joined_at, queue_token) VALUES ($1, $2, $3, $4, 'waiting', $5, $6) RETURNING id",
    [business.id, name, phone, serviceId, `${now.date} ${now.time}:${String(new Date().getSeconds()).padStart(2, "0")}`, token]);
  return { id: r.rows[0]!.id, token };
}

export interface QueueView { position: number | null; waitMinutes: number | null; }

/** Position (1-based) and estimated wait for one waiting entry. */
export async function queueView(db: Db, businessId: number, entryId: number): Promise<QueueView> {
  const waiting = await db.query<{ id: number; minutes: number }>(
    `SELECT q.id, sv.duration_minutes AS minutes FROM queue_entries q JOIN services sv ON sv.id = q.service_id
      WHERE q.business_id = $1 AND q.status = 'waiting' ORDER BY q.joined_at, q.id`, [businessId]);
  const index = waiting.rows.findIndex((w) => w.id === entryId);
  if (index === -1) return { position: null, waitMinutes: null };
  const chairs = await db.query<{ id: number }>("SELECT id FROM staff WHERE business_id = $1 AND active ORDER BY id", [businessId]);
  const busy = await db.query<{ staffId: number | null; minutes: number }>(
    `SELECT q.staff_id AS "staffId", sv.duration_minutes AS minutes FROM queue_entries q JOIN services sv ON sv.id = q.service_id
      WHERE q.business_id = $1 AND q.status = 'in_service'`, [businessId]);
  const chairBusy = chairs.rows.map((c) => busy.rows.find((b) => b.staffId === c.id)?.minutes ?? 0);
  for (const b of busy.rows.filter((x) => x.staffId === null)) { // unassigned: occupy the first free chair
    const free = chairBusy.indexOf(0);
    if (free !== -1) chairBusy[free] = b.minutes;
  }
  const wait = estimateWaitMinutes(waiting.rows.slice(0, index).map((w) => w.minutes), chairBusy);
  return { position: index + 1, waitMinutes: wait === null ? null : roundWaitToFive(wait) };
}
