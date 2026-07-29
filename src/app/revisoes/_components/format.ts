import type { ReviewTask } from "@/lib/api";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  const normalized = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
  return `${Math.round(normalized)}%`;
}

export function pctNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  const normalized = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

export function taskHref(task: ReviewTask): string {
  const params = new URLSearchParams({
    review_task_id: task.task_id,
    date: task.due_date,
    area: task.area,
    theme: task.theme,
    expected_questions: String(Math.max(1, Number(task.expected_questions ?? 10))),
  });
  return `/banco?${params.toString()}`;
}
