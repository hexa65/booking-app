// Every parameter that changes the data must be in the key.
export const keys = {
  services: ["services"] as const,
  staff: ["staff"] as const,
  hours: (staffId: number) => ["hours", staffId] as const,
  timeOff: (staffId: number) => ["timeOff", staffId] as const,
  settings: ["settings"] as const,
  bookings: (from: string, to: string, staffId: number | null, status: string | null) => ["bookings", from, to, staffId, status] as const,
  customers: (q: string) => ["customers", q] as const,
  queue: ["queue"] as const,
  stats: (from: string, to: string) => ["stats", from, to] as const,
  pilot: ["pilot"] as const,
  publicBusiness: (slug: string) => ["public", slug] as const,
  slots: (slug: string, serviceId: number | null, date: string | null, staffId: number | null) => ["slots", slug, serviceId, date, staffId] as const,
  manage: (token: string) => ["manage", token] as const,
  queueStatus: (token: string) => ["queueStatus", token] as const,
};
