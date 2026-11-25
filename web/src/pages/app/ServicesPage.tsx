import { useState } from "react";
import type { FormEvent } from "react";
import { Button, ConfirmDialog, EmptyState, ErrorState, ListSkeleton, Modal, TextField } from "../../components/ui/ui";
import { useToast } from "../../components/ui/toast";
import { useCreateService, useDeleteService, useServices, useUpdateService } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { errorMessage } from "../../lib/errors";
import { formatDuration, formatNaira } from "../../lib/format";
import { nairaToKobo } from "../../lib/money";
import type { Service } from "../../types";

export default function ServicesPage() {
  useDocumentTitle("Services");
  const q = useServices();
  const update = useUpdateService();
  const del = useDeleteService();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [removing, setRemoving] = useState<Service | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1>Services</h1><Button onClick={() => setEditing("new")}>Add a service</Button></div>
      {q.isPending ? <ListSkeleton /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.data && q.data.length === 0 ? <EmptyState title="No services yet">Add the first thing customers can book, like a haircut.</EmptyState> : null}
      <ul className="flex flex-col gap-3">
        {q.data?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-paper p-4">
            <div>
              <p className="font-display text-xl font-bold">{s.name} {s.active ? null : <span className="font-body text-base text-moss">(switched off)</span>}</p>
              <p className="text-moss">{formatDuration(s.durationMinutes)}, {formatNaira(s.priceMinor)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditing(s)}>Edit</Button>
              <Button variant="secondary" onClick={() => update.mutate({ id: s.id, input: { active: !s.active } }, { onSuccess: () => showToast(s.active ? "Service switched off." : "Service switched on."), onError: (e) => showToast(errorMessage(e), "error") })}>
                {s.active ? "Switch off" : "Switch on"}
              </Button>
              <Button variant="danger" onClick={() => setRemoving(s)}>Delete</Button>
            </div>
          </li>
        ))}
      </ul>
      <ServiceForm editing={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={removing !== null} title="Delete this service?" message="If it already has bookings, it is switched off instead, so your history stays correct." confirmLabel="Delete service" danger busy={del.isPending}
        onConfirm={() => { if (removing) del.mutate(removing.id, { onSuccess: () => { showToast("Service removed."); setRemoving(null); }, onError: (e) => { showToast(errorMessage(e), "error"); setRemoving(null); } }); }}
        onCancel={() => setRemoving(null)} />
    </div>
  );
}

function ServiceForm({ editing, onClose }: { editing: Service | "new" | null; onClose: () => void }) {
  return <Modal open={editing !== null} title={editing === "new" ? "Add a service" : "Edit service"} onClose={onClose}>{editing !== null ? <FormBody editing={editing} onClose={onClose} /> : null}</Modal>;
}
function FormBody({ editing, onClose }: { editing: Service | "new"; onClose: () => void }) {
  const create = useCreateService();
  const update = useUpdateService();
  const { showToast } = useToast();
  const existing = editing === "new" ? null : editing;
  const [name, setName] = useState(existing?.name ?? "");
  const [duration, setDuration] = useState(existing ? String(existing.durationMinutes) : "30");
  const [price, setPrice] = useState(existing ? String(existing.priceMinor / 100) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const next: Record<string, string> = {};
    const minutes = Number(duration);
    const kobo = nairaToKobo(price);
    if (!name.trim()) next.name = "Enter a name.";
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) next.duration = "Enter whole minutes from 5 to 480.";
    if (kobo === null) next.price = "Enter a price in naira, like 3000.";
    setErrors(next);
    if (Object.keys(next).length > 0 || kobo === null) return;
    const done = { onSuccess: () => { showToast("Service saved."); onClose(); }, onError: (err: Error) => showToast(errorMessage(err), "error") };
    if (existing) update.mutate({ id: existing.id, input: { name: name.trim(), durationMinutes: minutes, priceMinor: kobo } }, done);
    else create.mutate({ name: name.trim(), durationMinutes: minutes, priceMinor: kobo, active: true }, done);
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <TextField label="How long (minutes)" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} error={errors.duration} />
      <TextField label="Price (₦)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} hint="Stored exactly, in kobo, behind the scenes." />
      <Button type="submit" disabled={create.isPending || update.isPending}>Save service</Button>
    </form>
  );
}
