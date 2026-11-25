import { Router } from "express";
import { pool } from "../db.js";
import { getBusinessById } from "../lib/data.js";
import { getAuth } from "../middleware/auth.js";
import { parseBody } from "../middleware/validate.js";
import { settingsSchema } from "../schemas.js";

export const settingsRouter = Router();

settingsRouter.get("/", async (req, res) => {
  res.json(await getBusinessById(pool, getAuth(req).businessId));
});

// Fixed whitelist: column names in SQL come only from here.
const COLUMNS = { name: "name", slotStepMinutes: "slot_step_minutes", leadMinutes: "lead_minutes", bufferMinutes: "buffer_minutes",
  bookingWindowDays: "booking_window_days", cancelCutoffHours: "cancel_cutoff_hours" } as const;

settingsRouter.patch("/", async (req, res) => {
  const { businessId } = getAuth(req);
  const input = parseBody(settingsSchema, req.body);
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]) {
    const v = input[key];
    if (v === undefined) continue;
    values.push(v);
    sets.push(`${COLUMNS[key]} = $${values.length}`);
  }
  values.push(businessId);
  await pool.query(`UPDATE businesses SET ${sets.join(", ")} WHERE id = $${values.length}`, values);
  res.json(await getBusinessById(pool, businessId));
});
