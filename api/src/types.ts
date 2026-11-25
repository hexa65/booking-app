// The API keeps its own copy of the shared types (the web folder has another). Honest duplication.
export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";
export type BookingSource = "online" | "manual" | "walk_in";
export interface Service { id: number; name: string; durationMinutes: number; priceMinor: number; active: boolean; }
export interface Staff { id: number; name: string; active: boolean; serviceIds: number[]; }
export interface WorkingInterval { id: number; staffId: number; weekday: number; startTime: string; endTime: string; }
export interface TimeOff { id: number; staffId: number; dateFrom: string; dateTo: string; reason: string; }
export interface Customer { id: number; name: string; phone: string; notes: string; }
export interface Booking {
  id: number; staffId: number; serviceId: number; customerId: number;
  date: string; startTime: string; endTime: string;
  status: BookingStatus; source: BookingSource; priceMinor: number; notes: string;
}
export interface SlotOption { startTime: string; staffId: number; }
export type QueueStatus = "waiting" | "in_service" | "done" | "left";
