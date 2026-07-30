import type {
  CalendarEventOut,
  DirectedStudyListItem,
  QuestionBankSession,
  ReviewTask,
} from "@/lib/api";
import {
  buildStudiesByDate,
  eventFlags,
  isFullExamStudy,
  isTopicStudy,
  topicPrimaryLabel,
} from "./cronogramaShared";

export type DayActivityStatus = "pending" | "done" | "overdue" | "in_progress" | "scheduled";

export type DayActivitySummaryItem = {
  key: string;
  kind: "review" | "study" | "exam" | "cards" | "event" | "session";
  title: string;
  label: string;
  status: DayActivityStatus;
  href?: string;
  area?: string | null;
  progress?: string;
  isNext?: boolean;
};

export type DayActivitySummaryCategory = {
  key: string;
  label: string;
  count: number;
};

export type DayActivitySummary = {
  dateIso: string;
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  inProgress: number;
  categories: DayActivitySummaryCategory[];
  items: DayActivitySummaryItem[];
};

function increment(map: Map<string, DayActivitySummaryCategory>, key: string, label: string, by = 1) {
  const current = map.get(key);
  if (current) {
    current.count += by;
    return;
  }
  map.set(key, { key, label, count: by });
}

function reviewHref(task: ReviewTask): string {
  const params = new URLSearchParams({
    review_task_id: task.task_id,
    activity_id: task.task_id,
    source: "calendar-review",
    date: task.due_date,
    area: task.area,
    theme: task.theme,
    expected_questions: String(Math.max(1, Number(task.expected_questions ?? 10))),
  });
  if (task.knowledge_node_id) params.set("knowledge_node_id", task.knowledge_node_id);
  return `/banco?${params.toString()}`;
}

function studyTitle(study: DirectedStudyListItem): string {
  if (isFullExamStudy(study)) {
    return String(study.full_exam_name ?? study.theme ?? "").trim() || "Prova";
  }
  return topicPrimaryLabel(study) || study.theme || "Sessao de estudo";
}

export function buildDayActivitySummary(params: {
  dateIso: string;
  pendingTasks: ReviewTask[];
  doneTasks: ReviewTask[];
  studies: DirectedStudyListItem[];
  events: CalendarEventOut[];
  activeSessions: QuestionBankSession[];
  cardsCompleted?: number;
  primaryHref?: string | null;
}): DayActivitySummary {
  const {
    dateIso,
    pendingTasks,
    doneTasks,
    studies,
    events,
    activeSessions,
    cardsCompleted = 0,
    primaryHref,
  } = params;

  const categories = new Map<string, DayActivitySummaryCategory>();
  const studiesByDate = buildStudiesByDate(studies);
  const dayStudies = studiesByDate[dateIso] ?? [];
  const { hasWork, hasOther, workLabels, otherLabels } = eventFlags(dateIso, events);
  const items: DayActivitySummaryItem[] = [];

  for (const task of pendingTasks) {
    increment(categories, "review", "Revisoes");
    items.push({
      key: `pending:${task.task_id}`,
      kind: "review",
      title: topicPrimaryLabel(task) || task.theme,
      label: task.is_overdue ? "Atrasada" : "Revisao",
      status: task.is_overdue ? "overdue" : "pending",
      href: reviewHref(task),
      area: task.area,
      progress: `${Math.max(1, Number(task.expected_questions ?? 10))}q`,
    });
  }

  for (const task of doneTasks) {
    increment(categories, "review", "Revisoes");
    items.push({
      key: `done:${task.task_id}`,
      kind: "review",
      title: topicPrimaryLabel(task) || task.theme,
      label: "Revisao concluida",
      status: "done",
      href: reviewHref(task),
      area: task.area,
      progress: `${Math.max(1, Number(task.expected_questions ?? 10))}q`,
    });
  }

  for (const study of dayStudies.filter((item) => !item.is_review)) {
    const isExam = isFullExamStudy(study);
    increment(categories, isExam ? "exam" : "study", isExam ? "Provas" : "Questões");
    items.push({
      key: `study:${study.study_id}`,
      kind: isExam ? "exam" : "study",
      title: studyTitle(study),
      label: isExam ? "Prova concluida" : "Sessao concluida",
      status: "done",
      href: study.import_session_id
        ? `/cronograma/importar/${study.import_session_id}/resultados`
        : "/evolucao",
      area: study.area,
      progress: `${Math.max(0, Number(study.total_questions ?? 0))}q`,
    });
  }

  const eventItems = [
    hasWork
      ? {
          key: "event:work",
          title: workLabels.length > 0 ? workLabels.join(" / ") : "Rotina de trabalho",
          label: "Agenda",
        }
      : null,
    hasOther
      ? {
          key: "event:other",
          title: otherLabels.length > 0 ? otherLabels.join(" / ") : "Compromisso",
          label: "Agenda",
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; label: string }>;

  for (const eventItem of eventItems) {
    increment(categories, "event", "Agenda");
    items.push({
      key: eventItem.key,
      kind: "event",
      title: eventItem.title,
      label: eventItem.label,
      status: "scheduled",
    });
  }

  for (const session of activeSessions) {
    increment(categories, "session", "Em andamento");
    items.push({
      key: `session:${session.session_id}`,
      kind: "session",
      title: session.theme ?? session.full_exam_name ?? "Sessao do banco",
      label: session.resolution_mode === "simulation" ? "Simulado em andamento" : "Sessao em andamento",
      status: "in_progress",
      href: `/banco/sessao/${session.session_id}`,
      area: session.area,
      progress: `${Math.max(0, Number(session.answered_count ?? 0))}/${Math.max(0, Number(session.total_questions ?? 0))}`,
    });
  }

  if (cardsCompleted > 0) {
    increment(categories, "cards", "Cards");
    items.push({
      key: "cards:done",
      kind: "cards",
      title: "Cards revisados hoje",
      label: "Cards",
      status: "done",
      href: "/cards",
      progress: String(cardsCompleted),
    });
  }

  const primarySessionId = primaryHref?.match(/\/banco\/sessao\/([^/?#]+)/)?.[1] ?? null;
  const sortedItems = items
    .map((item) => ({
      ...item,
      isNext:
        (primaryHref && item.href === primaryHref) ||
        (primarySessionId && item.key === `session:${primarySessionId}`) ||
        item.isNext,
    }))
    .sort((a, b) => {
      const order: Record<DayActivityStatus, number> = {
        in_progress: 0,
        overdue: 1,
        pending: 2,
        scheduled: 3,
        done: 4,
      };
      if (a.isNext !== b.isNext) return a.isNext ? -1 : 1;
      return order[a.status] - order[b.status];
    });

  const completed = sortedItems.filter((item) => item.status === "done").length;
  const pending = sortedItems.filter((item) => item.status === "pending" || item.status === "scheduled").length;
  const overdue = sortedItems.filter((item) => item.status === "overdue").length;
  const inProgress = sortedItems.filter((item) => item.status === "in_progress").length;

  return {
    dateIso,
    total: sortedItems.length,
    completed,
    pending,
    overdue,
    inProgress,
    categories: Array.from(categories.values()).filter((category) => category.count > 0),
    items: sortedItems,
  };
}
