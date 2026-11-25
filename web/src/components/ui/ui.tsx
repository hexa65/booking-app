import { useEffect, useId, useRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { STATUS_LABEL, STATUS_MARK } from "../../lib/constants";
import type { BookingStatus } from "../../types";

type Variant = "primary" | "secondary" | "danger" | "ghost";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; block?: boolean; }
const VARIANTS: Record<Variant, string> = {
  primary: "bg-bottle text-white border-2 border-bottle hover:bg-ink hover:border-ink",
  secondary: "bg-paper text-ink border-2 border-ink hover:bg-chalk",
  danger: "bg-paper text-magenta border-2 border-magenta hover:bg-chalk",
  ghost: "bg-transparent text-bottle border-2 border-transparent underline hover:text-ink",
};
export function Button({ variant = "primary", block = false, className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`min-h-12 rounded-md px-5 text-lg font-bold disabled:opacity-50 ${VARIANTS[variant]} ${block ? "w-full" : ""} ${className}`} {...rest} />;
}

interface ShellProps { id: string; label: string; error?: string | undefined; hint?: string | undefined; children: ReactNode; }
function FieldShell({ id, label, error, hint, children }: ShellProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">{label}</label>
      {hint ? <p id={`${id}-hint`} className="text-moss">{hint}</p> : null}
      {children}
      {error ? <p id={`${id}-error`} className="font-semibold text-magenta">Problem: {error}</p> : null}
    </div>
  );
}
const INPUT = "min-h-12 w-full rounded-md border-2 border-ink bg-paper px-3 text-lg";
function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return ids || undefined;
}
interface FieldExtras { label: string; error?: string | undefined; hint?: string | undefined; }
export function TextField({ label, error, hint, ...rest }: FieldExtras & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <FieldShell id={id} label={label} error={error} hint={hint}><input id={id} className={INPUT} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...rest} /></FieldShell>;
}
export function SelectField({ label, error, hint, children, ...rest }: FieldExtras & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return <FieldShell id={id} label={label} error={error} hint={hint}><select id={id} className={INPUT} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...rest}>{children}</select></FieldShell>;
}
export function TextAreaField({ label, error, hint, ...rest }: FieldExtras & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return <FieldShell id={id} label={label} error={error} hint={hint}><textarea id={id} className={`${INPUT} py-2`} rows={3} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...rest} /></FieldShell>;
}

export function Skeleton({ className = "h-6 w-full" }: { className?: string }) { return <div aria-hidden="true" className={`skeleton ${className}`} />; }
export function ListSkeleton({ rows = 4, rowClass = "h-16" }: { rows?: number; rowClass?: string }) {
  return <div role="status" aria-label="Loading" className="flex flex-col gap-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={`${rowClass} w-full`} />)}</div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border-2 border-magenta bg-paper p-4">
      <p className="mb-3 font-semibold">Problem: {message}</p>
      {onRetry ? <Button variant="secondary" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="border-2 border-dashed border-moss bg-paper p-6"><h2 className="mb-1">{title}</h2><div className="text-moss">{children}</div></div>;
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  confirmed: "border-2 border-ink", completed: "border-2 border-bottle text-bottle",
  cancelled: "border-2 border-moss text-moss line-through", no_show: "border-2 border-dashed border-magenta text-magenta",
};
export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`inline-block bg-paper px-2 py-0.5 text-base font-bold ${STATUS_STYLE[status]}`}>{STATUS_MARK[status]}{STATUS_LABEL[status]}</span>;
}

interface ModalProps { open: boolean; title: string; onClose: () => void; children: ReactNode; }
/** The browser's native <dialog>: focus is trapped and Escape works for free. */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} className="m-auto w-[min(34rem,calc(100vw-1.5rem))] max-h-[92vh] overflow-y-auto border-2 border-ink bg-paper p-5 text-ink backdrop:bg-ink/60">
      {open ? (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 id={titleId}>{title}</h2>
            <Button variant="secondary" onClick={onClose} aria-label="Close">Close</Button>
          </div>
          {children}
        </>
      ) : null}
    </dialog>
  );
}

interface ConfirmProps { open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void; }
export function ConfirmDialog({ open, title, message, confirmLabel, danger = false, busy = false, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="mb-5">{message}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>{busy ? "Please wait" : confirmLabel}</Button>
        <Button variant="secondary" onClick={onCancel}>Keep it</Button>
      </div>
    </Modal>
  );
}
