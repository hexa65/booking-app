import { useState } from "react";
import type { FormEvent } from "react";
import { Button, EmptyState, ErrorState, ListSkeleton, TextField } from "../ui/ui";
import { useToast } from "../ui/toast";
import { useAddTimeOff, useRemoveTimeOff, useTimeOff } from "../../hooks/queries";
import { errorMessage } from "../../lib/errors";
import { formatDayShort } from "../../lib/format";

export function TimeOffEditor({ staffId }: { staffId: number }) {
  const q = useTimeOff(staffId);
  const add = useAddTimeOff();
  const remove = useRemoveTimeOff();
  const { showToast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!from || !to) { setProblem("Choose the first and last day."); return; }
    if (to < from) { setProblem("The last day cannot be before the first day."); return; }
    setProblem(null);
    add.mutate({ staffId, dateFrom: from, dateTo: to, reason }, { onSuccess: () => { showToast("Days off added."); setFrom(""); setTo(""); setReason(""); }, onError: (err) => showToast(errorMessage(err), "error") });
  }
  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <TextField label="First day off" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="Last day off" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <TextField label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {problem ? <p role="alert" className="font-semibold text-magenta">Problem: {problem}</p> : null}
        <Button type="submit" variant="secondary" disabled={add.isPending}>Add days off</Button>
      </form>
      {q.isPending ? <ListSkeleton rows={2} rowClass="h-12" /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.data && q.data.length === 0 ? <EmptyState title="No days off planned" /> : null}
      <ul className="flex flex-col gap-2">
        {q.data?.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-2 border-ink p-2">
            <span>{formatDayShort(t.dateFrom)}{t.dateTo !== t.dateFrom ? ` to ${formatDayShort(t.dateTo)}` : ""}{t.reason ? `: ${t.reason}` : ""}</span>
            <Button variant="danger" onClick={() => remove.mutate({ staffId, id: t.id }, { onError: (err) => showToast(errorMessage(err), "error") })}>Remove</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
