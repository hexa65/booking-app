import { useState } from "react";
import type { FormEvent } from "react";
import { HoursEditor } from "../../components/staff/HoursEditor";
import { TimeOffEditor } from "../../components/staff/TimeOffEditor";
import { Button, EmptyState, ErrorState, ListSkeleton, Modal, TextField } from "../../components/ui/ui";
import { useToast } from "../../components/ui/toast";
import { useCreateStaff, useServices, useStaff, useUpdateStaff } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { STAFF_STYLES } from "../../lib/constants";
import { errorMessage } from "../../lib/errors";
import type { Staff } from "../../types";

export default function StaffPage() {
  useDocumentTitle("Staff");
  const q = useStaff();
  const services = useServices();
  const update = useUpdateStaff();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [hoursFor, setHoursFor] = useState<Staff | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1>Staff</h1><Button onClick={() => setEditing("new")}>Add a person</Button></div>
      {q.isPending ? <ListSkeleton /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.data && q.data.length === 0 ? <EmptyState title="No staff yet">Add the people who cut hair, so customers can pick a time with them.</EmptyState> : null}
      <ul className="flex flex-col gap-3">
        {q.data?.map((s, i) => (
          <li key={s.id} className={`flex flex-wrap items-center justify-between gap-3 border-2 bg-paper p-4 ${STAFF_STYLES[i % STAFF_STYLES.length]!.chip}`}>
            <div>
              <p className="font-display text-xl font-bold">{s.name} {s.active ? null : <span className="font-body text-base text-moss">(not working)</span>}</p>
              <p className="text-moss">{s.serviceIds.length === 0 ? "Offers no services yet" : `Offers ${s.serviceIds.length} services`}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditing(s)}>Edit</Button>
              <Button variant="secondary" onClick={() => setHoursFor(s)}>Hours and days off</Button>
              <Button variant="secondary" onClick={() => update.mutate({ id: s.id, input: { active: !s.active } }, { onSuccess: () => showToast("Saved."), onError: (e) => showToast(errorMessage(e), "error") })}>{s.active ? "Mark not working" : "Mark working"}</Button>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={editing !== null} title={editing === "new" ? "Add a person" : "Edit person"} onClose={() => setEditing(null)}>
        {editing !== null ? <StaffForm editing={editing} services={services.data ?? []} onClose={() => setEditing(null)} /> : null}
      </Modal>
      <Modal open={hoursFor !== null} title={hoursFor ? `${hoursFor.name}: hours and days off` : ""} onClose={() => setHoursFor(null)}>
        {hoursFor ? <div className="flex flex-col gap-6"><HoursEditor staffId={hoursFor.id} /><section><h2 className="mb-2">Days off</h2><TimeOffEditor staffId={hoursFor.id} /></section></div> : null}
      </Modal>
    </div>
  );
}

function StaffForm({ editing, services, onClose }: { editing: Staff | "new"; services: { id: number; name: string; active: boolean }[]; onClose: () => void }) {
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const { showToast } = useToast();
  const existing = editing === "new" ? null : editing;
  const [name, setName] = useState(existing?.name ?? "");
  const [ids, setIds] = useState<number[]>(existing?.serviceIds ?? []);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!name.trim()) { setError("Enter a name."); return; }
    setError(null);
    const done = { onSuccess: () => { showToast("Saved."); onClose(); }, onError: (err: Error) => showToast(errorMessage(err), "error") };
    if (existing) update.mutate({ id: existing.id, input: { name: name.trim(), serviceIds: ids } }, done);
    else create.mutate({ name: name.trim(), serviceIds: ids }, done);
  }
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={error ?? undefined} />
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-semibold">Services this person offers</legend>
        {services.length === 0 ? <p className="text-moss">Add services first, then choose them here.</p> : null}
        {services.map((s) => (
          <label key={s.id} className="flex min-h-12 items-center gap-3">
            <input type="checkbox" className="h-6 w-6" checked={ids.includes(s.id)} onChange={(e) => setIds((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))} />
            <span>{s.name}{s.active ? "" : " (switched off)"}</span>
          </label>
        ))}
      </fieldset>
      <Button type="submit" disabled={create.isPending || update.isPending}>Save person</Button>
    </form>
  );
}
