import { useState } from "react";
import type { FormEvent } from "react";
import { Button, ErrorState, ListSkeleton, SelectField, TextField } from "../../components/ui/ui";
import { useToast } from "../../components/ui/toast";
import { usePilot, useSettings, useUpdateSettings } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { errorMessage } from "../../lib/errors";
import { bookingsService } from "../../services/bookings";
import type { Settings } from "../../types";

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const q = useSettings();
  if (q.isPending) return <ListSkeleton />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  return <SettingsForm settings={q.data} />;
}

function SettingsForm({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const pilot = usePilot();
  const { showToast } = useToast();
  const [name, setName] = useState(settings.name);
  const [step, setStep] = useState(String(settings.slotStepMinutes));
  const [lead, setLead] = useState(String(settings.leadMinutes));
  const [buffer, setBuffer] = useState(String(settings.bufferMinutes));
  const [windowDays, setWindowDays] = useState(String(settings.bookingWindowDays));
  const [cutoff, setCutoff] = useState(String(settings.cancelCutoffHours));
  const [problem, setProblem] = useState<string | null>(null);
  const bookingLink = `${window.location.origin}/b/${settings.slug}`;

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const nums = [lead, buffer, windowDays, cutoff].map(Number);
    if (name.trim().length < 2 || nums.some((n) => !Number.isInteger(n) || n < 0)) { setProblem("Check the shop name and that every number is a whole number."); return; }
    setProblem(null);
    update.mutate({ name: name.trim(), slotStepMinutes: Number(step), leadMinutes: nums[0], bufferMinutes: nums[1], bookingWindowDays: nums[2], cancelCutoffHours: nums[3] },
      { onSuccess: () => showToast("Settings saved."), onError: (err) => showToast(errorMessage(err), "error") });
  }
  async function copy(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); showToast("Link copied."); } catch { showToast("Could not copy. Select the link and copy it by hand.", "error"); }
  }
  async function exportCsv(): Promise<void> {
    try {
      const blob = await bookingsService.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "bookings.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) { showToast(errorMessage(err), "error"); }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h1>Settings</h1>
      <section className="flex flex-col gap-2">
        <h2>Your links</h2>
        <p>Booking page: <span className="break-all font-semibold">{bookingLink}</span></p>
        <div><Button variant="secondary" onClick={() => void copy(bookingLink)}>Copy booking link</Button></div>
        <p>Walk-in queue: <span className="break-all font-semibold">{bookingLink}/queue</span></p>
        <div><Button variant="secondary" onClick={() => void copy(`${bookingLink}/queue`)}>Copy queue link</Button></div>
        <p className="text-moss">Put the queue link in a QR code at your door, using any free QR maker.</p>
      </section>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <h2>Booking rules</h2>
        <TextField label="Shop name" value={name} onChange={(e) => setName(e.target.value)} />
        <SelectField label="Time between bookable times (minutes)" value={step} onChange={(e) => setStep(e.target.value)}>
          {[5, 10, 15, 20, 30, 60].map((n) => <option key={n} value={n}>{n}</option>)}
        </SelectField>
        <TextField label="Shortest notice for online bookings (minutes)" inputMode="numeric" value={lead} onChange={(e) => setLead(e.target.value)} />
        <TextField label="Cleaning time after each booking (minutes)" inputMode="numeric" value={buffer} onChange={(e) => setBuffer(e.target.value)} />
        <TextField label="How many days ahead customers can book" inputMode="numeric" value={windowDays} onChange={(e) => setWindowDays(e.target.value)} />
        <TextField label="Customers can cancel up to this many hours before" inputMode="numeric" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
        {problem ? <p role="alert" className="font-semibold text-magenta">Problem: {problem}</p> : null}
        <Button type="submit" disabled={update.isPending}>Save settings</Button>
      </form>
      <section className="flex flex-col gap-2 border-t-2 border-ink pt-4">
        <h2>Pilot numbers</h2>
        {pilot.isPending ? <ListSkeleton rows={2} rowClass="h-8" /> : null}
        {pilot.isError ? <ErrorState message={errorMessage(pilot.error)} onRetry={() => void pilot.refetch()} /> : null}
        {pilot.data ? (
          <>
            <ul>{pilot.data.milestones.map((m) => <li key={m.name}>{m.name.replace(/_/g, " ")}: {m.at}</li>)}</ul>
            <p className="font-semibold">Online bookings received per week</p>
            {pilot.data.bookingsPerWeek.length === 0 ? <p className="text-moss">None yet.</p> : <ul>{pilot.data.bookingsPerWeek.map((w) => <li key={w.week}>Week of {w.week}: {w.bookings}</li>)}</ul>}
          </>
        ) : null}
        <div><Button variant="secondary" onClick={() => void exportCsv()}>Download bookings as CSV</Button></div>
      </section>
    </div>
  );
}
