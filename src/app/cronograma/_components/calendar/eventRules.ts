import { CalendarEventOut } from "@/lib/api";
import {
  displayDate,
  eventFlags,
  isoToDate,
  parseEventLabelCategory,
  parseSkipRoutineLabel,
} from "../../_lib/cronogramaShared";

export type CalendarDragEventMeta = {
  eventId: string;
  sourceISO: string;
  eventType: "routine" | "event";
  weekday: number | null;
  eventDate: string | null;
  durationHours: number;
  label: string;
  iconType: "work" | "other";
};

export function isPastPunctualEvent(ev: CalendarEventOut | null | undefined, todayIso: string): boolean {
  if (!ev) return false;
  if (ev.event_type !== "event") return false;
  if (!ev.event_date) return false;
  return ev.event_date < todayIso;
}

export function isPastCalendarCell(cellISO: string, todayIso: string): boolean {
  return cellISO < todayIso;
}

export function getWorkEventCollisionMessage(
  meta: CalendarDragEventMeta,
  toISO: string,
  events: CalendarEventOut[],
): string | null {
  if (meta.iconType !== "work") return null;
  const { hasWork, workEvent } = eventFlags(toISO, events);
  if (!hasWork || !workEvent) return null;
  if (meta.eventType === "event" && workEvent.event_id === meta.eventId) return null;

  const fallbackType = workEvent.event_type === "event" ? "event" : "routine";
  const parsed = parseEventLabelCategory(workEvent.label, fallbackType);
  const eventName = parsed.label || "Trabalho";
  return `Existe ${eventName} de ${workEvent.duration_hours}h nesse dia. Não é possível adicionar outro para o mesmo dia. Apague e adicione um novo se necessário.`;
}

export function listEffectiveEventsForDay(
  iso: string,
  events: CalendarEventOut[],
): CalendarEventOut[] {
  const date = isoToDate(iso);
  const weekday = (date.getDay() + 6) % 7;
  const skippedRoutineIds = new Set<string>();

  for (const event of events) {
    if (event.active_until && iso > event.active_until) continue;
    if (event.event_type !== "event" || event.event_date !== iso) continue;
    const skippedId = parseSkipRoutineLabel(event.label);
    if (skippedId) skippedRoutineIds.add(skippedId);
  }

  const out: CalendarEventOut[] = [];
  for (const event of events) {
    if (event.active_until && iso > event.active_until) continue;
    const matchesRoutine = event.event_type === "routine" && event.weekday === weekday;
    const matchesPunctual = event.event_type === "event" && event.event_date === iso;
    if (!matchesRoutine && !matchesPunctual) continue;
    if (matchesRoutine && skippedRoutineIds.has(event.event_id)) continue;
    if (matchesPunctual && parseSkipRoutineLabel(event.label)) continue;
    out.push(event);
  }

  return out;
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

export function getDailyHoursOverflowMessage(
  meta: CalendarDragEventMeta,
  toISO: string,
  events: CalendarEventOut[],
): string | null {
  const used = listEffectiveEventsForDay(toISO, events)
    .reduce((sum, event) => sum + Number(event.duration_hours || 0), 0);
  const nextTotal = used + Number(meta.durationHours || 0);
  if (nextTotal <= 24) return null;

  return `${displayDate(toISO)} ja tem ${formatHours(used)}h de eventos. Adicionar ${formatHours(meta.durationHours)}h ultrapassa 24h - ajuste os eventos existentes.`;
}

