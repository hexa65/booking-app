export type NoShowRisk = "none" | "watch" | "high";
/** Derived, never stored. Two no-shows, or a third of visits missed, is high; one is "watch". */
export function noShowRisk(visitCount: number, noShowCount: number): NoShowRisk {
  const total = visitCount + noShowCount;
  if (noShowCount >= 2 || (total >= 3 && noShowCount / total >= 0.3)) return "high";
  return noShowCount === 1 ? "watch" : "none";
}
export const RISK_LABEL: Record<NoShowRisk, string> = { none: "Reliable", watch: "1 missed booking", high: "Often misses bookings" };
