import type { Booking, SlotOption, TimeOff, WorkingInterval } from "../types.js";
import { isoWeekday, minutesToTime, timeToMinutes } from "./time.js";
import type { LocalNow } from "./time.js";

export interface StaffDay {
  staffId: number;
  serviceIds: number[];
  hours: WorkingInterval[];                                      // all intervals, any weekday
  timeOff: TimeOff[];
  bookings: Pick<Booking, "startTime" | "endTime" | "status">[]; // bookings on the requested date
}

export interface SlotInput {
  date: string;
  now: LocalNow;            // passed in, so tests never depend on the real clock
  serviceId: number;
  durationMinutes: number;
  stepMinutes: number;
  leadMinutes: number;      // customers cannot book starting sooner than now + lead
  bufferMinutes: number;    // cleaning time kept free AFTER each existing booking
  staff: StaffDay[];
  staffId: number | null;   // null = "anyone available"
}

/** The slot engine: pure, no database, no clock. Returns the free start times. */
export function computeSlots(input: SlotInput): SlotOption[] {
  if (input.date < input.now.date) return [];
  const weekday = isoWeekday(input.date);
  const earliest = input.date === input.now.date ? timeToMinutes(input.now.time) + input.leadMinutes : 0;
  const step = input.stepMinutes;

  const perStaff: { staffId: number; load: number; times: number[] }[] = [];
  for (const s of input.staff) {
    if (input.staffId !== null && s.staffId !== input.staffId) continue;
    if (!s.serviceIds.includes(input.serviceId)) continue;
    if (s.timeOff.some((t) => t.dateFrom <= input.date && input.date <= t.dateTo)) continue;

    const busy = s.bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) + input.bufferMinutes }));

    const found = new Set<number>();
    for (const h of s.hours) {
      if (h.weekday !== weekday) continue;
      const open = timeToMinutes(h.startTime);
      const close = timeToMinutes(h.endTime);
      for (let t = Math.ceil(open / step) * step; t + input.durationMinutes <= close; t += step) {
        if (t < earliest) continue;
        const end = t + input.durationMinutes;
        if (busy.some((b) => t < b.end && b.start < end)) continue;
        found.add(t);
      }
    }
    perStaff.push({ staffId: s.staffId, load: busy.length, times: [...found].sort((a, b) => a - b) });
  }

  if (input.staffId !== null) {
    return perStaff
      .flatMap((p) => p.times.map((t) => ({ startTime: minutesToTime(t), staffId: p.staffId })))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // "Anyone available": each time once, given to the least busy person (ties: lowest id).
  const best = new Map<number, { staffId: number; load: number }>();
  for (const p of perStaff) {
    for (const t of p.times) {
      const cur = best.get(t);
      if (!cur || p.load < cur.load || (p.load === cur.load && p.staffId < cur.staffId)) {
        best.set(t, { staffId: p.staffId, load: p.load });
      }
    }
  }
  return [...best.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ startTime: minutesToTime(t), staffId: v.staffId }));
}
