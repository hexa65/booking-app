import type { QueueRow, QueueStatus } from "../types";
import { api } from "./api";

export const queueService = {
  list: async (): Promise<QueueRow[]> => (await api.get<QueueRow[]>("/queue")).data,
  add: async (input: { name: string; phone: string; serviceId: number }): Promise<void> => { await api.post("/queue", input); },
  patch: async (id: number, patch: { status?: QueueStatus; staffId?: number | null }): Promise<QueueRow> => (await api.patch<QueueRow>(`/queue/${id}`, patch)).data,
  callNext: async (staffId: number | null): Promise<QueueRow> => (await api.post<QueueRow>("/queue/call-next", { staffId })).data,
};
