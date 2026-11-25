// Pure time helpers. Times are "HH:MM" text, dates are "YYYY-MM-DD" text. No timezone maths here.
export interface LocalNow { date: string; time: string; }

export function timeToMinutes(t: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  if (!m) throw new Error(`Invalid time: ${t}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(total: number): string {
  if (!Number.isInteger(total) || total < 0 || total > 1439) throw new Error(`Minutes out of range: ${total}`);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(t: string, minutes: number): string {
  return minutesToTime(timeToMinutes(t) + minutes);
}

/** Half-open ranges: [aStart, aEnd) and [bStart, bEnd). Touching ends do NOT overlap. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function parseDate(d: string): { y: number; m: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!match) throw new Error(`Invalid date: ${d}`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, day));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== day) {
    throw new Error(`Invalid date: ${d}`);
  }
  return { y, m, day };
}

export function isValidDate(d: string): boolean {
  try { parseDate(d); return true; } catch { return false; }
}

/** 1 = Monday ... 7 = Sunday. The ONLY place that translates JavaScript's 0 = Sunday. */
export function isoWeekday(d: string): number {
  const { y, m, day } = parseDate(d);
  const js = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return js === 0 ? 7 : js;
}

export function addDays(d: string, n: number): string {
  const { y, m, day } = parseDate(d);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

/** What is "now" on the wall clock of a business in this IANA timezone? */
export function nowInTimezone(timezone: string, instant: Date): LocalNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Minutes from (dateA timeA) to (dateB timeB) on the same wall clock. Negative when B is earlier. */
export function minutesBetween(dateA: string, timeA: string, dateB: string, timeB: string): number {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  const days = (Date.UTC(b.y, b.m - 1, b.day) - Date.UTC(a.y, a.m - 1, a.day)) / 86_400_000;
  return days * 1440 + (timeToMinutes(timeB) - timeToMinutes(timeA));
}
