import { formatNaira as formatNairaApi } from "./money";
import { isoWeekday } from "./time";

export const formatNaira = formatNairaApi;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parts(date: string): { month: number; day: number } {
  const [, m, d] = date.split("-");
  return { month: Number(m) - 1, day: Number(d) };
}
/** "2026-11-24" -> "Tuesday 24 November" (no Date parsing, so no off-by-one-day bugs) */
export function formatDateLong(date: string): string {
  const { month, day } = parts(date);
  return `${DAYS[isoWeekday(date) - 1] ?? ""} ${day} ${MONTHS[month] ?? ""}`;
}
/** "2026-11-24" -> "Tue 24 Nov" */
export function formatDayShort(date: string): string {
  const { month, day } = parts(date);
  return `${(DAYS[isoWeekday(date) - 1] ?? "").slice(0, 3)} ${day} ${(MONTHS[month] ?? "").slice(0, 3)}`;
}
/** "14:05" -> "2:05 pm" */
export function formatClock(time: string): string {
  const [h, m] = time.split(":");
  const hour = Number(h);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour < 12 ? "am" : "pm"}`;
}
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
