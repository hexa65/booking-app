import type { ManageBooking, PublicBusinessData, PublicQueueStatus, SlotOption } from "../types";
import { api } from "./api";

export interface PublicBookingInput { serviceId: number; staffId: number | null; date: string; startTime: string; name: string; phone: string; consent: true; }
export const publicService = {
  business: async (slug: string): Promise<PublicBusinessData> => (await api.get<PublicBusinessData>(`/public/${slug}`)).data,
  slots: async (slug: string, serviceId: number, date: string, staffId: number | null): Promise<SlotOption[]> =>
    (await api.get<SlotOption[]>(`/public/${slug}/slots`, { params: { serviceId, date, staffId: staffId ?? "any" } })).data,
  book: async (slug: string, input: PublicBookingInput): Promise<{ manageToken: string; booking: ManageBooking }> =>
    (await api.post<{ manageToken: string; booking: ManageBooking }>(`/public/${slug}/bookings`, input)).data,
  manage: async (token: string): Promise<ManageBooking> => (await api.get<ManageBooking>(`/public/bookings/${token}`)).data,
  cancel: async (token: string): Promise<ManageBooking> => (await api.post<ManageBooking>(`/public/bookings/${token}/cancel`)).data,
  reschedule: async (token: string, date: string, startTime: string): Promise<ManageBooking> =>
    (await api.post<ManageBooking>(`/public/bookings/${token}/reschedule`, { date, startTime })).data,
  joinQueue: async (slug: string, input: { name: string; phone: string; serviceId: number; consent: true }): Promise<{ token: string }> =>
    (await api.post<{ token: string }>(`/public/${slug}/queue`, input)).data,
  queueStatus: async (token: string): Promise<PublicQueueStatus> => (await api.get<PublicQueueStatus>(`/public/queue/${token}`)).data,
};
