import type { BookingStatus } from "./index";
export interface TimelineInput { id: number; staffId: number; startTime: string; endTime: string; status: BookingStatus; }
export interface TimelineBlock { id: number; staffId: number; startQuarter: number; spanQuarters: number; startTime: string; endTime: string; status: BookingStatus; }
export interface TimelineRange { openMinutes: number; closeMinutes: number; }
