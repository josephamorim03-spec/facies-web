import { ReviewTask } from "@/lib/api";
import { Area, Period, ThemeListSort } from "./perfilShared";

export const AREAS: Area[] = ["GO", "PD", "MP", "CG", "CM", "OU"];
export const AREA_LABELS: Record<Area, string> = {
  GO: "Ginecologia & Obstetrícia",
  PD: "Pediatria",
  MP: "Medicina Preventiva",
  CG: "Cirurgia Geral",
  CM: "Clínica Médica",
  OU: "Outras",
};
export const AREA_COLORS: Record<Area, string> = {
  GO: "#f472b6", PD: "#2293cf", CG: "#ef4444", CM: "#2fc767", MP: "#f59e0b", OU: "#AEAEA8",
};
export const FULL_EXAM_COLOR = "#0F4C5C";

export const PERIOD_LABELS: Record<Period, string> = {
  semanal: "Semanal", mensal: "Mensal", geral: "Geral",
};

export const DIAG_MIN_TOTAL_QUESTIONS = 300;
export const DIAG_MIN_THEME_QUESTIONS = 80;
export const THEME_LIST_LIMIT = 20;

function toLocalDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return toLocalDateISO(d);
}

function getWeekRange(): [string, string] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return [toLocalDateISO(monday), toLocalDateISO(sunday)];
}

function localYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function filterTasks(tasks: ReviewTask[], period: Period): ReviewTask[] {
  if (period === "geral") return tasks;
  if (period === "mensal") {
    const ym = localYearMonth();
    return tasks.filter((t) => t.due_date.startsWith(ym));
  }
  const [mon, sun] = getWeekRange();
  return tasks.filter((t) => t.due_date >= mon && t.due_date <= sun);
}

export function filterStudies<T extends { performed_at?: string | null }>(
  studies: T[],
  period: Period,
): T[] {
  if (period === "geral") return studies;
  if (period === "mensal") {
    const ym = localYearMonth();
    return studies.filter((s) => isoToLocalDate(s.performed_at ?? "").startsWith(ym));
  }
  const [mon, sun] = getWeekRange();
  return studies.filter((s) => {
    const d = isoToLocalDate(s.performed_at ?? "");
    return d >= mon && d <= sun;
  });
}

export type ThemeAreaStat = {
  key: string;
  area: Area;
  theme: string;
  total_questions: number;
  correct_questions: number;
  accuracy_pct: number;
  review_count: number;
  stable_review_ratio_pct: number | null;
  consistency_score: number | null;
  days_since_last_study: number | null;
};

export function sortThemeList(items: ThemeAreaStat[], mode: ThemeListSort): ThemeAreaStat[] {
  const sorted = [...items];
  if (mode === "accuracy_high") {
    return sorted.sort((a, b) =>
      (b.accuracy_pct - a.accuracy_pct)
      || (b.total_questions - a.total_questions)
      || a.theme.localeCompare(b.theme)
    );
  }
  if (mode === "accuracy_low") {
    return sorted.sort((a, b) =>
      (a.accuracy_pct - b.accuracy_pct)
      || (b.total_questions - a.total_questions)
      || a.theme.localeCompare(b.theme)
    );
  }
  return sorted.sort((a, b) =>
    ((b.consistency_score ?? -1) - (a.consistency_score ?? -1))
    || (b.accuracy_pct - a.accuracy_pct)
    || (b.total_questions - a.total_questions)
    || a.theme.localeCompare(b.theme)
  );
}
