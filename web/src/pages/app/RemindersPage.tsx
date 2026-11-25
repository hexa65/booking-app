import { useState } from "react";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/ui";
import { useAuth } from "../../app/AuthProvider";
import { useBookings } from "../../hooks/queries";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useNow } from "../../hooks/useNow";
import { errorMessage } from "../../lib/errors";
import { formatClock, formatDateLong } from "../../lib/format";
import { addDays } from "../../lib/time";
import { reminderMessage, whatsAppLink } from "../../lib/whatsapp";

const key = (id: number, date: string): string => `chairly_reminder_${id}_${date}`;
function wasSent(id: number, date: string): boolean { try { return localStorage.getItem(key(id, date)) === "1"; } catch { return false; } }
function markSent(id: number, date: string, sent: boolean): void { try { if (sent) localStorage.setItem(key(id, date), "1"); else localStorage.removeItem(key(id, date)); } catch { /* storage blocked: the tick just will not be remembered */ } }

export default function RemindersPage() {
  useDocumentTitle("Reminders");
  const now = useNow();
  const { user } = useAuth();
  const tomorrow = addDays(now.date, 1);
  const q = useBookings(tomorrow, tomorrow);
  const [, force] = useState(0);
  const rows = q.data?.filter((b) => b.status === "confirmed") ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1>Reminders for {formatDateLong(tomorrow)}</h1>
      <p className="text-moss">Tap "Send on WhatsApp". It opens WhatsApp with the message ready. You press send. Then tick the box so you remember.</p>
      {q.isPending ? <ListSkeleton /> : null}
      {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.data && rows.length === 0 ? <EmptyState title="No bookings tomorrow">Nothing to remind anyone about yet.</EmptyState> : null}
      <ul className="flex flex-col gap-3">
        {rows.map((b) => {
          const message = reminderMessage({ customerName: b.customerName, businessName: user?.businessName ?? "the shop", serviceName: b.serviceName, date: b.date, startTime: b.startTime });
          const sent = wasSent(b.id, b.date);
          return (
            <li key={b.id} className="flex flex-col gap-2 border-2 border-ink bg-paper p-4">
              <p className="font-display text-xl font-bold">{formatClock(b.startTime)}: {b.customerName}</p>
              <p className="whitespace-pre-line text-moss">{message}</p>
              <div className="flex flex-wrap items-center gap-4">
                <a className="inline-flex min-h-12 items-center bg-bottle px-5 font-display text-lg font-bold text-white" target="_blank" rel="noreferrer" href={whatsAppLink(b.customerPhone, message)}>Send on WhatsApp</a>
                <label className="flex min-h-12 items-center gap-2"><input type="checkbox" className="h-6 w-6" checked={sent} onChange={(e) => { markSent(b.id, b.date, e.target.checked); force((n) => n + 1); }} />Sent</label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
