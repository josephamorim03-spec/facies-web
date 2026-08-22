import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarEventOut, deleteDirectedStudy, DirectedStudyListItem, ReviewTask, updateReviewTask } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { IconPlus } from "../CronogramaIcons";
import { NewStudyForm } from "../CronogramaStudyReviewComponents";
import {
  FULL_EXAM_TYPE_LABELS,
  getAccuracy,
  getRevisionNumber,
  isFullExamStudy,
  isTopicStudy,
  sameTopicIdentity,
  SHORT_MONTH_LABELS,
  displayDate,
  parseEventLabelCategory,
  topicPrimaryLabel,
  topicSecondaryLabel,
} from "../../_lib/cronogramaShared";
import { ReviewSignalChips } from "../ReviewSignalChips";
import { CalendarPopupTarget } from "./derived";

export function CalendarMonthNavigation({
  month,
  year,
  currentYear,
  onPrevMonth,
  onNextMonth,
}: {
  month: number;
  year: number;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div data-month-nav="true" className="mb-2 grid grid-cols-[6rem_1fr_6rem] items-center">
      <div data-month-nav-left="true" className="flex items-center justify-start">
        <button type="button" onClick={onPrevMonth} className="p-2 text-muted hover:text-ink" aria-label="Mês anterior">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
            <path d="M9 2L4 7l5 5" />
          </svg>
        </button>
      </div>
      <span data-month-title="true" className="text-center text-lg font-serif font-bold tracking-wide">
        {SHORT_MONTH_LABELS[month]}{year !== currentYear ? ` ${year}` : ""}
      </span>
      <div data-month-nav-right="true" className="flex items-center justify-end gap-1">
        <button type="button" onClick={onNextMonth} className="p-2 text-muted hover:text-ink" aria-label="Próximo mês">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
            <path d="M5 2l5 5-5 5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function CalendarEventMoveErrorToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <div className="fixed left-1/2 top-3 -translate-x-1/2 z-[85] w-[min(92vw,30rem)] rounded-control border border-edge bg-paper px-3 py-2">
      <div className="flex items-start gap-2">
        <p className="text-xs text-ink flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted hover:text-ink leading-none px-1"
          aria-label="Fechar aviso"
        >
          x
        </button>
      </div>
    </div>
  );
}

export function CalendarActionButtons({
  selectedDay,
  modal,
  viewSwitchSlot,
  onOpenCreateModal,
}: {
  selectedDay: string | null;
  modal: "create" | null;
  viewSwitchSlot?: React.ReactNode;
  onOpenCreateModal: () => void;
}) {
  if (!selectedDay) return null;

  return (
    <>
      <div className="mt-3 md:hidden">{viewSwitchSlot ?? null}</div>
      <div
        className="fixed right-4 z-40"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        data-testid="calendar-action-mode"
      >
        <button
          type="button"
          onClick={onOpenCreateModal}
          className={`flex items-center gap-1.5 border px-4 py-2.5 text-sm font-semibold transition-colors ${
            modal === "create"
              ? "border-primary bg-primary text-primaryInk"
              : "border-edge bg-paper text-ink hover:border-primary hover:text-primary"
          }`}
          title="Adicionar estudo ou compromisso"
          aria-label="Adicionar"
          data-testid="calendar-action-plus"
        >
          <IconPlus className="w-4 h-4" />
          Adicionar
        </button>
      </div>
    </>
  );
}

function popupPosition(anchorRect: DOMRect): { top: number; left: number } {
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  return {
    top: Math.min(anchorRect.bottom + 8, viewportHeight - 240),
    left: Math.min(Math.max(8, anchorRect.left), viewportWidth - 296),
  };
}

function studyDisplayLabel(study: DirectedStudyListItem): string {
  if (isFullExamStudy(study)) {
    return String(study.full_exam_name ?? study.theme ?? "").trim() || "Prova";
  }
  return topicPrimaryLabel(study) || study.theme;
}

function studySecondaryText(study: DirectedStudyListItem): string {
  if (isFullExamStudy(study)) {
    const examType = study.full_exam_type ? FULL_EXAM_TYPE_LABELS[study.full_exam_type] : "Prova na íntegra";
    return [study.area, examType, study.full_exam_year ? String(study.full_exam_year) : ""]
      .filter(Boolean)
      .join(" · ");
  }
  const parentThemeLabel = topicSecondaryLabel(study);
  return [study.area, parentThemeLabel, study.is_review ? "Revisão concluída" : "Estudo inicial"]
    .filter(Boolean)
    .join(" · ");
}

function studyRecordType(study: DirectedStudyListItem): string {
  if (isFullExamStudy(study)) return "Prova na íntegra";
  return study.is_review ? "Revisão concluída" : "Estudo inicial";
}

function resolveCompletedReviewStudy(
  task: ReviewTask,
  studies: DirectedStudyListItem[],
  studyMap: Map<string, DirectedStudyListItem>,
): DirectedStudyListItem | null {
  const byTaskId = studies.find((study) => study.origin_review_task_id === task.task_id);
  if (byTaskId) return byTaskId;
  const revision = getRevisionNumber(task, studies, studyMap);
  const sorted = studies
    .filter((study) => isTopicStudy(study) && sameTopicIdentity(study, task))
    .sort((left, right) => left.performed_at.localeCompare(right.performed_at));
  return sorted[revision] ?? null;
}

function ReadonlyStudyPopupContent({
  study,
  onDeleteRequest,
}: {
  study: DirectedStudyListItem;
  onDeleteRequest?: (study: DirectedStudyListItem) => void;
}) {
  const displayLabel = studyDisplayLabel(study);
  const secondary = studySecondaryText(study);
  const recordType = studyRecordType(study);
  return (
    <>
      <div>
        <p className="paper-eyebrow">{recordType}</p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">{displayLabel}</p>
        <p className="mt-1 text-xs text-muted">{secondary}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
          <p className="text-micro text-muted leading-none">Registro</p>
          <p className="mt-1 text-sm font-bold text-ink">{recordType}</p>
        </div>
        <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
          <p className="text-micro text-muted leading-none">Questões</p>
          <p className="mt-1 text-sm font-bold text-ink">
            {study.correct_questions}/{study.total_questions}
          </p>
        </div>
        <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
          <p className="text-micro text-muted leading-none">Acurácia</p>
          <p className="mt-1 text-sm font-bold text-ink">{study.accuracy.toFixed(0)}%</p>
        </div>
      </div>

      {!study.is_review ? (
        <button
          type="button"
          onClick={() => onDeleteRequest?.(study)}
          className="flex w-full items-center justify-center border border-danger/50 bg-paper py-2.5 text-xs font-semibold text-danger transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          Apagar registro
        </button>
      ) : null}
    </>
  );
}

function EventPopupContent({
  event,
  sourceISO,
  iconType,
  completed,
  onDeleteRequest,
  onRescheduleRequest,
}: {
  event: CalendarEventOut;
  sourceISO: string;
  iconType: "work" | "other";
  completed: boolean;
  onDeleteRequest?: (event: CalendarEventOut, sourceISO: string) => void;
  onRescheduleRequest?: (event: CalendarEventOut, sourceISO: string, iconType: "work" | "other") => void;
}) {
  const parsed = parseEventLabelCategory(event.label, event.event_type === "routine" ? "routine" : "event");
  const title = parsed.label || (iconType === "work" ? "Trabalho" : "Compromisso");
  const kindLabel = event.event_type === "routine" ? "Rotina semanal" : "Compromisso";
  const canMutate = !completed;

  return (
    <>
      <div>
        <p className="paper-eyebrow">{kindLabel}</p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">{title}</p>
        <p className="mt-1 text-xs text-muted">
          {displayDate(sourceISO)} - {event.duration_hours}h{completed ? " - concluido" : ""}
        </p>
      </div>

      {canMutate ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onRescheduleRequest?.(event, sourceISO, iconType)}
            className="flex w-full items-center justify-center rounded-control border border-edge bg-paper py-2.5 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Reagendar
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest?.(event, sourceISO)}
            className="flex w-full items-center justify-center border border-danger/50 bg-paper py-2.5 text-xs font-semibold text-danger transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            Apagar
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">Compromissos passados ficam somente como histórico.</p>
      )}
    </>
  );
}

export function CalendarEntryPopup({
  target,
  anchorRect,
  studies,
  studyMap,
  onClose,
  onRescheduleRequest,
  onDeleteStudyRequest,
  onDeleteEventRequest,
  onRescheduleEventRequest,
}: {
  target: CalendarPopupTarget;
  anchorRect: DOMRect;
  studies: DirectedStudyListItem[];
  studyMap: Map<string, DirectedStudyListItem>;
  onClose: () => void;
  onRescheduleRequest?: (task: ReviewTask) => void;
  onDeleteStudyRequest?: (study: DirectedStudyListItem) => void;
  onDeleteEventRequest?: (event: CalendarEventOut, sourceISO: string) => void;
  onRescheduleEventRequest?: (event: CalendarEventOut, sourceISO: string, iconType: "work" | "other") => void;
}) {
  const { top: popupTop, left: popupLeft } = popupPosition(anchorRect);

  let content: React.ReactNode = null;

  if (target.kind === "pending") {
    const task = target.task;
    const accuracy = getAccuracy(task, studies);
    const revision = getRevisionNumber(task, studies, studyMap);
    const displayLabel = topicPrimaryLabel(task) || task.theme;
    const parentThemeLabel = topicSecondaryLabel(task);
    const bancoParams = new URLSearchParams({
      review_task_id: task.task_id,
      activity_id: task.task_id,
      source: "calendar-review",
      date: task.due_date,
      area: task.area,
      theme: displayLabel,
      expected_questions: String(task.expected_questions),
    });
    if (task.knowledge_node_id) bancoParams.set("knowledge_node_id", task.knowledge_node_id);
    const bancoUrl = `/banco?${bancoParams.toString()}`;
    const sessionTitle = `Revisão #${revision} - ${displayLabel}`;

    content = (
      <>
        <div>
          <p className="paper-eyebrow">{task.area}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink leading-snug">{displayLabel}</p>
          <p className="mt-1 text-xs text-muted">
            {parentThemeLabel ? `${parentThemeLabel} · ` : ""}Revisão pendente
          </p>
          <ReviewSignalChips task={task} compact className="mt-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-micro text-muted leading-none">Revisão</p>
            <p className="mt-1 text-lg font-bold text-ink">#{revision}</p>
          </div>
          <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-micro text-muted leading-none">Acerto</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {accuracy !== null ? `${accuracy}%` : "—"}
            </p>
          </div>
          <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-micro text-muted leading-none">Min. q</p>
            <p className="mt-1 text-lg font-bold text-ink">{task.expected_questions}</p>
          </div>
        </div>

        <Link
          href={bancoUrl}
          onClick={onClose}
          aria-label={sessionTitle}
          className="flex w-full items-center justify-center border border-primary bg-primary py-2.5 text-xs font-semibold text-primaryInk transition-all hover:brightness-105"
        >
          Abrir revisão no banco
        </Link>

        <button
          type="button"
          onClick={() => {
            onClose();
            onRescheduleRequest?.(task);
          }}
          className="flex w-full items-center justify-center rounded-control border border-edge bg-paper py-2.5 text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Reagendar
        </button>
      </>
    );
  } else if (target.kind === "done") {
    const task = target.task;
    const resolvedStudy = resolveCompletedReviewStudy(task, studies, studyMap);
    const displayLabel = topicPrimaryLabel(task) || task.theme;
    const parentThemeLabel = topicSecondaryLabel(task);
    const revision = getRevisionNumber(task, studies, studyMap);

    content = (
      <>
        <div>
          <p className="paper-eyebrow">Revisão concluída</p>
          <p className="mt-0.5 text-sm font-semibold text-ink leading-snug">{displayLabel}</p>
          <p className="mt-1 text-xs text-muted">
            {[task.area, parentThemeLabel, `Revisão #${revision}`].filter(Boolean).join(" · ")}
          </p>
          <ReviewSignalChips task={task} compact className="mt-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-micro text-muted leading-none">Registro</p>
            <p className="mt-1 text-sm font-bold text-ink">Revisão</p>
          </div>
          <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-micro text-muted leading-none">Questões</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {resolvedStudy ? `${resolvedStudy.correct_questions}/${resolvedStudy.total_questions}` : "—"}
            </p>
          </div>
          <div className="rounded-control border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-micro text-muted leading-none">Acurácia</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {resolvedStudy ? `${resolvedStudy.accuracy.toFixed(0)}%` : "—"}
            </p>
          </div>
        </div>
      </>
    );
  } else if (target.kind === "event") {
    content = (
      <EventPopupContent
        event={target.event}
        sourceISO={target.sourceISO}
        iconType={target.iconType}
        completed={target.completed}
        onDeleteRequest={(event, sourceISO) => {
          onClose();
          onDeleteEventRequest?.(event, sourceISO);
        }}
        onRescheduleRequest={(event, sourceISO, iconType) => {
          onClose();
          onRescheduleEventRequest?.(event, sourceISO, iconType);
        }}
      />
    );
  } else {
    content = (
      <ReadonlyStudyPopupContent
        study={target.study}
        onDeleteRequest={(study) => {
          onClose();
          onDeleteStudyRequest?.(study);
        }}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed z-[61] w-72 max-w-[calc(100vw-1rem)] space-y-3 rounded-surface border border-edge bg-paper p-4 "
        style={{ top: popupTop, left: popupLeft }}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </>
  );
}

export function CalendarStudyDeleteConfirmModal({
  study,
  token,
  onDeleted,
  onCancel,
}: {
  study: DirectedStudyListItem | null;
  token: string;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!study) return null;
  const selectedStudy = study;

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteDirectedStudy(token, selectedStudy.study_id);
      onDeleted();
    } catch {
      setError("Não foi possível apagar o registro.");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end bg-black/30 p-4 md:items-center md:justify-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Apagar estudo"
        className="w-full max-w-sm space-y-3 rounded-surface border border-edge bg-paper p-4 "
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="font-serif text-base">Apagar estudo</h3>
        <p className="text-sm text-muted">Este registro sera removido do calendario.</p>
        {error ? <p className="text-xs text-danger" role="alert">{error}</p> : null}
        <div className="flex flex-col gap-2">
          <Button type="button" variant="danger" size="md" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Apagando..." : "Apagar"}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CalendarEventRescheduleSheet({
  event,
  sourceISO,
  iconType,
  onClose,
  onReschedule,
}: {
  event: CalendarEventOut | null;
  sourceISO: string | null;
  iconType: "work" | "other" | null;
  onClose: () => void;
  onReschedule: (event: CalendarEventOut, sourceISO: string, iconType: "work" | "other", toISO: string) => Promise<void>;
}) {
  const [date, setDate] = useState(sourceISO ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!event || !sourceISO || !iconType) return null;
  const selectedEvent = event;
  const selectedSourceISO = sourceISO;
  const selectedIconType = iconType;

  const sameDate = date === selectedSourceISO;
  const invalid = !/^\d{4}-\d{2}-\d{2}$/.test(date);
  const parsed = parseEventLabelCategory(selectedEvent.label, selectedEvent.event_type === "routine" ? "routine" : "event");
  const title = parsed.label || (selectedIconType === "work" ? "Trabalho" : "Compromisso");

  async function save() {
    if (saving || invalid) return;
    if (sameDate) {
      onClose();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onReschedule(selectedEvent, selectedSourceISO, selectedIconType, date);
      onClose();
    } catch {
      setError("Não foi possível reagendar. Tente novamente.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end bg-black/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reagendar compromisso"
        className="w-full rounded-surface border border-edge bg-paper p-4 md:max-w-sm "
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        <div>
          <p className="paper-eyebrow">Compromisso</p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-ink">{title}</h3>
          <p className="mt-1 text-xs text-muted">Data atual: {displayDate(selectedSourceISO)}</p>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-ink">Nova data</span>
          <input
            type="date"
            value={date}
            onChange={(eventChange) => setDate(eventChange.target.value)}
            className="mt-2 min-h-11 w-full rounded-control border border-edge bg-paper px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>

        {error ? <p className="mt-3 text-xs text-danger" role="alert">{error}</p> : null}

        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant="primary" size="md" onClick={save} disabled={saving || invalid}>
            {saving ? "Salvando..." : sameDate ? "Manter data" : "Confirmar reagendamento"}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CalendarTaskRescheduleSheet({
  task,
  token,
  onClose,
  onRescheduled,
}: {
  task: ReviewTask | null;
  token: string;
  onClose: () => void;
  onRescheduled: (task: ReviewTask, fromISO: string, toISO: string) => void;
}) {
  const [date, setDate] = useState(task?.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDate(task?.due_date ?? "");
    setError("");
  }, [task]);

  if (!task) return null;

  const selectedTask = task;
  const fromISO = selectedTask.due_date;
  const sameDate = date === fromISO;
  const invalid = !/^\d{4}-\d{2}-\d{2}$/.test(date);

  async function save() {
    if (saving || invalid) return;
    if (sameDate) {
      onClose();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateReviewTask(token, selectedTask.task_id, { due_date: date });
      onRescheduled(selectedTask, fromISO, date);
      onClose();
    } catch {
      setError("Não foi possível reagendar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-end bg-black/30 md:items-center md:justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reagendar atividade"
        className="w-full rounded-surface border border-edge bg-paper p-4 md:max-w-sm "
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <p className="paper-eyebrow">{selectedTask.area}</p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-ink">{selectedTask.subtheme || selectedTask.theme}</h3>
          <p className="mt-1 text-xs text-muted">Data atual: {displayDate(fromISO)}</p>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-ink">Nova data</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-control border border-edge bg-paper px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>

        {error ? <p className="mt-3 text-xs text-danger" role="alert">{error}</p> : null}

        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant="primary" size="md" onClick={save} disabled={saving || invalid}>
            {saving ? "Salvando..." : sameDate ? "Manter data" : "Confirmar reagendamento"}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CalendarUndoRescheduleToast({
  message,
  undoLabel = "Desfazer",
  onUndo,
  onClose,
}: {
  message: string;
  undoLabel?: string;
  onUndo: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 6500);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] z-[90] mx-auto max-w-md rounded-control border border-edge bg-paper px-3 py-2.5 ">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-sm leading-snug text-ink">{message}</p>
        <button
          type="button"
          onClick={onUndo}
          className="min-h-10 shrink-0 px-3 text-sm font-semibold text-primary hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {undoLabel}
        </button>
      </div>
    </div>
  );
}

export function CalendarNoDisturbNotice({
  noDisturb,
  onReactivate,
}: {
  noDisturb: boolean;
  onReactivate: () => void;
}) {
  if (!noDisturb) return null;
  return (
    <p className="text-xs text-muted flex items-center gap-1 mt-2">
      Avisos de reagendamento desativados.
      <button type="button" className="underline hover:text-ink" onClick={onReactivate}>Reativar</button>
    </p>
  );
}

export function CalendarCreateStudyModal({
  modal,
  selectedDay,
  token,
  studies,
  events,
  onRefresh,
  onClose,
  onClearSelectedDay,
}: {
  modal: "create" | null;
  selectedDay: string | null;
  token: string;
  studies: DirectedStudyListItem[];
  events: CalendarEventOut[];
  onRefresh: () => void;
  onClose: () => void;
  onClearSelectedDay: () => void;
}) {
  if (!(modal === "create" && selectedDay)) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div className="bg-paper border border-edge w-full max-w-sm p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <NewStudyForm
          token={token}
          dateISO={selectedDay}
          existingStudies={studies}
          events={events}
          onDone={() => {
            onRefresh();
            onClose();
            onClearSelectedDay();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

export type CalendarEventDeleteConfirm = {
  eventId: string;
  eventType: "routine" | "event";
  sourceISO: string;
} | null;

export function CalendarEventDeleteConfirmModal({
  eventDeleteConfirm,
  onConfirmDelete,
  onCancel,
}: {
  eventDeleteConfirm: CalendarEventDeleteConfirm;
  onConfirmDelete: () => void;
  onCancel: () => void;
}) {
  if (!eventDeleteConfirm) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="w-full max-w-sm space-y-3 rounded-surface border border-edge bg-paper p-4">
        <h3 className="font-serif text-base">Apagar compromisso</h3>
        <p className="text-sm text-muted">Você tem certeza que deseja apagar esse compromisso?</p>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="danger" size="md" onClick={onConfirmDelete}>
            Apagar
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export type CalendarWarnTask = { task: ReviewTask; from: string; to: string; days: number } | null;

export function CalendarRescheduleWarningModal({
  warnTask,
  warnCount,
  onAccept,
  onCancel,
  onNoDisturb,
}: {
  warnTask: CalendarWarnTask;
  warnCount: number;
  onAccept: () => void;
  onCancel: () => void;
  onNoDisturb: () => void;
}) {
  if (!warnTask) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 modal-backdrop">
      <div className="w-full max-w-sm space-y-3 rounded-surface border border-edge bg-paper p-4">
        <h3 className="font-serif text-base">Reagendamento longo</h3>
        <p className="text-sm text-muted">
          Esta revisão está <strong>{warnTask.days} dias</strong> fora do agendamento ideal. Deseja continuar?
        </p>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="primary" size="md" onClick={onAccept}>Sim, reagendar</Button>
          <Button type="button" variant="ghost" size="md" onClick={onCancel}>Cancelar</Button>
          {warnCount >= 1 && (
            <Button type="button" variant="ghost" size="xs" onClick={onNoDisturb} className="text-center underline">Não me perturbe novamente</Button>
          )}
        </div>
      </div>
    </div>
  );
}
