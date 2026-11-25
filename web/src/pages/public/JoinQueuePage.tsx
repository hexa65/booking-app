import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, EmptyState, ErrorState, ListSkeleton, SelectField, TextField } from "../../components/ui/ui";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useJoinQueue, usePublicBusiness } from "../../hooks/queries";
import { errorMessage } from "../../lib/errors";
import { formatDuration, formatNaira } from "../../lib/format";
import { normalizePhone } from "../../lib/phone";

export function JoinQueuePage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const q = usePublicBusiness(slug);
  const join = useJoinQueue(slug);
  useDocumentTitle("Join the queue");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (q.isPending) return <ListSkeleton rows={3} />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;
  const { business, services } = q.data;
  if (services.length === 0) return <EmptyState title="Queue not available">This shop has not added services yet.</EmptyState>;

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your name.";
    if (normalizePhone(phone) === null) next.phone = "Enter a phone number like 0801 234 5678.";
    if (!serviceId) next.service = "Choose a service.";
    if (!consent) next.consent = "Please agree so the shop can save your details.";
    setErrors(next); setFormError(null);
    if (Object.keys(next).length > 0) return;
    try {
      const res = await join.mutateAsync({ name: name.trim(), phone, serviceId: Number(serviceId), consent: true });
      navigate(`/queue/${res.token}`);
    } catch (err: unknown) { setFormError(errorMessage(err)); }
  }

  return (
    <div>
      <h1 className="mb-1">Join the queue at {business.name}</h1>
      <p className="mb-5 text-moss">Wait where you like. This page tells you when you are close. Want a fixed time instead? <Link className="font-bold text-bottle underline" to={`/b/${slug}/book`}>Book a time</Link></p>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
        <TextField label="Phone number" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} autoComplete="tel" />
        <SelectField label="Service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} error={errors.service}>
          <option value="">Choose a service</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}, {formatDuration(s.durationMinutes)}, {formatNaira(s.priceMinor)}</option>)}
        </SelectField>
        <div>
          <label className="flex min-h-12 items-start gap-3">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-6 w-6 shrink-0" />
            <span>I agree that {business.name} may save my name and phone number for the queue.</span>
          </label>
          {errors.consent ? <p className="font-semibold text-magenta">Problem: {errors.consent}</p> : null}
        </div>
        {formError ? <p role="alert" className="font-semibold text-magenta">Problem: {formError}</p> : null}
        <Button type="submit" block disabled={join.isPending}>{join.isPending ? "Joining" : "Join the queue"}</Button>
      </form>
    </div>
  );
}
