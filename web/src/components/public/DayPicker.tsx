import { formatDayShort } from "../../lib/format";
import { addDays } from "../../lib/time";

interface DayPickerProps { today: string; windowDays: number; value: string | null; onChange: (date: string) => void; }

/** Only days from today up to the booking window are offered: past days simply do not exist here. */
export function DayPicker({ today, windowDays, value, onChange }: DayPickerProps) {
  const count = Math.min(windowDays, 14) + 1;
  const days = Array.from({ length: count }, (_, i) => addDays(today, i));
  return (
    <div role="radiogroup" aria-label="Choose a day" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {days.map((d) => {
        const selected = d === value;
        return (
          <button key={d} type="button" role="radio" aria-checked={selected} onClick={() => onChange(d)}
            className={`min-h-12 border-2 px-2 py-2 font-display text-lg font-bold ${selected ? "border-ink bg-ink text-paper" : "border-ink bg-paper text-ink"}`}>
            {d === today ? "Today" : formatDayShort(d)}
          </button>
        );
      })}
    </div>
  );
}
