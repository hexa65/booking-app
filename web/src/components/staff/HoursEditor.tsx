import { useState } from "react";
import { Button, ErrorState, ListSkeleton, TextField } from "../ui/ui";
import { useToast } from "../ui/toast";
import { useHours, useSaveHours } from "../../hooks/queries";
import { WEEKDAYS } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import { validateIntervals } from "../../lib/hours";
import type { WorkingInterval } from "../../types";

interface Range { startTime: string; endTime: string; }
type Week = Record<number, Range[]>;

function toWeek(rows: WorkingInterval[]): Week {
  const week: Week = {};
  for (const r of rows) (week[r.weekday] ??= []).push({ startTime: r.startTime, endTime: r.endTime });
  return week;
}

export function HoursEditor({ staffId }: { staffId: number }) {
  const q = useHours(staffId);
  if (q.isPending) return <ListSkeleton rows={3} rowClass="h-12" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  return <Editor staffId={staffId} initial={toWeek(q.data)} />;
}

function Editor({ staffId, initial }: { staffId: number; initial: Week }) {
  const save = useSaveHours();
  const { showToast } = useToast();
  const [week, setWeek] = useState<Week>(initial);
  const [problem, setProblem] = useState<string | null>(null);

  const setDay = (d: number, ranges: Range[]): void => setWeek((w) => ({ ...w, [d]: ranges }));
  const copyMonday = (): void => setWeek((w) => { const mon = w[1] ?? []; const next: Week = { 1: mon }; for (let d = 2; d <= 7; d++) next[d] = d === 7 ? (w[7] ?? []) : mon.map((r) => ({ ...r })); return next; });

  function onSave(): void {
    const intervals = [1, 2, 3, 4, 5, 6, 7].flatMap((d) => (week[d] ?? []).map((r) => ({ weekday: d, ...r })));
    const msg = validateIntervals(intervals);
    setProblem(msg);
    if (msg) return;
    save.mutate({ staffId, intervals }, { onSuccess: () => showToast("Hours saved."), onError: (e) => showToast(errorMessage(e), "error") });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-moss">Add a second time range to make a break, for example 09:00 to 13:00 and 14:00 to 19:00. Leave a day empty for a day off.</p>
      <Button variant="secondary" onClick={copyMonday}>Copy Monday to Tuesday-Saturday</Button>
      {WEEKDAYS.map((name, i) => {
        const day = i + 1;
        const ranges = week[day] ?? [];
        return (
          <fieldset key={day} className="flex flex-col gap-2 border-2 border-ink p-3">
            <legend className="px-1 font-display text-lg font-bold">{name}{ranges.length === 0 ? ": day off" : ""}</legend>
            {ranges.map((r, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2">
                <TextField label="From" type="time" value={r.startTime} onChange={(e) => setDay(day, ranges.map((x, j) => (j === idx ? { ...x, startTime: e.target.value } : x)))} />
                <TextField label="Until" type="time" value={r.endTime} onChange={(e) => setDay(day, ranges.map((x, j) => (j === idx ? { ...x, endTime: e.target.value } : x)))} />
                <Button variant="danger" onClick={() => setDay(day, ranges.filter((_, j) => j !== idx))}>Remove</Button>
              </div>
            ))}
            <div><Button variant="secondary" onClick={() => setDay(day, [...ranges, { startTime: ranges.length ? "14:00" : "09:00", endTime: ranges.length ? "19:00" : "19:00" }])}>{ranges.length ? "Add another time range" : "Add opening hours"}</Button></div>
          </fieldset>
        );
      })}
      {problem ? <p role="alert" className="font-semibold text-magenta">Problem: {problem}</p> : null}
      <Button onClick={onSave} disabled={save.isPending}>{save.isPending ? "Saving" : "Save hours"}</Button>
    </div>
  );
}
