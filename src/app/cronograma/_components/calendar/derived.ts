import { DirectedStudyListItem, ReviewTask } from "@/lib/api";
import {
  AREA_COLORS,
  FULL_EXAM_COLOR,
  isFullExamStudy,
  isTopicStudy,
} from "../../_lib/cronogramaShared";

export type CalendarVisibleCategory = "pending" | "done" | "initial" | "full_exam";

export type CalendarDotEntry = {
  key: string;
  color: string;
  kind: CalendarVisibleCategory;
  task?: ReviewTask;
  tooltip?: string;
};

export function buildTasksByDate(
  tasks: ReviewTask[],
  doneTasks: ReviewTask[],
): Record<string, ReviewTask[]> {
  const out: Record<string, ReviewTask[]> = {};
  for (const task of [...tasks, ...doneTasks]) {
    out[task.due_date] = out[task.due_date] ?? [];
    out[task.due_date].push(task);
  }
  return out;
}

export function buildCalendarCells(startOffset: number, daysInMonth: number): Array<number | null> {
  const total = startOffset + daysInMonth;
  const padded = Math.ceil(total / 7) * 7;
  return Array.from(
    { length: padded },
    (_, i) => (i < startOffset || i >= startOffset + daysInMonth ? null : i - startOffset + 1),
  );
}

export function sortTasksByPriority(tasks: ReviewTask[]): ReviewTask[] {
  return [...tasks].sort((a, b) => {
    if (a.is_critical !== b.is_critical) return a.is_critical ? -1 : 1;
    return b.priority_score - a.priority_score;
  });
}

export function buildModalDayCollections(
  selectedDay: string | null,
  byDate: Record<string, ReviewTask[]>,
  studiesByDate: Record<string, DirectedStudyListItem[]>,
) {
  const modalDayTasks = selectedDay ? byDate[selectedDay] ?? [] : [];
  const modalDayPendingTasks = sortTasksByPriority(
    modalDayTasks.filter((task) => task.status === "pending"),
  );
  const modalDayDoneTasks = sortTasksByPriority(
    modalDayTasks.filter((task) => task.status === "done"),
  );
  const modalDayDoneStudyIds = new Set(
    modalDayDoneTasks.map((task) => task.source_study_id),
  );
  const modalDayStudies = selectedDay
    ? (studiesByDate[selectedDay] ?? []).filter(
        (study) => !study.is_review && !modalDayDoneStudyIds.has(study.study_id),
      )
    : [];

  return {
    modalDayTasks,
    modalDayPendingTasks,
    modalDayDoneTasks,
    modalDayStudies,
  };
}

export function buildSearchMatchDays(params: {
  searchQuery?: string;
  studiesByDate: Record<string, DirectedStudyListItem[]>;
  tasks: ReviewTask[];
  doneTasks: ReviewTask[];
}): Set<string> {
  const { searchQuery, studiesByDate, tasks, doneTasks } = params;
  if (!searchQuery || searchQuery.trim().length < 2) return new Set<string>();

  const q = searchQuery.toLowerCase().trim();
  const matched = new Set<string>();

  for (const [dateKey, dayStudies] of Object.entries(studiesByDate)) {
    for (const study of dayStudies) {
      if (!study.is_review && study.theme.toLowerCase() === q) {
        matched.add(dateKey);
        break;
      }
    }
  }

  for (const task of tasks) {
    if (task.theme.toLowerCase() === q) matched.add(task.due_date);
  }
  for (const task of doneTasks) {
    if (task.theme.toLowerCase() === q) matched.add(task.due_date);
  }

  return matched;
}

export function buildDayDotEntries(params: {
  dayStudies: DirectedStudyListItem[];
  pendingTasks: ReviewTask[];
  doneTasks: ReviewTask[];
}): CalendarDotEntry[] {
  const { dayStudies, pendingTasks, doneTasks } = params;

  return [
    ...dayStudies
      .filter((study) => isTopicStudy(study) && !study.is_review)
      .map((study) => ({
        key: `i_${study.study_id}`,
        color: AREA_COLORS[study.area] ?? "#ccc",
        kind: "initial" as const,
        tooltip: `${study.area}: ${study.theme}`,
      })),
    ...dayStudies
      .filter((study) => isFullExamStudy(study) && !study.is_review)
      .map((study) => ({
        key: `f_${study.study_id}`,
        color: FULL_EXAM_COLOR,
        kind: "full_exam" as const,
        tooltip: `${
          String(study.full_exam_name ?? "").trim() || String(study.theme ?? "").trim() || "Prova"
        }${study.full_exam_year ? ` ${study.full_exam_year}` : ""}`,
      })),
    ...pendingTasks.map((task) => ({
      key: task.task_id,
      color: AREA_COLORS[task.area] ?? "#ccc",
      kind: "pending" as const,
      task,
      tooltip: `${task.area}: ${task.theme}`,
    })),
    ...doneTasks.map((task) => ({
      key: `d_${task.task_id}`,
      color: AREA_COLORS[task.area] ?? "#ccc",
      kind: "done" as const,
      tooltip: `${task.area}: ${task.theme}`,
    })),
  ];
}
