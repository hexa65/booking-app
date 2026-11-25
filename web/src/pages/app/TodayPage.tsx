import { useState } from "react";
import { Link } from "react-router";
import { BookingDialog } from "../../components/bookings/BookingDialog";
import { EmptyState, ErrorState, ListSkeleton, StatusBadge } from "../../components/ui/ui";
import { useAuth } from "../../app/AuthProvider";
import { useBookings, useStaff } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useNow } from "../../hooks/useNow";
import { STATUS_LABEL } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import { formatClock, formatDateLong } from "../../lib/format";
import type { BookingStatus } from "../../types";

export default function TodayPage() {
  useDocumentTitle("Today");
  const now = useNow();
  const { user } = useAuth();
  const q = useBookings(now.date, now.date, null, null, true);
  const staff = useStaff();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (q.isPending) return <ListSkeleton rows={4} rowClass="h-20" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;

  const rows = q.data; // everything below is DERIVED from this list: nothing extra is stored
  const next = rows.find((b) => b.status === "confirmed" && b.endTime > now.time) ?? null;
  const counts: Record<BookingStatus, number> = { confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  for (const b of rows) counts[b.status]++;
  const selected = rows.find((b) => b.id === selectedId) ?? null;
  const link = user ? `${window.location.origin}/b/${user.businessSlug}` : "";

  return (
    <div className="flex flex-col gap-5">
      <h1>{formatDateLong(now.date)}</h1>
      {rows.length === 0 ? (
        <EmptyState title="No bookings yet today">Share your booking link to get the first one: <span className="break-all font-semibold">{link}</span>. Or <Link className="font-bold text-bottle underline" to="/app/calendar">add one yourself</Link>.</EmptyState>
      ) : (
        <>
          {next ? (
            <button type="button" onClick={() => setSelectedId(next.id)} className="border-2 border-ink bg-paper p-5 text-left">
              <span className="block text-lg">{next.startTime <= now.time ? "Happening now" : "Next up"}</span>
              <span className="block font-display text-6xl font-bold leading-none">{formatClock(next.startTime)}</span>
              <span className="mt-2 block text-xl font-semibold">{next.customerName}, {next.serviceName} with {next.staffName}</span>
            </button>
          ) : <p className="border-2 border-ink bg-paper p-5 text-lg">Nothing else is booked for the rest of today.</p>}
          <p className="text-lg">
            {(Object.keys(counts) as BookingStatus[]).filter((s) => counts[s] > 0).map((s) => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`).join(", ")}
          </p>
          <ul className="flex flex-col gap-2">
            {rows.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => setSelectedId(b.id)} className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 border-2 border-ink bg-paper p-3 text-left">
                  <span><span className="font-display text-2xl font-bold">{formatClock(b.startTime)}</span> {b.customerName}<span className="block text-moss">{b.serviceName} with {b.staffName}</span></span>
                  <StatusBadge status={b.status} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <BookingDialog booking={selected} staff={(staff.data ?? []).filter((s) => s.active)} onClose={() => setSelectedId(null)} />
    </div>
  );
}
