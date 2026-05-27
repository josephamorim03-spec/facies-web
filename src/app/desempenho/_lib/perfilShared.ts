export type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";
export type Period = "semanal" | "mensal" | "geral";
export type EventCategory = "work" | "other";
export type ThemeListSort = "consistency" | "accuracy_high" | "accuracy_low";

export type HelpPopupPosition = {
  left: number;
  top: number;
  width: number;
};

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DURATIONS = [1, 2, 3, 4, 6, 8, 12, 24];
export const RESCHEDULE_MODES = [
  { value: "suggest", label: "Sugerir" },
  { value: "auto", label: "Automático" },
  { value: "never", label: "Nunca" },
];

export const RETENTION_MIN = 65;
export const RETENTION_DEFAULT = 75;
export const RETENTION_MAX = 85;

export const TAB_KEY = "perfil_tab";
export const PERIOD_SESSION_KEY = "perfil_desempenho_period";
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

export function parseEventLabel(rawLabel: string | null | undefined): {
  category: EventCategory | null;
  label: string;
} {
  const label = (rawLabel ?? "").trim();
  if (label.startsWith(WORK_EVENT_PREFIX)) {
    return { category: "work", label: label.slice(WORK_EVENT_PREFIX.length).trim() };
  }
  if (label.startsWith(OTHER_EVENT_PREFIX)) {
    return { category: "other", label: label.slice(OTHER_EVENT_PREFIX.length).trim() };
  }
  return { category: null, label };
}

export function displayEventLabel(
  rawLabel: string | null | undefined,
  fallbackCategory: EventCategory,
): string {
  const parsed = parseEventLabel(rawLabel);
  if (parsed.label) return parsed.label;
  const category = parsed.category ?? fallbackCategory;
  return category === "work" ? "Trabalho" : "Outros";
}

export function isInternalSkipRoutineEvent(rawLabel: string | null | undefined): boolean {
  const label = (rawLabel ?? "").trim();
  return label.startsWith(SKIP_ROUTINE_PREFIX);
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

export function clampRetentionPct(value: number): number {
  if (Number.isNaN(value)) return RETENTION_DEFAULT;
  return Math.max(RETENTION_MIN, Math.min(RETENTION_MAX, Math.round(value)));
}

export function getHelpPopupPosition(target: HTMLElement): HelpPopupPosition {
  const rect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const popupWidth = Math.min(280, Math.max(220, viewportWidth - 24));
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - popupWidth / 2),
    Math.max(12, viewportWidth - popupWidth - 12),
  );
  const top = Math.max(12, rect.bottom + 8);
  return { left, top, width: popupWidth };
}
