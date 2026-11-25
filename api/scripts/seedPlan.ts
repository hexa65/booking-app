import { addDays, addMinutes, isoWeekday, minutesToTime, timeToMinutes } from "../src/lib/time.js";
import type { BookingSource, BookingStatus } from "../src/types.js";

export interface PlanBooking {
  staffName: string; serviceName: string; customerIndex: number;
  date: string; startTime: string; endTime: string;
  status: BookingStatus; source: BookingSource; priceMinor: number;
}
export interface PlanHours { staffName: string; weekday: number; startTime: string; endTime: string; }

// Prices in KOBO.
export const SERVICES = [
  { name: "Haircut", durationMinutes: 40, priceMinor: 300000 },
  { name: "Haircut and beard", durationMinutes: 60, priceMinor: 450000 },
  { name: "Beard trim", durationMinutes: 20, priceMinor: 150000 },
  { name: "Kids haircut", durationMinutes: 30, priceMinor: 200000 },
  { name: "Wash and style", durationMinutes: 45, priceMinor: 250000 },
  { name: "Hair dye", durationMinutes: 90, priceMinor: 600000 },
] as const;

// Only Amaka offers "Wash and style" and "Hair dye". Everyone offers at least 4 services.
export const STAFF_SERVICES: Record<string, string[]> = {
  Tunde: ["Haircut", "Haircut and beard", "Beard trim", "Kids haircut"],
  Amaka: ["Haircut", "Haircut and beard", "Beard trim", "Kids haircut", "Wash and style", "Hair dye"],
  Ibrahim: ["Haircut", "Haircut and beard", "Beard trim", "Kids haircut"],
};
const STAFF = Object.keys(STAFF_SERVICES);

export const CUSTOMERS = [
  "Emeka Okafor", "Ngozi Eze", "Bayo Adeyemi", "Chidi Nwosu", "Fatima Bello", "Segun Balogun",
  "Amina Yusuf", "Kelechi Obi", "Tolu Ajayi", "Ifeoma Nnadi", "Musa Danjuma", "Yetunde Lawal",
].map((name, i) => ({ name, phone: `+23480${10000001 + i}` })); // fake numbers

// Monday to Saturday 09:00-19:00. Tunde has lunch 13:00-14:00 (two intervals).
// Ibrahim has NO intervals on Wednesdays (his day off). Sunday is closed for everyone.
export function buildHours(): PlanHours[] {
  const rows: PlanHours[] = [];
  for (const staffName of STAFF) {
    for (let weekday = 1; weekday <= 6; weekday++) {
      if (staffName === "Ibrahim" && weekday === 3) continue;
      if (staffName === "Tunde") {
        rows.push({ staffName, weekday, startTime: "09:00", endTime: "13:00" });
        rows.push({ staffName, weekday, startTime: "14:00", endTime: "19:00" });
      } else rows.push({ staffName, weekday, startTime: "09:00", endTime: "19:00" });
    }
  }
  return rows;
}

export function buildSeedPlan(today: string): { bookings: PlanBooking[]; hours: PlanHours[] } {
  const hours = buildHours();
  const placed: PlanBooking[] = [];

  function place(date: string, start: string, serviceName: string, rotate: number,
                 status: BookingStatus, source: BookingSource, customerIndex: number): void {
    const svc = SERVICES.find((s) => s.name === serviceName);
    if (!svc) throw new Error(`Unknown service ${serviceName}`);
    const end = addMinutes(start, svc.durationMinutes);
    const weekday = isoWeekday(date);
    for (let k = 0; k < STAFF.length; k++) {
      const staffName = STAFF[(rotate + k) % STAFF.length]!;
      if (!STAFF_SERVICES[staffName]!.includes(serviceName)) continue;
      // Sunday is closed; on a Sunday the demo data ignores opening hours so the seed still runs.
      const works = weekday === 7 || hours.some((h) => h.staffName === staffName && h.weekday === weekday &&
        timeToMinutes(h.startTime) <= timeToMinutes(start) && timeToMinutes(end) <= timeToMinutes(h.endTime));
      if (!works) continue;
      const clash = placed.some((b) => b.staffName === staffName && b.status !== "cancelled" && b.date === date &&
        timeToMinutes(start) < timeToMinutes(b.endTime) && timeToMinutes(b.startTime) < timeToMinutes(end));
      if (clash) continue;
      placed.push({ staffName, serviceName, customerIndex, date, startTime: start, endTime: end, status, source, priceMinor: svc.priceMinor });
      return;
    }
    throw new Error(`No free staff for ${serviceName} on ${date} at ${start}`);
  }

  // PAST: 12 open days x 2 bookings = 24. Statuses: 19 completed, 3 no_show, 2 cancelled.
  const pastDays: string[] = [];
  for (let off = 1; off <= 14; off++) {
    const d = addDays(today, -off);
    if (isoWeekday(d) !== 7) pastDays.push(d);
  }
  const noShowCustomers: Record<number, number> = { 3: 0, 10: 0, 17: 1 }; // customer 0 twice, customer 1 once
  let i = 0;
  for (const date of pastDays.slice(0, 12)) {
    for (const [start, service] of [["10:00", "Haircut"], ["15:00", "Haircut and beard"]] as const) {
      const status: BookingStatus = i in noShowCustomers ? "no_show" : i === 6 || i === 20 ? "cancelled" : "completed";
      place(date, start, service, i, status, i % 3 === 0 ? "manual" : "online", noShowCustomers[i] ?? i % 12);
      i++;
    }
  }

  // TODAY: 6 confirmed. TOMORROW: 5 confirmed.
  const todayPlan = [["09:00", "Haircut"], ["10:30", "Haircut and beard"], ["12:00", "Beard trim"],
    ["14:00", "Kids haircut"], ["15:30", "Haircut"], ["17:00", "Beard trim"]] as const;
  todayPlan.forEach(([t, s], n) => place(today, t, s, n, "confirmed", n % 2 ? "manual" : "online", (n + 2) % 12));
  const tomorrowPlan = [["09:30", "Haircut"], ["11:00", "Wash and style"], ["13:30", "Haircut"],
    ["15:00", "Hair dye"], ["16:30", "Beard trim"]] as const;
  tomorrowPlan.forEach(([t, s], n) => place(addDays(today, 1), t, s, n, "confirmed", "online", (n + 5) % 12));

  void minutesToTime;
  return { bookings: placed, hours };
}
