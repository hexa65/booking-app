import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL_MS } from "../lib/constants";
import { keys } from "../lib/queryKeys";
import { bookingsService } from "../services/bookings";
import type { BookingPatch, ManualBookingInput } from "../services/bookings";
import { businessService } from "../services/business";
import type { HoursInput, StaffInput } from "../services/business";
import { publicService } from "../services/public";
import type { PublicBookingInput } from "../services/public";
import { queueService } from "../services/queue";
import type {
  Booking, BookingRow, CreateServiceInput, CustomerWithStats, ManageBooking, PilotMetrics, PublicBusinessData, PublicQueueStatus, QueueRow,
  QueueStatus, Service, Settings, SlotOption, Staff, Stats, TimeOff, UpdateServiceInput, WorkingInterval,
} from "../types";

/** Polling that pauses while the tab is hidden. */
const poll = (): number | false => (document.hidden ? false : POLL_MS);

// ---- Owner: setup ----
export const useServices = () => useQuery<Service[], Error>({ queryKey: keys.services, queryFn: businessService.services });
export const useStaff = () => useQuery<Staff[], Error>({ queryKey: keys.staff, queryFn: businessService.staff });
export const useSettings = () => useQuery<Settings, Error>({ queryKey: keys.settings, queryFn: businessService.settings });
export const usePilot = () => useQuery<PilotMetrics, Error>({ queryKey: keys.pilot, queryFn: businessService.pilot });
export const useHours = (staffId: number) => useQuery<WorkingInterval[], Error>({ queryKey: keys.hours(staffId), queryFn: () => businessService.hours(staffId) });
export const useTimeOff = (staffId: number) => useQuery<TimeOff[], Error>({ queryKey: keys.timeOff(staffId), queryFn: () => businessService.timeOff(staffId) });

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation<Service, Error, CreateServiceInput>({ mutationFn: businessService.createService, onSuccess: () => qc.invalidateQueries({ queryKey: keys.services }) });
}
export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation<Service, Error, { id: number; input: UpdateServiceInput }>({
    mutationFn: ({ id, input }) => businessService.updateService(id, input), onSuccess: () => qc.invalidateQueries({ queryKey: keys.services }),
  });
}
export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({ mutationFn: businessService.deleteService, onSuccess: () => qc.invalidateQueries({ queryKey: keys.services }) });
}
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation<Staff, Error, StaffInput>({ mutationFn: businessService.createStaff, onSuccess: () => qc.invalidateQueries({ queryKey: keys.staff }) });
}
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation<Staff, Error, { id: number; input: Partial<StaffInput> }>({
    mutationFn: ({ id, input }) => businessService.updateStaff(id, input), onSuccess: () => qc.invalidateQueries({ queryKey: keys.staff }),
  });
}
export function useSaveHours() {
  const qc = useQueryClient();
  return useMutation<WorkingInterval[], Error, { staffId: number; intervals: HoursInput[] }>({
    mutationFn: ({ staffId, intervals }) => businessService.saveHours(staffId, intervals),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: keys.hours(v.staffId) }),
  });
}
export function useAddTimeOff() {
  const qc = useQueryClient();
  return useMutation<TimeOff, Error, { staffId: number; dateFrom: string; dateTo: string; reason: string }>({
    mutationFn: ({ staffId, ...rest }) => businessService.addTimeOff(staffId, rest), onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: keys.timeOff(v.staffId) }),
  });
}
export function useRemoveTimeOff() {
  const qc = useQueryClient();
  return useMutation<void, Error, { staffId: number; id: number }>({
    mutationFn: ({ staffId, id }) => businessService.removeTimeOff(staffId, id), onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: keys.timeOff(v.staffId) }),
  });
}
export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation<Settings, Error, Partial<Omit<Settings, "id" | "slug" | "timezone">>>({
    mutationFn: businessService.updateSettings, onSuccess: () => qc.invalidateQueries({ queryKey: keys.settings }),
  });
}

// ---- Owner: bookings ----
export const useBookings = (from: string, to: string, staffId: number | null = null, status: string | null = null, live = false) =>
  useQuery<BookingRow[], Error>({ queryKey: keys.bookings(from, to, staffId, status), queryFn: () => bookingsService.list(from, to, staffId, status), refetchInterval: live ? poll : false });

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, ManualBookingInput>({ mutationFn: bookingsService.create, onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }) });
}

type BookingsSnapshot = [readonly unknown[], BookingRow[] | undefined][];
/** Optimistic: the screen changes at once, and rolls back if the server says no. */
export function usePatchBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, { id: number; patch: BookingPatch }, { snapshot: BookingsSnapshot }>({
    mutationFn: ({ id, patch }) => bookingsService.patch(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["bookings"] });
      const snapshot = qc.getQueriesData<BookingRow[]>({ queryKey: ["bookings"] }) as BookingsSnapshot;
      if (patch.status !== undefined || patch.notes !== undefined) {
        qc.setQueriesData<BookingRow[]>({ queryKey: ["bookings"] }, (rows) =>
          rows?.map((b) => (b.id === id ? { ...b, ...(patch.status !== undefined ? { status: patch.status } : {}), ...(patch.notes !== undefined ? { notes: patch.notes } : {}) } : b)));
      }
      return { snapshot };
    },
    onError: (_e, _v, ctx) => { ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data)); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export const useCustomers = (q: string) => useQuery<CustomerWithStats[], Error>({ queryKey: keys.customers(q), queryFn: () => bookingsService.customers(q) });
export function useSaveCustomerNotes() {
  const qc = useQueryClient();
  return useMutation<CustomerWithStats, Error, { id: number; notes: string }>({
    mutationFn: ({ id, notes }) => bookingsService.saveCustomerNotes(id, notes), onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
}
export const useStats = (from: string, to: string) => useQuery<Stats, Error>({ queryKey: keys.stats(from, to), queryFn: () => bookingsService.stats(from, to) });

// ---- Owner: queue ----
export const useQueue = () => useQuery<QueueRow[], Error>({ queryKey: keys.queue, queryFn: queueService.list, refetchInterval: poll });
export function useQueueAdd() {
  const qc = useQueryClient();
  return useMutation<void, Error, { name: string; phone: string; serviceId: number }>({ mutationFn: queueService.add, onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }) });
}
export function useQueuePatch() {
  const qc = useQueryClient();
  return useMutation<QueueRow, Error, { id: number; status: QueueStatus }, { previous: QueueRow[] | undefined }>({
    mutationFn: ({ id, status }) => queueService.patch(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: keys.queue });
      const previous = qc.getQueryData<QueueRow[]>(keys.queue);
      qc.setQueryData<QueueRow[]>(keys.queue, (rows) => rows?.flatMap((r) => (r.id !== id ? [r] : status === "done" || status === "left" ? [] : [{ ...r, status }])));
      return { previous };
    },
    onError: (_e, _v, ctx) => { qc.setQueryData(keys.queue, ctx?.previous); },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.queue }),
  });
}
export function useCallNext() {
  const qc = useQueryClient();
  return useMutation<QueueRow, Error, number | null>({ mutationFn: queueService.callNext, onSuccess: () => qc.invalidateQueries({ queryKey: keys.queue }) });
}

// ---- Public ----
export const usePublicBusiness = (slug: string) => useQuery<PublicBusinessData, Error>({ queryKey: keys.publicBusiness(slug), queryFn: () => publicService.business(slug), retry: false });
export const useSlots = (slug: string, serviceId: number | null, date: string | null, staffId: number | null) =>
  useQuery<SlotOption[], Error>({
    queryKey: keys.slots(slug, serviceId, date, staffId),
    queryFn: () => publicService.slots(slug, serviceId as number, date as string, staffId),
    enabled: serviceId !== null && date !== null, retry: 1,
  });
export function usePublicBook(slug: string) {
  return useMutation<{ manageToken: string; booking: ManageBooking }, Error, PublicBookingInput>({ mutationFn: (input) => publicService.book(slug, input) });
}
export const useManageBooking = (token: string) => useQuery<ManageBooking, Error>({ queryKey: keys.manage(token), queryFn: () => publicService.manage(token), retry: false });
export function useCancelBooking(token: string) {
  const qc = useQueryClient();
  return useMutation<ManageBooking, Error, void>({ mutationFn: () => publicService.cancel(token), onSuccess: (data) => { qc.setQueryData(keys.manage(token), data); } });
}
export function useReschedule(token: string) {
  const qc = useQueryClient();
  return useMutation<ManageBooking, Error, { date: string; startTime: string }>({
    mutationFn: ({ date, startTime }) => publicService.reschedule(token, date, startTime),
    onSuccess: (data) => { qc.setQueryData(keys.manage(token), data); },
  });
}
export function useJoinQueue(slug: string) {
  return useMutation<{ token: string }, Error, { name: string; phone: string; serviceId: number; consent: true }>({ mutationFn: (input) => publicService.joinQueue(slug, input) });
}
export const useQueueStatus = (token: string) =>
  useQuery<PublicQueueStatus, Error>({ queryKey: keys.queueStatus(token), queryFn: () => publicService.queueStatus(token), refetchInterval: poll, retry: false });
