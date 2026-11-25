import { formatClock, formatDateLong } from "./format";

/** https://wa.me/<digits>?text=<encoded>. The phone must already be in +234... form. */
export function whatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export interface ReminderInput { customerName: string; businessName: string; serviceName: string; date: string; startTime: string; manageUrl?: string; }

export function reminderMessage(i: ReminderInput): string {
  const first = i.customerName.trim().split(/\s+/)[0] ?? "";
  const lines = [`Hello ${first}, this is a reminder from ${i.businessName}.`,
    `Your ${i.serviceName} is ${formatDateLong(i.date)} at ${formatClock(i.startTime)}.`];
  if (i.manageUrl) lines.push(`To cancel or change it: ${i.manageUrl}`);
  lines.push("See you then!");
  return lines.join("\n");
}
