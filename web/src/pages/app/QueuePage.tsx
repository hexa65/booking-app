import { useState } from "react";
import type { FormEvent } from "react";
import { Button, EmptyState, ErrorState, ListSkeleton, SelectField, TextField } from "../../components/ui/ui";
import { useToast } from "../../components/ui/toast";
import { useCallNext, useQueue, useQueueAdd, useQueuePatch, useServices, useStaff } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAuth } from "../../app/AuthProvider";
import { errorMessage } from "../../lib/errors";
import { formatDuration, ordinal } from "../../lib/format";
import { whatsAppLink } from "../../lib/whatsapp";

export default function QueuePage() {
  useDocumentTitle("Queue");
  const q = useQueue(); // polls every 10 seconds while this tab is visible
  const patch = useQueuePatch();
  const callNext = useCallNext();
  const add = useQueueAdd();
  const services = useServices();
  const staff = useStaff();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const waiting = q.data?.filter((e) => e.status === "waiting") ?? [];
  const serving = q.data?.filter((e) => e.status === "in_service") ?? [];
  const link = user ? `${window.location.origin}/b/${user.businessSlug}/queue` : "";

  function onAdd(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!name.trim() || !serviceId) { setFormError("Enter a name and choose a service."); return; }
    setFormError(null);
    add.mutate({ name: name.trim(), phone, serviceId: Number(serviceId) }, { onSuccess: () => { setName(""); setPhone(""); showToast("Added to the queue."); }, onError: (err) => showToast(errorMessage(err), "error") });
  }
  const fail = (err: Error): void => showToast(errorMessage(err), "error");

  return (
    <div className="flex flex-col gap-5">
      <h1>Queue</h1>
      <p className="text-moss">Walk-ins scan or open this link to join: <span className="break-all font-semibold">{link}</span></p>
      {q.isPending ? <ListSkeleton /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : null}

      {q.data ? (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="q-now">
            <h2 id="q-now">In the chair ({serving.length})</h2>
            {serving.length === 0 ? <p className="text-moss">Nobody in a chair right now.</p> : null}
            {serving.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-bottle bg-paper p-4">
                <p><span className="font-display text-xl font-bold">{e.name}</span><br />{e.serviceName}, {formatDuration(e.durationMinutes)}</p>
                <Button onClick={() => patch.mutate({ id: e.id, status: "done" }, { onError: fail })}>Finish</Button>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="q-wait">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="q-wait">Waiting ({waiting.length})</h2>
              <div className="flex flex-wrap items-end gap-2">
                <SelectField label="Call next to" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">Any chair</option>
                  {staff.data?.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </SelectField>
                <Button onClick={() => callNext.mutate(staffId ? Number(staffId) : null, { onError: fail })} disabled={waiting.length === 0 || callNext.isPending}>Call next</Button>
              </div>
            </div>
            {waiting.length === 0 ? <EmptyState title="Nobody is waiting">Walk-ins who join with your link show up here.</EmptyState> : null}
            {waiting.map((e, i) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-paper p-4">
                <p><span className="font-display text-xl font-bold">{ordinal(i + 1)}: {e.name}</span><br />{e.serviceName}, {formatDuration(e.durationMinutes)}</p>
                <div className="flex flex-wrap gap-2">
                  {e.phone ? <a className="inline-flex min-h-12 items-center px-2 font-bold text-bottle underline" target="_blank" rel="noreferrer" href={whatsAppLink(e.phone, `Hello ${e.name.split(" ")[0] ?? ""}, your turn is coming up.`)}>WhatsApp</a> : null}
                  <Button variant="secondary" onClick={() => patch.mutate({ id: e.id, status: "in_service" }, { onError: fail })}>Start</Button>
                  <Button variant="danger" onClick={() => patch.mutate({ id: e.id, status: "left" }, { onError: fail })}>Remove</Button>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      <form onSubmit={onAdd} noValidate className="flex flex-col gap-3 border-t-2 border-ink pt-4">
        <h2>Add someone to the queue</h2>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Phone (optional)" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <SelectField label="Service" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Choose a service</option>
          {services.data?.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
        {formError ? <p role="alert" className="font-semibold text-magenta">Problem: {formError}</p> : null}
        <Button type="submit" variant="secondary" disabled={add.isPending}>Add to queue</Button>
      </form>
    </div>
  );
}
