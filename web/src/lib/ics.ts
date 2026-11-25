export interface IcsInput { uid: string; title: string; date: string; startTime: string; endTime: string; description?: string; }
const esc = (t: string): string => t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (date: string, time: string): string => `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;

/** A calendar file using "floating" local time: the appointment shows at the same clock time, wherever the phone is. */
export function buildIcs(i: IcsInput): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Chairly//Booking//EN", "BEGIN:VEVENT", `UID:${i.uid}@chairly`,
    `DTSTAMP:${stamp(i.date, i.startTime)}`, `DTSTART:${stamp(i.date, i.startTime)}`, `DTEND:${stamp(i.date, i.endTime)}`,
    `SUMMARY:${esc(i.title)}`, ...(i.description ? [`DESCRIPTION:${esc(i.description)}`] : []), "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}
