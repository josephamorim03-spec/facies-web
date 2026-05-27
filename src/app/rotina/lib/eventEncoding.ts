export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DURATIONS = [1, 2, 3, 4, 6, 8, 12, 24];
export const SHOW_DEV_TOKEN_PANEL =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEV_TOKEN_PANEL === "1";
export const RESCHEDULE_MODES = [
  { value: "suggest", label: "Sugerir" },
  { value: "auto", label: "Automático" },
  { value: "never", label: "Nunca" },
];

export type EventCategory = "work" | "other";
export const WORK_EVENT_PREFIX = "__WORK__:";
export const OTHER_EVENT_PREFIX = "__OTHER__:";
export const SKIP_ROUTINE_PREFIX = "__SKIP_ROUTINE__:";

export function toDisplayDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
}

export function encodeEventLabel(label: string, category: EventCategory): string {
  const clean = label.trim();
  const prefix = category === "work" ? WORK_EVENT_PREFIX : OTHER_EVENT_PREFIX;
  return `${prefix}${clean}`;
}

export function parseEventLabel(rawLabel: string | null | undefined): { category: EventCategory | null; label: string } {
  const label = (rawLabel ?? "").trim();
  if (label.startsWith(WORK_EVENT_PREFIX)) {
    return { category: "work", label: label.slice(WORK_EVENT_PREFIX.length).trim() };
  }
  if (label.startsWith(OTHER_EVENT_PREFIX)) {
    return { category: "other", label: label.slice(OTHER_EVENT_PREFIX.length).trim() };
  }
  return { category: null, label };
}

export function displayEventLabel(rawLabel: string | null | undefined, fallbackCategory: EventCategory): string {
  const parsed = parseEventLabel(rawLabel);
  if (parsed.label) return parsed.label;
  const category = parsed.category ?? fallbackCategory;
  return category === "work" ? "Trabalho" : "Outros";
}

export function isInternalSkipRoutineEvent(rawLabel: string | null | undefined): boolean {
  const label = (rawLabel ?? "").trim();
  return label.startsWith(SKIP_ROUTINE_PREFIX);
}

export function isoToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoWeekStart(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addIsoDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
