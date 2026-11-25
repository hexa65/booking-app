import { formatClock } from "../../lib/format";
import type { SlotOption } from "../../types";
import { ErrorState, ListSkeleton } from "../ui/ui";

interface SlotGridProps {
  slots: SlotOption[] | undefined; loading: boolean; error: string | null; onRetry: () => void;
  value: string | null; onPick: (startTime: string) => void; isToday: boolean;
}
export function SlotGrid({ slots, loading, error, onRetry, value, onPick, isToday }: SlotGridProps) {
  if (loading) return <ListSkeleton rows={2} rowClass="h-12" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!slots || slots.length === 0) {
    return <p className="border-2 border-dashed border-moss bg-paper p-4">{isToday ? "No times left today. Try another day." : "No times free on this day. Try another day."}</p>;
  }
  // "Anyone available" returns each time once, so times are unique.
  return (
    <div role="radiogroup" aria-label="Choose a time" className="grid grid-cols-3 gap-2">
      {slots.map((s) => {
        const selected = s.startTime === value;
        return (
          <button key={`${s.startTime}-${s.staffId}`} type="button" role="radio" aria-checked={selected} onClick={() => onPick(s.startTime)}
            className={`min-h-12 border-2 px-1 font-display text-xl font-bold ${selected ? "border-bottle bg-bottle text-white" : "border-ink bg-paper text-ink"}`}>
            {formatClock(s.startTime)}
          </button>
        );
      })}
    </div>
  );
}
