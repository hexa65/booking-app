import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../../app/AuthProvider";
import { Button, TextField } from "../../components/ui/ui";
import { useCreateService, useCreateStaff, useSaveHours } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { WEEKDAYS } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import { nairaToKobo } from "../../lib/money";

/** One short form: your first service, your first chair, your hours. Then you have a page customers can book. */
export default function SetupPage() {
  useDocumentTitle("Set up your shop");
  const { user } = useAuth();
  const createService = useCreateService();
  const createStaff = useCreateStaff();
  const saveHours = useSaveHours();
  const [service, setService] = useState("Haircut");
  const [duration, setDuration] = useState("40");
  const [price, setPrice] = useState("3000");
  const [person, setPerson] = useState("");
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, true, false]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("19:00");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const link = user ? `${window.location.origin}/b/${user.businessSlug}` : "";

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const next: Record<string, string> = {};
    const minutes = Number(duration);
    const kobo = nairaToKobo(price);
    if (!service.trim()) next.service = "Enter a service name.";
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) next.duration = "Enter whole minutes from 5 to 480.";
    if (kobo === null) next.price = "Enter a price in naira, like 3000.";
    if (!person.trim()) next.person = "Enter a name for the first chair.";
    if (end <= start) next.hours = "Closing time must be after opening time.";
    if (!days.some(Boolean)) next.hours = "Choose at least one day you are open.";
    setErrors(next); setFormError(null);
    if (Object.keys(next).length > 0 || kobo === null) return;
    setBusy(true);
    try {
      const svc = await createService.mutateAsync({ name: service.trim(), durationMinutes: minutes, priceMinor: kobo, active: true });
      const staff = await createStaff.mutateAsync({ name: person.trim(), serviceIds: [svc.id] });
      await saveHours.mutateAsync({ staffId: staff.id, intervals: days.flatMap((on, i) => (on ? [{ weekday: i + 1, startTime: start, endTime: end }] : [])) });
      setDone(true);
    } catch (err: unknown) { setFormError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
        <h1>Your booking page is live</h1>
        <p>Customers can book at:</p>
        <p className="break-all border-2 border-ink bg-paper p-3 font-display text-xl font-bold">{link}</p>
        <Link to={`/b/${user?.businessSlug ?? ""}`} className="font-bold text-bottle underline">Open it and try a booking</Link>
        <Link to="/app" className="flex min-h-12 items-center justify-center bg-bottle px-5 font-display text-lg font-bold text-white">Go to my dashboard</Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-1">Set up {user?.businessName ?? "your shop"}</h1>
      <p className="mb-5 text-moss">Three quick things. You can change all of them later.</p>
      <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-3"><legend className="mb-1 font-display text-xl font-bold">1. Your first service</legend>
          <TextField label="Name" value={service} onChange={(e) => setService(e.target.value)} error={errors.service} />
          <TextField label="How long (minutes)" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} error={errors.duration} />
          <TextField label="Price (₦)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} />
        </fieldset>
        <fieldset className="flex flex-col gap-3"><legend className="mb-1 font-display text-xl font-bold">2. Your first chair</legend>
          <TextField label="Who cuts hair? (your name is fine)" value={person} onChange={(e) => setPerson(e.target.value)} error={errors.person} />
        </fieldset>
        <fieldset className="flex flex-col gap-2"><legend className="mb-1 font-display text-xl font-bold">3. When are you open?</legend>
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6" checked={days[i]} onChange={(e) => setDays((cur) => cur.map((v, j) => (j === i ? e.target.checked : v)))} />{d}</label>
          ))}
          <TextField label="Opens" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <TextField label="Closes" type="time" value={end} onChange={(e) => setEnd(e.target.value)} error={errors.hours} />
        </fieldset>
        {formError ? <p role="alert" className="font-semibold text-magenta">Problem: {formError}</p> : null}
        <Button type="submit" disabled={busy} block>{busy ? "Setting up" : "Create my booking page"}</Button>
      </form>
    </div>
  );
}
