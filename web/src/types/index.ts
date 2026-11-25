// Shared shapes. The API folder keeps its own copy (honest duplication).
export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";
export type BookingSource = "online" | "manual" | "walk_in";
export interface Service { id: number; name: string; durationMinutes: number; priceMinor: number; active: boolean; }
export interface Staff { id: number; name: string; active: boolean; serviceIds: number[]; }
export interface WorkingInterval { id: number; staffId: number; weekday: number; startTime: string; endTime: string; }
export interface TimeOff { id: number; staffId: number; dateFrom: string; dateTo: string; reason: string; }
export interface Customer { id: number; name: string; phone: string; notes: string; }
export interface CustomerWithStats extends Customer { visitCount: number; noShowCount: number; lastVisitDate: string | null; }
export interface Booking {
  id: number; staffId: number; serviceId: number; customerId: number;
  date: string; startTime: string; endTime: string;
  status: BookingStatus; source: BookingSource; priceMinor: number; notes: string;
}
export interface BookingRow extends Booking { customerName: string; customerPhone: string; serviceName: string; staffName: string; }
export interface SlotOption { startTime: string; staffId: number; }
export type QueueStatus = "waiting" | "in_service" | "done" | "left";
export interface QueueEntry { id: number; name: string; phone: string; serviceId: number; staffId: number | null; status: QueueStatus; joinedAt: string; }
export interface QueueRow extends QueueEntry { serviceName: string; durationMinutes: number; }
export type CreateServiceInput = Omit<Service, "id">;
export type UpdateServiceInput = Partial<CreateServiceInput>;
export interface Settings {
  id: number; name: string; slug: string; timezone: string; slotStepMinutes: number; leadMinutes: number;
  bufferMinutes: number; bookingWindowDays: number; cancelCutoffHours: number;
}
export interface PublicBusinessData {
  business: { name: string; slug: string; timezone: string; bookingWindowDays: number; cancelCutoffHours: number };
  services: Service[]; staff: Staff[];
}
export interface ManageBooking {
  id: number; staffId: number; serviceId: number; date: string; startTime: string; endTime: string; status: BookingStatus;
  priceMinor: number; serviceName: string; staffName: string; businessName: string; businessSlug: string;
  cancelCutoffHours: number; customerName: string; canChange: boolean;
}
export interface PublicQueueStatus { name: string; status: QueueStatus; businessName: string; serviceName: string; position: number | null; waitMinutes: number | null; }
export interface Stats {
  from: string; to: string; perDay: { date: string; bookings: number }[]; completed: number; noShow: number; cancelled: number;
  noShowRate: number | null; revenueMinor: number; busiestHours: { hour: number; bookings: number }[]; repeatCustomers: number;
}
export interface PilotMetrics { milestones: { name: string; at: string }[]; bookingsPerWeek: { week: string; bookings: number }[]; }
