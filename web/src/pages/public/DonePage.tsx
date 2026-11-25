import { Link, useParams, useSearchParams } from "react-router";
import { Button, ErrorState, Skeleton } from "../../components/ui/ui";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useManageBooking } from "../../hooks/queries";
import { errorMessage } from "../../lib/errors";
import { formatClock, formatDateLong, formatNaira } from "../../lib/format";
import { buildIcs } from "../../lib/ics";

export function DonePage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const q = useManageBooking(token);
  useDocumentTitle("Booked");

  if (!token) return <ErrorState message="We could not find your booking. Open the booking link the shop sent you." />;
  if (q.isPending) return <Skeleton className="h-72 w-full" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const b = q.data;

  function downloadIcs(): void {
    const text = buildIcs({ uid: String(b.id), title: `${b.serviceName} at ${b.businessName}`, date: b.date, startTime: b.startTime, endTime: b.endTime, description: `With ${b.staffName}` });
    const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url; a.download = "booking.ics"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <h1>You are booked</h1>
      {/* The booking stub: the time is large so it is easy to screenshot. */}
      <article aria-label="Your booking" className="border-2 border-ink bg-paper">
        <div className="border-b-2 border-dashed border-ink p-5">
          <p className="font-display text-xl font-bold">{b.businessName}</p>
          <p className="mt-3 text-lg">{formatDateLong(b.date)}</p>
          <p className="font-display text-7xl font-bold leading-none">{formatClock(b.startTime)}</p>
        </div>
        <div className="p-5">
          <p className="text-lg font-semibold">{b.serviceName} with {b.staffName}</p>
          <p className="text-moss">{formatNaira(b.priceMinor)}. Pay at the shop.</p>
        </div>
      </article>
      <Link to={`/booking/${token}`} className="flex min-h-12 items-center justify-center bg-bottle px-5 font-display text-lg font-bold text-white">View or cancel booking</Link>
      <Button variant="secondary" onClick={downloadIcs}>Add to my calendar</Button>
      <p className="text-moss">Keep this page or screenshot it. The link in your address bar lets you change your booking later.</p>
      <Link to={`/b/${slug}`} className="font-bold text-bottle underline">Book something else</Link>
    </div>
  );
}
