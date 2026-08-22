import {
  CalendarEventOut,
  DirectedStudyListItem,
  ReviewTask,
} from "@/lib/api";
import { AREA_VAR, AREA_FULL_EXAM_VAR } from "@/lib/areaColors";

export type Area = "GO" | "PD" | "MP" | "CG" | "CM" | "OU";

// Single source of truth — re-exported from the canonical area palette in lib/areaColors.
export const AREA_COLORS: Record<string, string> = AREA_VAR;
export const FULL_EXAM_COLOR = AREA_FULL_EXAM_VAR;
export const STUDY_KIND_TOPIC = "topic";
export const STUDY_KIND_FULL_EXAM = "full_exam";
export const FULL_EXAM_TYPE_LABELS: Record<string, string> = {
  acesso_direto: "Acesso Direto",
  r_plus: "R+",
};
export const VALID_AREAS: Area[] = ["GO", "PD", "MP", "CG", "CM", "OU"];

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function diffDays(a: string, b: string): number {
  return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / 86400000);
}
/** Convert YYYY-MM-DD to DD-MM-YYYY for display */
export function displayDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
}
export function normalizeThemeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function findSinglePrefixThemeMatch(inputKey: string, themeMap: Map<string, string>): string | null {
  if (!inputKey || inputKey.length < 4) return null;
  const matches = Array.from(themeMap.entries()).filter(([existingKey]) =>
    existingKey.startsWith(inputKey) || inputKey.startsWith(existingKey)
  );
  if (matches.length !== 1) return null;
  return matches[0][1];
}
export function buildStudyMap(studies: DirectedStudyListItem[]): Map<string, DirectedStudyListItem> {
  return new Map(studies.map((s) => [s.study_id, s]));
}
export function toLocalDateKey(isoDatetime: string): string {
  const d = new Date(isoDatetime);
  if (isNaN(d.getTime())) return isoDatetime.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildStudiesByDate(studies: DirectedStudyListItem[]): Record<string, DirectedStudyListItem[]> {
  const map: Record<string, DirectedStudyListItem[]> = {};
  for (const s of studies) {
    const key = toLocalDateKey(s.performed_at);
    map[key] = map[key] ?? [];
    map[key].push(s);
  }
  return map;
}

type TopicDisplayLike = {
  area?: string | null;
  theme?: string | null;
  subtheme?: string | null;
};

export function topicPrimaryLabel(topic: TopicDisplayLike): string {
  return String(topic.subtheme ?? topic.theme ?? "").trim();
}

export function topicSecondaryLabel(topic: TopicDisplayLike): string | null {
  const primary = topicPrimaryLabel(topic);
  const parentTheme = String(topic.theme ?? "").trim();
  if (!primary) return null;
  if (!topic.subtheme) return null;
  return parentTheme && parentTheme !== primary ? parentTheme : null;
}

export function sameTopicIdentity(
  left: TopicDisplayLike | null | undefined,
  right: TopicDisplayLike | null | undefined,
): boolean {
  if (!left || !right) return false;
  const leftArea = String(left.area ?? "").trim().toUpperCase();
  const rightArea = String(right.area ?? "").trim().toUpperCase();
  if (leftArea !== rightArea) return false;
  const leftTheme = String(left.theme ?? "").trim();
  const rightTheme = String(right.theme ?? "").trim();
  if (leftTheme !== rightTheme) return false;
  const leftSubtheme = String(left.subtheme ?? "").trim();
  const rightSubtheme = String(right.subtheme ?? "").trim();
  if (!leftSubtheme && !rightSubtheme) return true;
  return leftSubtheme === rightSubtheme;
}

export function isFullExamStudy(study: DirectedStudyListItem): boolean {
  return study.study_kind === STUDY_KIND_FULL_EXAM;
}

export function isTopicStudy(study: DirectedStudyListItem): boolean {
  return study.study_kind !== STUDY_KIND_FULL_EXAM;
}

export function countsAsFinalizedReviewCards(study: DirectedStudyListItem): boolean {
  if (!study.is_review) return false;
  return typeof study.import_session_id === "string" && study.import_session_id.trim().length > 0;
}

export function getRevisionNumber(task: ReviewTask, studies: DirectedStudyListItem[], studyMap: Map<string, DirectedStudyListItem>): number {
  const src = studyMap.get(task.source_study_id);
  if (!src) return 1;
  const sorted = studies
    .filter((s) => isTopicStudy(s) && sameTopicIdentity(s, task))
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
  return sorted.findIndex((s) => s.study_id === src.study_id) + 1;
}
/** Cumulative accuracy across all study sessions (initial + reviews) for the same topic. */
export function getAccuracy(task: ReviewTask, studies: DirectedStudyListItem[]): number | null {
  const topicStudies = studies.filter((s) => isTopicStudy(s) && sameTopicIdentity(s, task));
  if (topicStudies.length === 0) return null;
  const totalQ = topicStudies.reduce((sum, s) => sum + s.total_questions, 0);
  const correctQ = topicStudies.reduce((sum, s) => sum + s.correct_questions, 0);
  return totalQ === 0 ? null : Math.round((correctQ / totalQ) * 100);
}

const WORK_EVENT_PREFIX = "__WORK__:";
const OTHER_EVENT_PREFIX = "__OTHER__:";
const SKIP_ROUTINE_PREFIX = "__SKIP_ROUTINE__:";

export function stripEventLabelCategoryPrefix(rawLabel: string | null | undefined): string {
  const label = (rawLabel ?? "").trim();
  if (label.startsWith(WORK_EVENT_PREFIX)) {
    return label.slice(WORK_EVENT_PREFIX.length).trim();
  }
  if (label.startsWith(OTHER_EVENT_PREFIX)) {
    return label.slice(OTHER_EVENT_PREFIX.length).trim();
  }
  return label;
}

export function encodeEventLabelCategory(
  rawLabel: string | null | undefined,
  iconType: "work" | "other",
): string {
  const clean = stripEventLabelCategoryPrefix(rawLabel);
  const prefix = iconType === "work" ? WORK_EVENT_PREFIX : OTHER_EVENT_PREFIX;
  return `${prefix}${clean}`;
}

export function encodeSkipRoutineLabel(eventId: string): string {
  return `${SKIP_ROUTINE_PREFIX}${eventId}`;
}

export function parseSkipRoutineLabel(rawLabel: string | null | undefined): string | null {
  const label = (rawLabel ?? "").trim();
  if (!label.startsWith(SKIP_ROUTINE_PREFIX)) return null;
  const routineId = label.slice(SKIP_ROUTINE_PREFIX.length).trim();
  return routineId || null;
}

export function parseEventLabelCategory(
  rawLabel: string | null | undefined,
  fallbackType: "routine" | "event",
): { isWork: boolean; label: string } {
  const label = (rawLabel ?? "").trim();
  if (label.startsWith(WORK_EVENT_PREFIX)) {
    return { isWork: true, label: label.slice(WORK_EVENT_PREFIX.length).trim() };
  }
  if (label.startsWith(OTHER_EVENT_PREFIX)) {
    return { isWork: false, label: label.slice(OTHER_EVENT_PREFIX.length).trim() };
  }
  return { isWork: fallbackType === "routine", label };
}

export function normalizedEventSignature(
  rawLabel: string | null | undefined,
  fallbackType: "routine" | "event",
): { isWork: boolean; label: string } {
  const parsed = parseEventLabelCategory(rawLabel, fallbackType);
  return {
    isWork: parsed.isWork,
    label: parsed.label.trim().replace(/\s+/g, " ").toLocaleLowerCase(),
  };
}

export function eventFlags(iso: string, events: CalendarEventOut[]): {
  hasWork: boolean;
  hasOther: boolean;
  workLabels: string[];
  otherLabels: string[];
  workEvent: CalendarEventOut | null;
  otherEvent: CalendarEventOut | null;
} {
  const d = isoToDate(iso);
  const weekday = (d.getDay() + 6) % 7;
  let hasWork = false;
  let hasOther = false;
  const workLabels: string[] = [];
  const otherLabels: string[] = [];
  let workEvent: CalendarEventOut | null = null;
  let otherEvent: CalendarEventOut | null = null;
  const skippedRoutineIds = new Set<string>();

  for (const ev of events) {
    if (ev.active_until && iso > ev.active_until) continue;
    if (ev.event_type !== "event" || ev.event_date !== iso) continue;
    const skippedId = parseSkipRoutineLabel(ev.label);
    if (skippedId) skippedRoutineIds.add(skippedId);
  }

  for (const ev of events) {
    if (ev.active_until && iso > ev.active_until) continue;
    const matchesRoutine = ev.event_type === "routine" && ev.weekday === weekday;
    const matchesPunctual = ev.event_type === "event" && ev.event_date === iso;
    if (!matchesRoutine && !matchesPunctual) continue;
    if (matchesRoutine && skippedRoutineIds.has(ev.event_id)) continue;
    if (matchesPunctual && parseSkipRoutineLabel(ev.label)) continue;

    const fallbackType = ev.event_type === "event" ? "event" : "routine";
    const parsed = parseEventLabelCategory(ev.label, fallbackType);
    if (parsed.isWork) {
      hasWork = true;
      if (parsed.label) workLabels.push(parsed.label);
      if (!workEvent) workEvent = ev;
    } else {
      hasOther = true;
      if (parsed.label) otherLabels.push(parsed.label);
      if (!otherEvent) otherEvent = ev;
    }
  }
  return {
    hasWork,
    hasOther,
    workLabels: [...new Set(workLabels)],
    otherLabels: [...new Set(otherLabels)],
    workEvent,
    otherEvent,
  };
}

export const SHORT_MONTH_LABELS = [
  "JAN.", "FEV.", "MAR.", "ABR.", "MAI.", "JUN.",
  "JUL.", "AGO.", "SET.", "OUT.", "NOV.", "DEZ.",
];
