import { useState } from "react";
import { Button, EmptyState, ErrorState, ListSkeleton, Modal, TextAreaField, TextField } from "../../components/ui/ui";
import { useToast } from "../../components/ui/toast";
import { useCustomers, useSaveCustomerNotes } from "../../hooks/queries";
import { useDebounce } from "../../hooks/useDebounce";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { RISK_LABEL, noShowRisk } from "../../lib/clients";
import { errorMessage } from "../../lib/errors";
import { formatDayShort } from "../../lib/format";
import { whatsAppLink } from "../../lib/whatsapp";
import type { CustomerWithStats } from "../../types";

export default function ClientsPage() {
  useDocumentTitle("Clients");
  const [search, setSearch] = useState("");
  const q = useCustomers(useDebounce(search.trim()));
  const [editing, setEditing] = useState<CustomerWithStats | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <h1>Clients</h1>
      <TextField label="Search by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
      {q.isPending ? <ListSkeleton /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.data && q.data.length === 0 ? <EmptyState title={search ? "No clients match" : "No clients yet"}>{search ? "Try a different name or number." : "Clients appear here after their first booking."}</EmptyState> : null}
      <ul className="flex flex-col gap-3">
        {q.data?.map((c) => {
          const risk = noShowRisk(c.visitCount, c.noShowCount);
          return (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-paper p-4">
              <div>
                <p className="font-display text-xl font-bold">{c.name}</p>
                <p className="text-moss">{c.phone}</p>
                <p>{c.visitCount} visits, {c.noShowCount} no-shows{c.lastVisitDate ? `, last visit ${formatDayShort(c.lastVisitDate)}` : ""}</p>
                {risk !== "none" ? <p className={`mt-1 inline-block border-2 px-2 font-bold ${risk === "high" ? "border-dashed border-magenta text-magenta" : "border-ink"}`}>{risk === "high" ? "! " : ""}{RISK_LABEL[risk]}</p> : null}
                {c.notes ? <p className="mt-1 text-moss">Note: {c.notes}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <a className="inline-flex min-h-12 items-center px-2 font-bold text-bottle underline" target="_blank" rel="noreferrer" href={whatsAppLink(c.phone, `Hello ${c.name.split(" ")[0] ?? ""}, `)}>WhatsApp</a>
                <Button variant="secondary" onClick={() => setEditing(c)}>Edit note</Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Modal open={editing !== null} title={editing ? `Note about ${editing.name}` : ""} onClose={() => setEditing(null)}>
        {editing ? <NoteForm key={editing.id} client={editing} onClose={() => setEditing(null)} /> : null}
      </Modal>
    </div>
  );
}

function NoteForm({ client, onClose }: { client: CustomerWithStats; onClose: () => void }) {
  const save = useSaveCustomerNotes();
  const { showToast } = useToast();
  const [notes, setNotes] = useState(client.notes);
  return (
    <div className="flex flex-col gap-3">
      <TextAreaField label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} hint="For example: likes a low fade, prefers Tunde." />
      <Button onClick={() => save.mutate({ id: client.id, notes }, { onSuccess: () => { showToast("Note saved."); onClose(); }, onError: (e) => showToast(errorMessage(e), "error") })} disabled={save.isPending}>Save note</Button>
    </div>
  );
}
