import type { CalendarEventOut } from "@/lib/api";

function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isActiveThrough(event: CalendarEventOut, iso: string): boolean {
  return !event.active_until || iso <= event.active_until;
}

export function getNextOccurrenceIsoForWeekday(weekday: number, todayIso: string): string {
  const date = isoToDate(todayIso);
  const currentWeekday = (date.getDay() + 6) % 7;
  const daysUntilWeekday = (weekday - currentWeekday + 7) % 7;
  date.setDate(date.getDate() + daysUntilWeekday);
  return toIsoDate(date);
}

export function isEffectiveRoutineEvent(
  event: CalendarEventOut,
  todayIso: string,
): boolean {
  if (event.event_type !== "routine" || event.weekday === null) return false;
  const nextOccurrenceIso = getNextOccurrenceIsoForWeekday(event.weekday, todayIso);
  return isActiveThrough(event, nextOccurrenceIso);
}

export function isEffectivePunctualEvent(event: CalendarEventOut): boolean {
  if (event.event_type !== "event" || !event.event_date) return false;
  return isActiveThrough(event, event.event_date);
}

export function getEffectiveRoutineHoursForWeekday(
  events: CalendarEventOut[],
  weekday: number,
  todayIso: string,
): number {
  const nextOccurrenceIso = getNextOccurrenceIsoForWeekday(weekday, todayIso);
  return events
    .filter((event) => event.event_type === "routine" && event.weekday === weekday)
    .filter((event) => isActiveThrough(event, nextOccurrenceIso))
    .reduce((sum, event) => sum + Number(event.duration_hours || 0), 0);
}

export function getEffectivePunctualHoursForDate(
  events: CalendarEventOut[],
  dateIso: string,
): number {
  return events
    .filter((event) => event.event_type === "event" && event.event_date === dateIso)
    .filter((event) => isActiveThrough(event, dateIso))
    .reduce((sum, event) => sum + Number(event.duration_hours || 0), 0);
}

export function filterEffectiveRoutineEvents(
  events: CalendarEventOut[],
  todayIso: string,
): CalendarEventOut[] {
  return events.filter((event) => isEffectiveRoutineEvent(event, todayIso));
}

export function filterEffectivePunctualEvents(events: CalendarEventOut[]): CalendarEventOut[] {
  return events.filter((event) => isEffectivePunctualEvent(event));
}
