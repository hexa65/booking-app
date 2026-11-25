import { z } from "zod";
import { isValidDate } from "./lib/time.js";
import { normalizePhone } from "./lib/phone.js";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
const date = z.string().refine(isValidDate, "Use a date like 2026-11-24.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 09:30.");
const id = z.number().int().min(1);
const phone = z.string().max(30).transform((value, ctx) => {
  const normalized = normalizePhone(value);
  if (normalized === null) { ctx.addIssue({ code: "custom", message: "Enter a valid phone number, like 0801 234 5678." }); return z.NEVER; }
  return normalized;
});
const personName = z.string().trim().min(1, "Enter a name.").max(80);

export const registerSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short.").max(80, "Business name is too long."),
  email,
  password: z.string().min(8, "Password must be at least 8 characters.").max(100, "Password is too long."),
});
export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(100) });

const serviceFields = z.object({
  name: z.string().trim().min(1, "Service name is required.").max(80),
  durationMinutes: z.number().int("Duration must be whole minutes.").min(5).max(480),
  priceMinor: z.number().int("Price must be in whole kobo.").min(0).max(2_147_483_647),
  active: z.boolean().optional(),
});
export const createServiceSchema = serviceFields;
export const updateServiceSchema = serviceFields.partial().refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const createStaffSchema = z.object({ name: personName, active: z.boolean().optional(), serviceIds: z.array(id).max(50).default([]) });
export const updateStaffSchema = z.object({ name: personName.optional(), active: z.boolean().optional(), serviceIds: z.array(id).max(50).optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");
export const hoursSchema = z.object({ intervals: z.array(z.object({ weekday: z.number().int().min(1).max(7), startTime: time, endTime: time })).max(70) });
export const timeOffSchema = z.object({ dateFrom: date, dateTo: date, reason: z.string().trim().max(120).default("") })
  .refine((v) => v.dateTo >= v.dateFrom, "The last day cannot be before the first day.");

export const manualBookingSchema = z.object({
  serviceId: id, staffId: id, date, startTime: time, customerName: personName, customerPhone: phone,
  source: z.enum(["manual", "walk_in"]).default("manual"), notes: z.string().trim().max(300).default(""),
});
export const bookingPatchSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled", "no_show"]).optional(),
  notes: z.string().trim().max(300).optional(),
  move: z.object({ date, startTime: time, staffId: id.optional() }).optional(),
}).refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const publicBookingSchema = z.object({
  serviceId: id, staffId: id.nullable(), date, startTime: time, name: personName, phone,
  consent: z.literal(true, { errorMap: () => ({ message: "Please agree so we can save your details." }) }),
});
export const rescheduleSchema = z.object({ date, startTime: time });
export const queueJoinSchema = z.object({
  name: personName, phone, serviceId: id, consent: z.literal(true, { errorMap: () => ({ message: "Please agree so we can save your details." }) }),
});
export const queuePatchSchema = z.object({ status: z.enum(["waiting", "in_service", "done", "left"]).optional(), staffId: id.nullable().optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");
export const callNextSchema = z.object({ staffId: id.nullable().optional() });
export const ownerQueueSchema = z.object({ name: personName, phone: z.string().max(30).default(""), serviceId: id });

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slotStepMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(60)]).optional(),
  leadMinutes: z.number().int().min(0).max(1440).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  bookingWindowDays: z.number().int().min(1).max(365).optional(),
  cancelCutoffHours: z.number().int().min(0).max(168).optional(),
}).refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const customerPatchSchema = z.object({ notes: z.string().trim().max(500) });
export const dateRangeQuery = z.object({ from: date.optional(), to: date.optional() });
