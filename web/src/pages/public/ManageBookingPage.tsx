import { useState } from "react";
import { useParams } from "react-router";
import { DayPicker } from "../../components/public/DayPicker";
import { SlotGrid } from "../../components/public/SlotGrid";
import { Button, ConfirmDialog, ErrorState, Skeleton, StatusBadge } from "../../components/ui/ui";
import { useToast } from "../../components/ui/toast";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useCancelBooking, useManageBooking, usePublicBusiness, useReschedule, useSlots } from "../../hooks/queries";
import { errorMessage, errorStatus } from "../../lib/errors";
import { formatClock, formatDateLong, formatNaira } from "../../lib/format";
import { nowInTimezone } from "../../lib/time";

export function ManageBookingPage() {
  const { token = "" } = useParams();
  const q = useManageBooking(token);
  useDocumentTitle("Your booking");
  const { showToast } = useToast();
  const cancel = useCancelBooking(token);
  const reschedule = useReschedule(token);
  const business = usePublicBusiness(q.data?.businessSlug ?? "");
  const [confirming, setConfirming] = useState(false);
  const [moving, setMoving] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const b = q.data;
  const slots = useSlots(b?.businessSlug ?? "", moving && b ? b.serviceId : null, date, b ? b.staffId : null);

  if (q.isPending) return <Skeleton className="h-64 w-full" />;
  if (q.isError) {
    return errorStatus(q.error) === 404
      ? <ErrorState message="We could not find this booking. Check the link the shop sent you." />
      : <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  }
  const bk = q.data;
  const today = nowInTimezone(business.data?.business.timezone ?? "Africa/Lagos", new Date()).date;

  async function doCancel(): Promise<void> {
    try { await cancel.mutateAsync(); setConfirming(false); showToast("Booking cancelled."); }
    catch (err: unknown) { setConfirming(false); showToast(errorMessage(err), "error"); }
  }
  async function doMove(): Promise<void> {
    if (!date || !time) return;
    try { await reschedule.mutateAsync({ date, startTime: time }); setMoving(false); setTime(null); showToast("Booking moved."); }
    catch (err: unknown) {
      if (errorStatus(err) === 409) { setTime(null); void slots.refetch(); showToast("That time was just taken. Pick another.", "error"); }
      else showToast(errorMessage(err), "error");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1>Your booking</h1>
      <article className="border-2 border-ink bg-paper p-5">
        <p className="font-display text-xl font-bold">{bk.businessName}</p>
        <p className="mt-2 text-lg">{formatDateLong(bk.date)}</p>
        <p className="font-display text-6xl font-bold leading-none">{formatClock(bk.startTime)}</p>
        <p className="mt-3 text-lg font-semibold">{bk.serviceName} with {bk.staffName}</p>
        <p className="mb-3 text-moss">{formatNaira(bk.priceMinor)}. Pay at the shop.</p>
        <StatusBadge status={bk.status} />
      </article>

      {bk.status === "cancelled" ? <p>This booking is cancelled. <a className="font-bold text-bottle underline" href={`/b/${bk.businessSlug}`}>Book a new time</a></p> : null}
      {bk.status === "confirmed" && !bk.canChange ? (
        <p className="border-2 border-ink bg-paper p-4">Bookings can only be changed up to {bk.cancelCutoffHours} hours before the time. Please call the shop if you need to change this one.</p>
      ) : null}

      {bk.status === "confirmed" && bk.canChange ? (
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={() => setMoving((m) => !m)}>{moving ? "Keep my time" : "Change the time"}</Button>
          {moving ? (
            <section aria-label="Pick a new time" className="flex flex-col gap-3">
              <DayPicker today={today} windowDays={business.data?.business.bookingWindowDays ?? 14} value={date} onChange={(d) => { setDate(d); setTime(null); }} />
              {date ? <SlotGrid slots={slots.data} loading={slots.isPending} error={slots.isError ? errorMessage(slots.error) : null}
                onRetry={() => void slots.refetch()} value={time} onPick={setTime} isToday={date === today} /> : null}
              <Button onClick={() => void doMove()} disabled={!date || !time || reschedule.isPending}>{reschedule.isPending ? "Moving" : "Move my booking"}</Button>
            </section>
          ) : null}
          <Button variant="danger" onClick={() => setConfirming(true)}>Cancel booking</Button>
        </div>
      ) : null}

      <ConfirmDialog open={confirming} title="Cancel this booking?" message={`Your ${bk.serviceName} on ${formatDateLong(bk.date)} at ${formatClock(bk.startTime)} will be cancelled and the time given to someone else.`}
        confirmLabel="Cancel booking" danger busy={cancel.isPending} onConfirm={() => void doCancel()} onCancel={() => setConfirming(false)} />
    </div>
  );
}
