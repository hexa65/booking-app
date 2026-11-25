import { useState } from "react";
import { BookingDialog } from "../../components/bookings/BookingDialog";
import { EmptyState, ErrorState, ListSkeleton, SelectField, StatusBadge, TextField } from "../../components/ui/ui";
import { useBookings, useStaff } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useNow } from "../../hooks/useNow";
import { errorMessage } from "../../lib/errors";
import { formatClock, formatDayShort, formatNaira } from "../../lib/format";
import { addDays } from "../../lib/time";

export default function BookingsPage() {
  useDocumentTitle("Bookings");
  const now = useNow();
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [staffId, setStaffId] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const start = from ?? addDays(now.date, -7);
  const end = to ?? addDays(now.date, 14);
  const staff = useStaff();
  const q = useBookings(start, end, staffId ? Number(staffId) : null, status || null);
  const selected = q.data?.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <h1>Bookings</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField label="From" type="date" value={start} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="Until" type="date" value={end} onChange={(e) => setTo(e.target.value)} />
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="no_show">No-show</option><option value="cancelled">Cancelled</option>
        </SelectField>
        <SelectField label="Person" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Everyone</option>
          {staff.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
      </div>
      {q.isPending ? <ListSkeleton /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.data && q.data.length === 0 ? <EmptyState title="No bookings in this range">Share your booking link to get the first one, or change the dates above.</EmptyState> : null}
      <ul className="flex flex-col gap-2">
        {q.data?.map((b) => (
          <li key={b.id}>
            <button type="button" onClick={() => setSelectedId(b.id)} className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 border-2 border-ink bg-paper p-3 text-left">
              <span><span className="font-display text-xl font-bold">{formatDayShort(b.date)}, {formatClock(b.startTime)}</span> {b.customerName}
                <span className="block text-moss">{b.serviceName} with {b.staffName}, {formatNaira(b.priceMinor)}</span></span>
              <StatusBadge status={b.status} />
            </button>
          </li>
        ))}
      </ul>
      <BookingDialog booking={selected} staff={(staff.data ?? []).filter((s) => s.active)} onClose={() => setSelectedId(null)} />
    </div>
  );
}
