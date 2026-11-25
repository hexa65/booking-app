import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/ui";
import { useStats } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useNow } from "../../hooks/useNow";
import { errorMessage } from "../../lib/errors";
import { formatClock, formatDayShort, formatNaira } from "../../lib/format";
import { addDays } from "../../lib/time";

/** A bar built from plain CSS. The number is always printed beside it, so the bar is only a bonus. */
function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-28 shrink-0">{label}</span>
      <span className="h-5 flex-1 bg-chalk" aria-hidden="true"><span className="block h-5 bg-bottle" style={{ width: `${max === 0 ? 0 : Math.round((value / max) * 100)}%` }} /></span>
      <span className="w-8 text-right font-display text-lg font-bold">{value}</span>
    </li>
  );
}

export default function StatsPage() {
  useDocumentTitle("Stats");
  const now = useNow();
  const from = addDays(now.date, -29);
  const q = useStats(from, now.date);
  if (q.isPending) return <ListSkeleton />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const s = q.data;
  const maxDay = Math.max(0, ...s.perDay.map((d) => d.bookings));
  const maxHour = Math.max(0, ...s.busiestHours.map((h) => h.bookings));
  const empty = s.perDay.length === 0 && s.completed + s.noShow + s.cancelled === 0;
  return (
    <div className="flex flex-col gap-6">
      <h1>The last 30 days</h1>
      {empty ? <EmptyState title="No numbers yet">Stats appear after your first bookings. Share your booking link to get started.</EmptyState> : (
        <>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <div className="flex justify-between border-b-2 border-ink py-2"><dt>Completed</dt><dd className="font-display text-2xl font-bold">{s.completed}</dd></div>
            <div className="flex justify-between border-b-2 border-ink py-2"><dt>No-shows</dt><dd className="font-display text-2xl font-bold">{s.noShow}</dd></div>
            <div className="flex justify-between border-b-2 border-ink py-2"><dt>No-show rate</dt><dd className="font-display text-2xl font-bold">{s.noShowRate === null ? "None yet" : `${(s.noShowRate * 100).toFixed(1)}%`}</dd></div>
            <div className="flex justify-between border-b-2 border-ink py-2"><dt>Cancelled</dt><dd className="font-display text-2xl font-bold">{s.cancelled}</dd></div>
            <div className="flex justify-between border-b-2 border-ink py-2"><dt>Money from completed bookings</dt><dd className="font-display text-2xl font-bold">{formatNaira(s.revenueMinor)}</dd></div>
            <div className="flex justify-between border-b-2 border-ink py-2"><dt>Customers who came back</dt><dd className="font-display text-2xl font-bold">{s.repeatCustomers}</dd></div>
          </dl>
          <p className="text-moss">The no-show rate is no-shows divided by completed plus no-shows. Cancelled bookings are left out, because the time was freed.</p>
          <section><h2 className="mb-2">Bookings per day</h2><ul className="flex flex-col gap-1">{s.perDay.map((d) => <Bar key={d.date} label={formatDayShort(d.date)} value={d.bookings} max={maxDay} />)}</ul></section>
          <section><h2 className="mb-2">Busiest hours</h2><ul className="flex flex-col gap-1">{s.busiestHours.map((h) => <Bar key={h.hour} label={formatClock(`${String(h.hour).padStart(2, "0")}:00`)} value={h.bookings} max={maxHour} />)}</ul></section>
        </>
      )}
    </div>
  );
}
