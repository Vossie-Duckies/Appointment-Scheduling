// Date and time helpers for the doctor's schedule screens and the
// notifications list. Dates are "YYYY-MM-DD" and times "HH:MM" (or
// "HH:MM:SS" as the API sends them), in the phone's local time.
//
// No React Native imports, so these can be unit-tested
// (__tests__/schedule_test.ts).

// Monday = 0 ... Sunday = 6, the same numbering the API uses for weekdays.
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (value: number) => String(value).padStart(2, "0");

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isoDate(day: Date): string {
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const day = parseIsoDate(iso);
  day.setDate(day.getDate() + days);
  return isoDate(day);
}

// Monday = 0 ... Sunday = 6
export function weekdayIndex(iso: string): number {
  return (parseIsoDate(iso).getDay() + 6) % 7;
}

// "Mon 16 Nov", with the year added when it isn't this year.
export function formatDay(iso: string, today: Date = new Date()): string {
  const day = parseIsoDate(iso);
  const text = `${WEEKDAY_LABELS[weekdayIndex(iso)]} ${day.getDate()} ${MONTH_LABELS[day.getMonth()]}`;
  return day.getFullYear() === today.getFullYear() ? text : `${text} ${day.getFullYear()}`;
}

// "15 May 2000", for dates like a date of birth where the weekday doesn't matter.
export function formatFullDate(iso: string): string {
  const day = parseIsoDate(iso);
  if (Number.isNaN(day.getTime())) return iso;
  return `${day.getDate()} ${FULL_MONTH_LABELS[day.getMonth()]} ${day.getFullYear()}`;
}

const FULL_MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDayRange(start: string, end: string, today: Date = new Date()): string {
  return start === end ? formatDay(start, today) : `${formatDay(start, today)} – ${formatDay(end, today)}`;
}

// "09:00:00" -> "09:00"
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// "09:00" + 30 -> "09:30". Null when the result would pass midnight, because
// a slot has to finish on the day it starts.
export function addMinutes(time: string, minutes: number): string | null {
  const total = toMinutes(time) + minutes;
  return total < 24 * 60 ? fromMinutes(total) : null;
}

// True when the slot or appointment starts later than `now`.
export function startsAfter(date: string, time: string, now: Date = new Date()): boolean {
  const start = parseIsoDate(date);
  const [hours, minutes] = time.split(":").map(Number);
  start.setHours(hours, minutes, 0, 0);
  return start.getTime() > now.getTime();
}

// First and last day of a month written "YYYY-MM".
export function monthBounds(month: string): { first: string; last: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  return { first: `${month}-01`, last: isoDate(new Date(year, monthNumber, 0)) };
}

// The coming Monday (a week ahead when today is Monday).
export function nextMonday(today: string): string {
  return addDays(today, 7 - weekdayIndex(today));
}

// "Mon–Fri", "Mon, Wed, Fri", "every day"
export function describeWeekdays(weekdays: number[]): string {
  const days = [...new Set(weekdays)].sort((a, b) => a - b);
  if (days.length === 7) return "every day";
  const isRun = days.length > 2 && days.every((day, i) => i === 0 || day === days[i - 1] + 1);
  if (isRun) return `${WEEKDAY_LABELS[days[0]]}–${WEEKDAY_LABELS[days[days.length - 1]]}`;
  return days.map((day) => WEEKDAY_LABELS[day]).join(", ");
}

// How many slots "weekly hours" would add at most (the server also skips
// times that have passed, overlaps and time off).
export function countWeeklySlots(
  startDate: string,
  weeks: number,
  weekdays: number[],
  startTime: string,
  endTime: string,
  slotMinutes: number,
): { days: number; perDay: number; total: number } {
  let days = 0;
  for (let offset = 0; offset < weeks * 7; offset++) {
    if (weekdays.includes(weekdayIndex(addDays(startDate, offset)))) days++;
  }
  const span = toMinutes(endTime) - toMinutes(startTime);
  const perDay = span > 0 && slotMinutes > 0 ? Math.floor(span / slotMinutes) : 0;
  return { days, perDay, total: days * perDay };
}

// "just now", "5 min ago", "3 h ago", "yesterday", or the date.
export function timeAgo(isoDateTime: string, now: Date = new Date()): string {
  const then = new Date(isoDateTime);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (Number.isNaN(minutes)) return "";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60 && then.getDate() === now.getDate()) return `${Math.floor(minutes / 60)} h ago`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isoDate(then) === isoDate(yesterday)) return "yesterday";
  return formatDay(isoDate(then), now);
}
