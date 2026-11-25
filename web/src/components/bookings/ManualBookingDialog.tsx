import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Modal, SelectField, TextField } from "../ui/ui";
import { useToast } from "../ui/toast";
import { useCreateBooking, useServices, useStaff } from "../../hooks/queries";
import { errorMessage } from "../../lib/errors";
import { normalizePhone } from "../../lib/phone";

interface Props { open: boolean; onClose: () => void; defaultDate: string; defaultTime: string; defaultStaffId: number | null; walkIn?: boolean; }

export function ManualBookingDialog(props: Props) {
  return <Modal open={props.open} title={props.walkIn ? "Add a walk-in" : "Add a booking"} onClose={props.onClose}>{props.open ? <Form {...props} /> : null}</Modal>;
}

function Form({ onClose, defaultDate, defaultTime, defaultStaffId, walkIn = false }: Props) {
  const services = useServices();
  const staff = useStaff();
  const create = useCreateBooking();
  const { showToast } = useToast();
  const activeServices = (services.data ?? []).filter((s) => s.active);
  const activeStaff = (staff.data ?? []).filter((s) => s.active);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState(defaultStaffId ? String(defaultStaffId) : "");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const staffForService = activeStaff.filter((s) => !serviceId || s.serviceIds.includes(Number(serviceId)));

  function onSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!serviceId) next.service = "Choose a service.";
    if (!staffId) next.staff = "Choose who does it.";
    if (!date) next.date = "Choose a day.";
    if (!time) next.time = "Choose a time.";
    if (!name.trim()) next.name = "Enter the customer's name.";
    if (normalizePhone(phone) === null) next.phone = "Enter a phone number like 0801 234 5678.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate({ serviceId: Number(serviceId), staffId: Number(staffId), date, startTime: time, customerName: name.trim(), customerPhone: phone, source: walkIn ? "walk_in" : "manual", notes: "" }, {
      onSuccess: () => { showToast("Booking added."); onClose(); },
      onError: (err) => showToast(errorMessage(err), "error"),
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <SelectField label="Service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} error={errors.service}>
        <option value="">Choose a service</option>
        {activeServices.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>)}
      </SelectField>
      <SelectField label="Who does it" value={staffId} onChange={(e) => setStaffId(e.target.value)} error={errors.staff}>
        <option value="">Choose a person</option>
        {staffForService.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </SelectField>
      <TextField label="Day" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      <TextField label="Start time" type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} error={errors.time} />
      <TextField label="Customer name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <TextField label="Customer phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
      <Button type="submit" disabled={create.isPending}>{create.isPending ? "Adding" : walkIn ? "Add walk-in" : "Add booking"}</Button>
    </form>
  );
}
