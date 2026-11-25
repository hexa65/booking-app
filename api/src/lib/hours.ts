import { timeToMinutes } from "./time.js";

export interface IntervalInput { weekday: number; startTime: string; endTime: string; }

/** Returns a plain-language problem, or null when the week is fine. Several intervals per day = breaks. */
export function validateIntervals(list: IntervalInput[]): string | null {
  const byDay = new Map<number, { s: number; e: number }[]>();
  for (const it of list) {
    if (!Number.isInteger(it.weekday) || it.weekday < 1 || it.weekday > 7) return "Weekday must be 1 (Monday) to 7 (Sunday).";
    let s: number;
    let e: number;
    try { s = timeToMinutes(it.startTime); e = timeToMinutes(it.endTime); } catch { return "Use times like 09:00."; }
    if (e <= s) return "Each interval must end after it starts.";
    const day = byDay.get(it.weekday) ?? [];
    if (day.some((o) => s < o.e && o.s < e)) return "Two intervals on the same day overlap.";
    day.push({ s, e });
    byDay.set(it.weekday, day);
  }
  return null;
}
