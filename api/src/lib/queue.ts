import type { QueueStatus } from "../types.js";

export interface QueueLike { id: number; status: QueueStatus; joinedAt: string; }

/** 1-based position among people still waiting (earliest joinedAt first, then lowest id). */
export function queuePosition(entries: QueueLike[], id: number): number | null {
  const waiting = entries
    .filter((e) => e.status === "waiting")
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.id - b.id);
  const index = waiting.findIndex((e) => e.id === id);
  return index === -1 ? null : index + 1;
}

/**
 * Estimated minutes until someone can START, given the service lengths of the people ahead
 * and each working chair's remaining minutes (0 = free now). Null when nobody is working.
 */
export function estimateWaitMinutes(aheadDurations: number[], chairBusyMinutes: number[]): number | null {
  if (chairBusyMinutes.length === 0) return null;
  const chairs = [...chairBusyMinutes];
  for (const d of aheadDurations) {
    let k = 0;
    for (let i = 1; i < chairs.length; i++) if ((chairs[i] ?? 0) < (chairs[k] ?? 0)) k = i;
    chairs[k] = (chairs[k] ?? 0) + d;
  }
  return Math.min(...chairs);
}

export function roundWaitToFive(minutes: number): number {
  return Math.ceil(minutes / 5) * 5;
}
