import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { DayPicker } from "../../components/public/DayPicker";
import { SlotGrid } from "../../components/public/SlotGrid";
import { Button, ErrorState, ListSkeleton, TextField } from "../../components/ui/ui";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { usePublicBook, usePublicBusiness, useSlots } from "../../hooks/queries";
import { errorMessage, errorStatus } from "../../lib/errors";
import { formatClock, formatDateLong, formatDuration, formatNaira } from "../../lib/format";
import { normalizePhone } from "../../lib/phone";
import { nowInTimezone } from "../../lib/time";

interface Errors { name?: string; phone?: string; consent?: string; }

export function BookPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const business = usePublicBusiness(slug);
  useDocumentTitle("Book a time");

  // The choices live in the address bar (URL state), so the back button and a refresh both work.
  const serviceId = params.get("service") ? Number(params.get("service")) : null;
  const staffParam = params.get("staff");
  const staffId = staffParam && staffParam !== "any" ? Number(staffParam) : null;
  const date = params.get("date");
  const time = params.get("time");
  const update = (changes: Record<string, string | null>): void => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (v === null) next.delete(k); else next.set(k, v); }
    setParams(next, { replace: true });
  };

  const tz = business.data?.business.timezone ?? "Africa/Lagos";
  const today = nowInTimezone(tz, new Date()).date;
  const slots = useSlots(slug, serviceId, date, staffId);
  const book = usePublicBook(slug);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);

  const service = business.data?.services.find((s) => s.id === serviceId) ?? null;
  const people = useMemo(() => (business.data?.staff ?? []).filter((s) => serviceId !== null && s.serviceIds.includes(serviceId)), [business.data, serviceId]);

  // A time that is no longer offered (for example after a refresh) is dropped.
  useEffect(() => {
    if (time && slots.data && !slots.data.some((s) => s.startTime === time)) update({ time: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.data]);

  if (business.isPending) return <ListSkeleton rows={4} />;
  if (business.isError) {
    return errorStatus(business.error) === 404
      ? <ErrorState message="We could not find this business." />
      : <ErrorState message={errorMessage(business.error)} onRetry={() => void business.refetch()} />;
  }
  const data = business.data;

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (serviceId === null || !date || !time) return;
    const next: Errors = {};
    if (name.trim().length < 1) next.name = "Enter your name.";
    if (normalizePhone(phone) === null) next.phone = "Enter a phone number like 0801 234 5678.";
    if (!consent) next.consent = "Please agree so the shop can save your details.";
    setErrors(next); setNotice(null);
    if (Object.keys(next).length > 0) return;
    try {
      const res = await book.mutateAsync({ serviceId, staffId, date, startTime: time, name: name.trim(), phone, consent: true });
      navigate(`/b/${slug}/done?t=${res.manageToken}`);
    } catch (err: unknown) {
      if (errorStatus(err) === 409) {
        // Someone else took it a moment ago: refresh the times, keep what the customer typed.
        update({ time: null });
        void slots.refetch();
        setNotice("That time was just taken. Please pick another. Your details are saved.");
      } else setNotice(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <Link to={`/b/${slug}`} className="font-bold text-bottle underline">Back to {data.business.name}</Link>
        <h1 className="mt-2">Book a time</h1>
      </div>

      <section aria-labelledby="s-service" className="flex flex-col gap-2">
        <h2 id="s-service">What do you need?</h2>
        <div role="radiogroup" aria-labelledby="s-service" className="flex flex-col gap-2">
          {data.services.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={s.id === serviceId}
              onClick={() => update({ service: String(s.id), staff: null, time: null })}
              className={`flex min-h-14 items-center justify-between gap-3 border-2 p-3 text-left ${s.id === serviceId ? "border-bottle bg-bottle text-white" : "border-ink bg-paper"}`}>
              <span className="font-display text-lg font-bold">{s.name} <span className="font-body text-base font-normal">{formatDuration(s.durationMinutes)}</span></span>
              <span className="font-display text-lg font-bold">{formatNaira(s.priceMinor)}</span>
            </button>
          ))}
        </div>
      </section>

      {service ? (
        <section aria-labelledby="s-person" className="flex flex-col gap-2">
          <h2 id="s-person">Who would you like?</h2>
          <div role="radiogroup" aria-labelledby="s-person" className="flex flex-wrap gap-2">
            {[{ id: null as number | null, name: "Anyone available" }, ...people].map((p) => (
              <button key={p.id ?? "any"} type="button" role="radio" aria-checked={p.id === staffId}
                onClick={() => update({ staff: p.id === null ? "any" : String(p.id), time: null })}
                className={`min-h-12 border-2 px-4 font-display text-lg font-bold ${p.id === staffId ? "border-ink bg-ink text-paper" : "border-ink bg-paper"}`}>{p.name}</button>
            ))}
          </div>
        </section>
      ) : null}

      {service ? (
        <section aria-labelledby="s-day" className="flex flex-col gap-2">
          <h2 id="s-day">Which day?</h2>
          <DayPicker today={today} windowDays={data.business.bookingWindowDays} value={date} onChange={(d) => update({ date: d, time: null })} />
        </section>
      ) : null}

      {service && date ? (
        <section aria-labelledby="s-time" className="flex flex-col gap-2">
          <h2 id="s-time">Pick a time on {formatDateLong(date)}</h2>
          <SlotGrid slots={slots.data} loading={slots.isPending} error={slots.isError ? errorMessage(slots.error) : null}
            onRetry={() => void slots.refetch()} value={time} onPick={(t) => update({ time: t })} isToday={date === today} />
        </section>
      ) : null}

      {service && date && time ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 border-t-2 border-ink pt-5">
          <h2>Your details</h2>
          <p className="font-semibold">{service.name}, {formatDateLong(date)} at {formatClock(time)}</p>
          <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
          <TextField label="Phone number" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone}
            hint="So the shop can reach you. Example: 0801 234 5678" autoComplete="tel" />
          <div>
            <label className="flex min-h-12 items-start gap-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-6 w-6 shrink-0"
                aria-invalid={errors.consent ? true : undefined} aria-describedby={errors.consent ? "consent-error" : undefined} />
              <span>I agree that {data.business.name} may save my name and phone number to manage my booking.</span>
            </label>
            {errors.consent ? <p id="consent-error" className="font-semibold text-magenta">Problem: {errors.consent}</p> : null}
          </div>
          {notice ? <p role="alert" className="font-semibold text-magenta">Problem: {notice}</p> : null}
          <Button type="submit" block disabled={book.isPending}>{book.isPending ? "Booking" : "Book this time"}</Button>
        </form>
      ) : notice ? <p role="alert" className="font-semibold text-magenta">Problem: {notice}</p> : null}
    </div>
  );
}
