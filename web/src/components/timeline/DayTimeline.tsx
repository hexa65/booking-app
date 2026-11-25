import { useState } from "react";
import { STAFF_STYLES, STATUS_LABEL, STATUS_MARK } from "../../lib/constants";
import { formatClock } from "../../lib/format";
import { hourMarks, layoutBlocks, nowQuarter, timelineRange, totalQuarters } from "../../lib/timeline";
import type { LocalNow } from "../../lib/time";
import type { BookingRow, Staff } from "../../types";

const QUARTER_PX = 22; // one quarter-hour row

interface DayTimelineProps {
  date: string; bookings: BookingRow[]; staff: Staff[]; now: LocalNow;
  onSelectBooking: (id: number) => void; onPickSlot: (staffId: number, startTime: string) => void;
}

export function DayTimeline({ date, bookings, staff, now, onSelectBooking, onPickSlot }: DayTimelineProps) {
  const range = timelineRange(bookings);
  const rows = totalQuarters(range);
  const marks = hourMarks(range);
  const nowQ = nowQuarter(now, date, range);
  const [phoneStaffId, setPhoneStaffId] = useState<number | null>(null);
  const shownOnPhone = phoneStaffId ?? staff[0]?.id ?? null;
  const height = rows * QUARTER_PX;
  const byId = new Map(bookings.map((b) => [b.id, b]));

  return (
    <div>
      {/* Phone: one staff member at a time. Names are text, so colour is never the only clue. */}
      <div role="tablist" aria-label="Staff" className="mb-3 flex flex-wrap gap-2 md:hidden">
        {staff.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === shownOnPhone} onClick={() => setPhoneStaffId(s.id)}
            className={`min-h-12 border-2 border-ink px-4 font-display text-lg font-bold ${s.id === shownOnPhone ? "bg-ink text-paper" : "bg-paper"}`}>{s.name}</button>
        ))}
      </div>
      <div className="flex border-2 border-ink bg-paper">
        <div className="relative w-16 shrink-0 border-r-2 border-ink" style={{ height: height + 44, paddingTop: 44 }} aria-hidden="true">
          {marks.map((m) => (
            <span key={m.time} className="absolute right-2 font-display text-2xl font-bold leading-none" style={{ top: 44 + m.quarter * QUARTER_PX - 2 }}>{formatClock(m.time).replace(":00", "").replace(" ", "")}</span>
          ))}
        </div>
        <div className="relative flex min-w-0 flex-1">
          {staff.map((s, index) => {
            const style = STAFF_STYLES[index % STAFF_STYLES.length]!;
            const mine = bookings.filter((b) => b.staffId === s.id);
            const blocks = layoutBlocks(mine, range);
            return (
              <div key={s.id} className={`${s.id === shownOnPhone ? "block" : "hidden"} min-w-0 flex-1 border-r border-moss last:border-r-0 md:block`}>
                <p className={`flex h-11 items-center px-2 font-display text-lg font-bold ${style.block}`}>{s.name}</p>
                <div className="relative" style={{ height }}>
                  {marks.map((m) => <div key={m.time} className="absolute inset-x-0 border-t border-moss/40" style={{ top: m.quarter * QUARTER_PX }} aria-hidden="true" />)}
                  {/* Pointer shortcut: tap an empty row to book it. Keyboard users use the "Add booking" button. */}
                  {Array.from({ length: rows }, (_, q) => {
                    const minutes = range.openMinutes + q * 15;
                    const t = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
                    return <button key={q} type="button" tabIndex={-1} aria-hidden="true" onClick={() => onPickSlot(s.id, t)}
                      className="absolute inset-x-0 hover:bg-chalk" style={{ top: q * QUARTER_PX, height: QUARTER_PX }} title={`Book ${formatClock(t)} with ${s.name}`} />;
                  })}
                  {blocks.map((blk) => {
                    const b = byId.get(blk.id);
                    if (!b) return null;
                    const dashed = b.status === "no_show" ? "outline-dashed outline-2 -outline-offset-4 outline-white" : "";
                    return (
                      <button key={blk.id} type="button" onClick={() => onSelectBooking(blk.id)}
                        aria-label={`${formatClock(b.startTime)} to ${formatClock(b.endTime)}, ${b.serviceName}, ${b.customerName}, ${STATUS_LABEL[b.status].toLowerCase()}`}
                        className={`absolute inset-x-1 overflow-hidden px-2 py-1 text-left ${style.block} ${dashed} ${b.status === "completed" ? "opacity-80" : ""}`}
                        style={{ top: blk.startQuarter * QUARTER_PX + 1, height: blk.spanQuarters * QUARTER_PX - 2 }}>
                        <span className="block font-display text-lg font-bold leading-tight">{STATUS_MARK[b.status]}{formatClock(b.startTime)}</span>
                        <span className="block truncate leading-tight">{b.customerName}</span>
                        {blk.spanQuarters >= 3 ? <span className="block truncate text-sm leading-tight">{b.serviceName}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {nowQ !== null ? (
            <div className="pointer-events-none absolute inset-x-0 z-10 border-t-[3px] border-magenta" style={{ top: 44 + nowQ * QUARTER_PX }} aria-hidden="true">
              <span className="absolute -top-3 right-0 bg-magenta px-1 text-sm font-bold text-white">Now</span>
            </div>
          ) : null}
        </div>
      </div>
      {nowQ !== null ? <p className="mt-2 font-semibold text-magenta">Now: {formatClock(now.time)}</p> : null}
    </div>
  );
}
