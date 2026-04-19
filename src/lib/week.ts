// Week runs Friday → Thursday. SurePay resets every Friday.
import { addDays, startOfDay, format } from "date-fns";

/** Returns the Friday on or before the given date (start of the SurePay week). */
export function weekStartFriday(d: Date = new Date()): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  // Days back to most recent Friday: Fri=0, Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6
  const back = (day - 5 + 7) % 7;
  return startOfDay(addDays(d, -back));
}

/** Returns the Thursday end of the SurePay week (inclusive). */
export function weekEndThursday(d: Date = new Date()): Date {
  return addDays(weekStartFriday(d), 6);
}

export const fmtWeekKey = (d: Date) => format(d, "yyyy-MM-dd");

/** Last N week-start (Friday) dates, newest first. */
export function lastNWeekStarts(n: number, from: Date = new Date()): Date[] {
  const start = weekStartFriday(from);
  return Array.from({ length: n }, (_, i) => addDays(start, -7 * i));
}

export const POINT_ACTIVITIES: { value: string; label: string; points: number }[] = [
  { value: "par3_booked_with_poc", label: "Book Par 3 Challenge + POC logged in CGT (same week)", points: 2 },
  { value: "poc_watched_sponsorship_video", label: "POC watches Sponsorship video", points: 1 },
  { value: "poc_watched_pricing_video", label: "POC watches Pricing video", points: 1 },
  { value: "poc_watched_swag_video", label: "POC watches SWAG/Products video", points: 1 },
  { value: "cgt_ta_appointment_booked", label: "Book CGT Technical Advisor (TA) appointment (within 2-week window)", points: 1 },
  { value: "auction_referred", label: "Refer an Auction (within 2-week window)", points: 1 },
  { value: "event_worked_as_rep", label: "Work an Event as Representative (after reconciliation)", points: 1 },
];

export const POINTS_TARGET = 12;
export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Returns hours between two HH:MM strings on the same day, or 0. */
export function shiftHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 0;
}
