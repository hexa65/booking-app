import { useState } from "react";
import { Button, ConfirmDialog, Modal, SelectField, StatusBadge, TextAreaField, TextField } from "../ui/ui";
import { useToast } from "../ui/toast";
import { usePatchBooking } from "../../hooks/queries";
import { errorMessage } from "../../lib/errors";
import { formatClock, formatDateLong, formatNaira } from "../../lib/format";
import { whatsAppLink } from "../../lib/whatsapp";
import type { BookingRow, BookingStatus, Staff } from "../../types";

interface BookingDialogProps { booking: BookingRow | null; staff: Staff[]; onClose: () => void; }

export function BookingDialog({ booking, staff, onClose }: BookingDialogProps) {
  return (
    <Modal open={booking !== null} title="Booking details" onClose={onClose}>
      {booking ? <Body key={booking.id} booking={booking} staff={staff} onClose={onClose} /> : null}
    </Modal>
  );
}

function Body({ booking, staff, onClose }: { booking: BookingRow; staff: Staff[]; onClose: () => void }) {
  const patch = usePatchBooking();
  const { showToast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notes, setNotes] = useState(booking.notes);
  const [moveDate, setMoveDate] = useState(booking.date);
  const [moveTime, setMoveTime] = useState(booking.startTime);
  const [moveStaff, setMoveStaff] = useState(String(booking.staffId));
  const first = booking.customerName.split(" ")[0] ?? "";

  // Optimistic: the status changes on screen at once; if the server says no, it rolls back and we show why.
  function setStatus(status: BookingStatus, done: string): void {
    patch.mutate({ id: booking.id, patch: { status } }, {
      onSuccess: () => { showToast(done); if (status !== "confirmed") onClose(); },
      onError: (err) => showToast(errorMessage(err), "error"),
    });
  }
  function move(): void {
    patch.mutate({ id: booking.id, patch: { move: { date: moveDate, startTime: moveTime, staffId: Number(moveStaff) } } }, {
      onSuccess: () => { showToast("Booking moved."); onClose(); },
      onError: (err) => showToast(errorMessage(err), "error"),
    });
  }
  function saveNotes(): void {
    patch.mutate({ id: booking.id, patch: { notes } }, { onSuccess: () => showToast("Note saved."), onError: (err) => showToast(errorMessage(err), "error") });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-display text-4xl font-bold leading-none">{formatClock(booking.startTime)}</p>
        <p className="text-lg">{formatDateLong(booking.date)}, until {formatClock(booking.endTime)}</p>
      </div>
      <p className="text-lg font-semibold">{booking.customerName}, {booking.serviceName} with {booking.staffName}</p>
      <p>{formatNaira(booking.priceMinor)}. Booked {booking.source === "online" ? "by the customer online" : booking.source === "walk_in" ? "as a walk-in" : "by you"}.</p>
      <div><StatusBadge status={booking.status} /></div>
      <a className="font-bold text-bottle underline" target="_blank" rel="noreferrer"
        href={whatsAppLink(booking.customerPhone, `Hello ${first}, this is about your ${booking.serviceName} booking.`)}>
        Message {first} on WhatsApp ({booking.customerPhone})
      </a>

      <div className="flex flex-wrap gap-2">
        {booking.status === "confirmed" ? (
          <>
            <Button onClick={() => setStatus("completed", "Marked completed.")} disabled={patch.isPending}>Mark completed</Button>
            <Button variant="secondary" onClick={() => setStatus("no_show", "Marked no-show.")} disabled={patch.isPending}>Mark no-show</Button>
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel booking</Button>
          </>
        ) : <Button variant="secondary" onClick={() => setStatus("confirmed", "Booking restored.")} disabled={patch.isPending}>Restore booking</Button>}
      </div>

      <fieldset className="flex flex-col gap-3 border-t-2 border-ink pt-4">
        <legend className="font-display text-lg font-bold">Move this booking</legend>
        <TextField label="Day" type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
        <TextField label="Start time" type="time" step={300} value={moveTime} onChange={(e) => setMoveTime(e.target.value)} />
        <SelectField label="With" value={moveStaff} onChange={(e) => setMoveStaff(e.target.value)}>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
        <Button variant="secondary" onClick={move} disabled={patch.isPending || !moveDate || !moveTime}>Move booking</Button>
      </fieldset>

      <div className="flex flex-col gap-2 border-t-2 border-ink pt-4">
        <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button variant="secondary" onClick={saveNotes} disabled={patch.isPending || notes === booking.notes}>Save note</Button>
      </div>

      <ConfirmDialog open={confirmCancel} title="Cancel this booking?" message={`${booking.customerName}'s ${booking.serviceName} at ${formatClock(booking.startTime)} will be cancelled and the time freed.`}
        confirmLabel="Cancel booking" danger onConfirm={() => { setConfirmCancel(false); setStatus("cancelled", "Booking cancelled."); }} onCancel={() => setConfirmCancel(false)} />
    </div>
  );
}
