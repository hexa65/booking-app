import type { Booking, BookingRow, BookingSource, BookingStatus, CustomerWithStats, Stats } from "../types";
import { api } from "./api";

export interface ManualBookingInput {
  serviceId: number; staffId: number; date: string; startTime: string; customerName: string; customerPhone: string;
  source: Exclude<BookingSource, "online">; notes: string;
}
export interface BookingPatch { status?: BookingStatus; notes?: string; move?: { date: string; startTime: string; staffId?: number }; }
export const bookingsService = {
  list: async (from: string, to: string, staffId: number | null, status: string | null): Promise<BookingRow[]> =>
    (await api.get<BookingRow[]>("/bookings", { params: { from, to, ...(staffId !== null ? { staffId } : {}), ...(status ? { status } : {}) } })).data,
  create: async (input: ManualBookingInput): Promise<Booking> => (await api.post<Booking>("/bookings", input)).data,
  patch: async (id: number, patch: BookingPatch): Promise<Booking> => (await api.patch<Booking>(`/bookings/${id}`, patch)).data,
  customers: async (q: string): Promise<CustomerWithStats[]> => (await api.get<CustomerWithStats[]>("/customers", { params: { q } })).data,
  saveCustomerNotes: async (id: number, notes: string): Promise<CustomerWithStats> => (await api.patch<CustomerWithStats>(`/customers/${id}`, { notes })).data,
  stats: async (from: string, to: string): Promise<Stats> => (await api.get<Stats>("/stats", { params: { from, to } })).data,
  exportCsv: async (): Promise<Blob> => (await api.get<Blob>("/bookings/export.csv", { responseType: "blob" })).data,
};
