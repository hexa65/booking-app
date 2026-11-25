export const POLL_MS = 10_000;
/** Fixed lookup: Tailwind needs whole class names, never names built from pieces. */
export const STAFF_STYLES = [
  { block: "bg-cobalt text-white", chip: "border-cobalt", dot: "bg-cobalt" },
  { block: "bg-plum text-white", chip: "border-plum", dot: "bg-plum" },
  { block: "bg-ochre text-white", chip: "border-ochre", dot: "bg-ochre" },
  { block: "bg-bottle text-white", chip: "border-bottle", dot: "bg-bottle" },
] as const;
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const STATUS_LABEL = { confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show" } as const;
export const STATUS_MARK = { confirmed: "", completed: "✓ ", cancelled: "✕ ", no_show: "! " } as const;
