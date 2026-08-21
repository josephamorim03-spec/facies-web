import { CalendarEventOut, DirectedStudyListItem, ReviewTask } from "@/lib/api";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import type { DisplayArea } from "@/lib/areaIdentity";
import {
  AREA_COLORS,
  FULL_EXAM_COLOR,
  isFullExamStudy,
  isTopicStudy,
  topicPrimaryLabel,
} from "../../_lib/cronogramaShared";

export type CalendarVisibleCategory = "pending" | "done" | "initial" | "full_exam";

export type CalendarPopupTarget =
  | { kind: "pending"; task: ReviewTask }
  | { kind: "done"; task: ReviewTask }
  | { kind: "initial"; study: DirectedStudyListItem }
  | { kind: "full_exam"; study: DirectedStudyListItem }
  | { kind: "event"; event: CalendarEventOut; sourceISO: string; iconType: "work" | "other"; completed: boolean };

export type CalendarDotEntry = {
  key: string;
  color: string;
  /** Sigla da area, para a barra dizer o nome alem da cor. `null` em prova. */
  areaCode?: DisplayArea | null;
  kind: CalendarVisibleCategory;
  theme?: string;
  tooltip?: string;
  task?: ReviewTask;
  study?: DirectedStudyListItem;
  popupTarget?: CalendarPopupTarget;
};

function matchesTopicLabel(value: string | null | undefined, query: string): boolean {
  return String(value ?? "").trim().toLowerCase() === query;
}

function studyThemeLabel(study: DirectedStudyListItem): string {
  if (isFullExamStudy(study)) {
    return String(study.full_exam_name ?? study.theme ?? "").trim() || "Prova";
  }
  return topicPrimaryLabel(study) || study.theme;
}

function taskThemeLabel(task: ReviewTask): string {
  return topicPrimaryLabel(task) || task.theme;
}

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
      if (
        !study.is_review
        && (
          matchesTopicLabel(studyThemeLabel(study), q)
          || matchesTopicLabel(study.theme, q)
        )
      ) {
        matched.add(dateKey);
        break;
      }
    }
  }

  for (const task of tasks) {
    if (matchesTopicLabel(taskThemeLabel(task), q) || matchesTopicLabel(task.theme, q)) {
      matched.add(task.due_date);
    }
  }
  for (const task of doneTasks) {
    if (matchesTopicLabel(taskThemeLabel(task), q) || matchesTopicLabel(task.theme, q)) {
      matched.add(task.due_date);
    }
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
      .map((study) => {
        const theme = studyThemeLabel(study);
        return {
          key: `i_${study.study_id}`,
          color: AREA_COLORS[study.area] ?? AREA_COLORS.OU,
          areaCode: resolveDisplayArea(study.area, theme, null),
          kind: "initial" as const,
          theme,
          tooltip: `${study.area}: ${theme}`,
          study,
          popupTarget: { kind: "initial" as const, study },
        };
      }),
    ...dayStudies
      .filter((study) => isFullExamStudy(study) && !study.is_review)
      .map((study) => {
        const theme = studyThemeLabel(study);
        return {
          key: `f_${study.study_id}`,
          color: FULL_EXAM_COLOR,
          kind: "full_exam" as const,
          theme,
          tooltip: theme,
          study,
          popupTarget: { kind: "full_exam" as const, study },
        };
      }),
    ...pendingTasks.map((task) => {
      const theme = taskThemeLabel(task);
      return {
        key: task.task_id,
        color: AREA_COLORS[task.area] ?? AREA_COLORS.OU,
        areaCode: resolveDisplayArea(task.area, theme, null),
        kind: "pending" as const,
        theme,
        task,
        tooltip: `${task.area}: ${theme}`,
        popupTarget: { kind: "pending" as const, task },
      };
    }),
    ...doneTasks.map((task) => {
      const theme = taskThemeLabel(task);
      return {
        key: `d_${task.task_id}`,
        color: AREA_COLORS[task.area] ?? AREA_COLORS.OU,
        areaCode: resolveDisplayArea(task.area, theme, null),
        kind: "done" as const,
        theme,
        task,
        tooltip: `${task.area}: ${theme}`,
        popupTarget: { kind: "done" as const, task },
      };
    }),
  ];
}
