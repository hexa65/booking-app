import type { TimelineBlock, TimelineInput, TimelineRange } from "../types/calendar";
import type { LocalNow } from "./time";
import { minutesToTime, timeToMinutes } from "./time";

/** The visible hours: the shop's opening hours, widened (to whole hours) if a booking falls outside them. */
export function timelineRange(items: { startTime: string; endTime: string }[], open = "09:00", close = "19:00"): TimelineRange {
  let lo = timeToMinutes(open);
  let hi = timeToMinutes(close);
  for (const i of items) { lo = Math.min(lo, timeToMinutes(i.startTime)); hi = Math.max(hi, timeToMinutes(i.endTime)); }
  return { openMinutes: Math.floor(lo / 60) * 60, closeMinutes: Math.min(1439, Math.ceil(hi / 60) * 60) };
}

/** Bookings become blocks measured in quarter-hours. Cancelled bookings free their time, so they get no block. */
export function layoutBlocks(items: TimelineInput[], range: TimelineRange): TimelineBlock[] {
  return items
    .filter((i) => i.status !== "cancelled")
    .map((i) => {
      const start = Math.max(timeToMinutes(i.startTime), range.openMinutes);
      const end = Math.min(timeToMinutes(i.endTime), range.closeMinutes);
      return { id: i.id, staffId: i.staffId, startQuarter: (start - range.openMinutes) / 15,
        spanQuarters: Math.max(1, (end - start) / 15), startTime: i.startTime, endTime: i.endTime, status: i.status };
    })
    .sort((a, b) => a.startQuarter - b.startQuarter || a.id - b.id);
}

/** Where the "now" line sits, in quarter-hours from the top, or null when it is not today or outside the range. */
export function nowQuarter(now: LocalNow, date: string, range: TimelineRange): number | null {
  if (now.date !== date) return null;
  const m = timeToMinutes(now.time);
  if (m < range.openMinutes || m > range.closeMinutes) return null;
  return (m - range.openMinutes) / 15;
}

export function hourMarks(range: TimelineRange): { time: string; quarter: number }[] {
  const marks: { time: string; quarter: number }[] = [];
  for (let m = range.openMinutes; m < range.closeMinutes; m += 60) marks.push({ time: minutesToTime(m), quarter: (m - range.openMinutes) / 15 });
  return marks;
}

export function totalQuarters(range: TimelineRange): number { return (range.closeMinutes - range.openMinutes) / 15; }
