import type { CreateServiceInput, PilotMetrics, Service, Settings, Staff, TimeOff, UpdateServiceInput, WorkingInterval } from "../types";
import { api } from "./api";

export interface StaffInput { name: string; active?: boolean; serviceIds: number[]; }
export interface HoursInput { weekday: number; startTime: string; endTime: string; }
export const businessService = {
  services: async (): Promise<Service[]> => (await api.get<Service[]>("/services")).data,
  createService: async (input: CreateServiceInput): Promise<Service> => (await api.post<Service>("/services", input)).data,
  updateService: async (id: number, input: UpdateServiceInput): Promise<Service> => (await api.patch<Service>(`/services/${id}`, input)).data,
  deleteService: async (id: number): Promise<void> => { await api.delete(`/services/${id}`); },
  staff: async (): Promise<Staff[]> => (await api.get<Staff[]>("/staff")).data,
  createStaff: async (input: StaffInput): Promise<Staff> => (await api.post<Staff>("/staff", input)).data,
  updateStaff: async (id: number, input: Partial<StaffInput>): Promise<Staff> => (await api.patch<Staff>(`/staff/${id}`, input)).data,
  hours: async (staffId: number): Promise<WorkingInterval[]> => (await api.get<WorkingInterval[]>(`/staff/${staffId}/hours`)).data,
  saveHours: async (staffId: number, intervals: HoursInput[]): Promise<WorkingInterval[]> => (await api.put<WorkingInterval[]>(`/staff/${staffId}/hours`, { intervals })).data,
  timeOff: async (staffId: number): Promise<TimeOff[]> => (await api.get<TimeOff[]>(`/staff/${staffId}/time-off`)).data,
  addTimeOff: async (staffId: number, input: { dateFrom: string; dateTo: string; reason: string }): Promise<TimeOff> => (await api.post<TimeOff>(`/staff/${staffId}/time-off`, input)).data,
  removeTimeOff: async (staffId: number, id: number): Promise<void> => { await api.delete(`/staff/${staffId}/time-off/${id}`); },
  settings: async (): Promise<Settings> => (await api.get<Settings>("/settings")).data,
  updateSettings: async (input: Partial<Omit<Settings, "id" | "slug" | "timezone">>): Promise<Settings> => (await api.patch<Settings>("/settings", input)).data,
  pilot: async (): Promise<PilotMetrics> => (await api.get<PilotMetrics>("/stats/pilot")).data,
};
