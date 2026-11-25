import { useState } from "react";
import { useSearchParams } from "react-router";
import { BookingDialog } from "../../components/bookings/BookingDialog";
import { ManualBookingDialog } from "../../components/bookings/ManualBookingDialog";
import { DayTimeline } from "../../components/timeline/DayTimeline";
import { Button, EmptyState, ErrorState, ListSkeleton, StatusBadge } from "../../components/ui/ui";
import { useBookings, useStaff } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useNow } from "../../hooks/useNow";
import { errorMessage } from "../../lib/errors";
import { formatClock, formatDateLong } from "../../lib/format";
import { addDays } from "../../lib/time";

export default function CalendarPage() {
  useDocumentTitle("Calendar");
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? now.date;
  const view = params.get("view") === "list" ? "list" : "timeline";
  const bookTime = params.get("book");
  const bookStaff = params.get("staff") ? Number(params.get("staff")) : null;
  const walkIn = params.get("walkin") === "1";
  const staff = useStaff();
  const bookings = useBookings(date, date, null, null, true); // polls every 10 seconds while the tab is visible
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const set = (changes: Record<string, string | null>): void => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (v === null) next.delete(k); else next.set(k, v); }
    setParams(next, { replace: true });
  };
  const activeStaff = (staff.data ?? []).filter((s) => s.active);
  const selected = bookings.data?.find((b) => b.id === selectedId) ?? null;
  const roundedNow = (() => { const [h, m] = now.time.split(":").map(Number); const t = Math.ceil(((h ?? 0) * 60 + (m ?? 0)) / 5) * 5; return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; })();

  return (
    <div className="flex flex-col gap-4">
      <h1>{date === now.date ? "Today" : formatDateLong(date)}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => set({ date: addDays(date, -1) })}>Previous day</Button>
        <Button variant="secondary" onClick={() => set({ date: null })} disabled={date === now.date}>Go to today</Button>
        <Button variant="secondary" onClick={() => set({ date: addDays(date, 1) })}>Next day</Button>
        <Button onClick={() => set({ book: roundedNow > "09:00" && date === now.date ? roundedNow : "09:00", walkin: null })}>Add booking</Button>
        <Button variant="secondary" onClick={() => set({ book: roundedNow, walkin: "1" })}>Add walk-in</Button>
        <Button variant="ghost" onClick={() => set({ view: view === "list" ? null : "list" })}>{view === "list" ? "Show timeline" : "Show as list"}</Button>
      </div>

      {bookings.isPending || staff.isPending ? <ListSkeleton rows={5} rowClass="h-20" /> : null}
      {bookings.isError ? <ErrorState message={errorMessage(bookings.error)} onRetry={() => void bookings.refetch()} /> : null}
      {staff.isError ? <ErrorState message={errorMessage(staff.error)} onRetry={() => void staff.refetch()} /> : null}

      {bookings.data && staff.data ? (
        activeStaff.length === 0 ? <EmptyState title="No staff yet">Add the people who work in your shop on the Staff page, then their day shows up here.</EmptyState>
        : view === "timeline" ? <DayTimeline date={date} bookings={bookings.data} staff={activeStaff} now={now} onSelectBooking={setSelectedId} onPickSlot={(staffId, t) => set({ book: t, staff: String(staffId), walkin: null })} />
        : bookings.data.length === 0 ? <EmptyState title="No bookings this day">Share your booking link to get the first one.</EmptyState>
        : <ul className="flex flex-col gap-2">
            {bookings.data.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => setSelectedId(b.id)} className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 border-2 border-ink bg-paper p-3 text-left">
                  <span><span className="font-display text-2xl font-bold">{formatClock(b.startTime)}</span> {b.customerName}<span className="block text-moss">{b.serviceName} with {b.staffName}</span></span>
                  <StatusBadge status={b.status} />
                </button>
              </li>
            ))}
          </ul>
      ) : null}

      <BookingDialog booking={selected} staff={activeStaff} onClose={() => setSelectedId(null)} />
      <ManualBookingDialog open={bookTime !== null} onClose={() => set({ book: null, staff: null, walkin: null })} defaultDate={date} defaultTime={bookTime ?? "09:00"} defaultStaffId={bookStaff} walkIn={walkIn} />
    </div>
  );
}
