import React from "react";
import Link from "next/link";
import { CalendarEventOut, DirectedStudyListItem, ReviewTask } from "@/lib/api";
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 2L4 7l5 5" />
          </svg>
        </button>
      </div>
      <span data-month-title="true" className="text-center text-lg font-serif font-bold tracking-wide">
        {SHORT_MONTH_LABELS[month]}{year !== currentYear ? ` ${year}` : ""}
      </span>
      <div data-month-nav-right="true" className="flex items-center justify-end gap-1">
        <button type="button" onClick={onNextMonth} className="p-2 text-muted hover:text-ink" aria-label="Próximo mês">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <div className="fixed left-1/2 top-3 -translate-x-1/2 z-[85] w-[min(92vw,30rem)] border border-edge rounded-xl bg-paper shadow-sm px-3 py-2">
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
          className={`flex items-center gap-1.5 rounded-xl border shadow-sm px-4 py-2.5 text-sm font-semibold transition-colors ${
            modal === "create"
              ? "border-ink bg-ink text-paper"
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
    const examType = study.full_exam_type ? FULL_EXAM_TYPE_LABELS[study.full_exam_type] : "Prova na integra";
    return [study.area, examType, study.full_exam_year ? String(study.full_exam_year) : ""]
      .filter(Boolean)
      .join(" · ");
  }
  const parentThemeLabel = topicSecondaryLabel(study);
  return [study.area, parentThemeLabel, study.is_review ? "Revisao concluida" : "Estudo inicial"]
    .filter(Boolean)
    .join(" · ");
}

function studyRecordType(study: DirectedStudyListItem): string {
  if (isFullExamStudy(study)) return "Prova na integra";
  return study.is_review ? "Revisao concluida" : "Estudo inicial";
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
}: {
  study: DirectedStudyListItem;
}) {
  const displayLabel = studyDisplayLabel(study);
  const secondary = studySecondaryText(study);
  const recordType = studyRecordType(study);
  return (
    <>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{recordType}</p>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">{displayLabel}</p>
        <p className="mt-1 text-xs text-muted">{secondary}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
          <p className="text-[11px] text-muted leading-none">Registro</p>
          <p className="mt-1 text-sm font-bold text-ink">{recordType}</p>
        </div>
        <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
          <p className="text-[11px] text-muted leading-none">Questoes</p>
          <p className="mt-1 text-sm font-bold text-ink">
            {study.correct_questions}/{study.total_questions}
          </p>
        </div>
        <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
          <p className="text-[11px] text-muted leading-none">Acuracia</p>
          <p className="mt-1 text-sm font-bold text-ink">{study.accuracy.toFixed(0)}%</p>
        </div>
      </div>
    </>
  );
}

export function CalendarEntryPopup({
  target,
  anchorRect,
  studies,
  studyMap,
  onClose,
}: {
  target: CalendarPopupTarget;
  anchorRect: DOMRect;
  studies: DirectedStudyListItem[];
  studyMap: Map<string, DirectedStudyListItem>;
  onClose: () => void;
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
      date: task.due_date,
      area: task.area,
      theme: displayLabel,
      expected_questions: String(task.expected_questions),
    });
    const bancoUrl = `/banco-de-questoes?${bancoParams.toString()}`;
    const sessionTitle = `Revisao #${revision} - ${displayLabel}`;

    content = (
      <>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{task.area}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink leading-snug">{displayLabel}</p>
          <p className="mt-1 text-xs text-muted">
            {parentThemeLabel ? `${parentThemeLabel} · ` : ""}Revisao pendente
          </p>
          <ReviewSignalChips task={task} compact className="mt-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-[11px] text-muted leading-none">Revisao</p>
            <p className="mt-1 text-lg font-bold text-ink">#{revision}</p>
          </div>
          <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-[11px] text-muted leading-none">Acerto</p>
            <p className="mt-1 text-lg font-bold text-ink">
              {accuracy !== null ? `${accuracy}%` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-[11px] text-muted leading-none">Min. q</p>
            <p className="mt-1 text-lg font-bold text-ink">{task.expected_questions}</p>
          </div>
        </div>

        <Link
          href={bancoUrl}
          onClick={onClose}
          aria-label={sessionTitle}
          className="flex w-full items-center justify-center rounded-xl border border-primary bg-primary py-2.5 text-xs font-semibold text-primaryInk transition-all hover:brightness-105"
        >
          Abrir revisao no banco
        </Link>
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Revisao concluida</p>
          <p className="mt-0.5 text-sm font-semibold text-ink leading-snug">{displayLabel}</p>
          <p className="mt-1 text-xs text-muted">
            {[task.area, parentThemeLabel, `Revisao #${revision}`].filter(Boolean).join(" · ")}
          </p>
          <ReviewSignalChips task={task} compact className="mt-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-[11px] text-muted leading-none">Registro</p>
            <p className="mt-1 text-sm font-bold text-ink">Revisao</p>
          </div>
          <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-[11px] text-muted leading-none">Questoes</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {resolvedStudy ? `${resolvedStudy.correct_questions}/${resolvedStudy.total_questions}` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-edge bg-surface px-2.5 py-2.5">
            <p className="text-[11px] text-muted leading-none">Acuracia</p>
            <p className="mt-1 text-sm font-bold text-ink">
              {resolvedStudy ? `${resolvedStudy.accuracy.toFixed(0)}%` : "—"}
            </p>
          </div>
        </div>
      </>
    );
  } else {
    content = <ReadonlyStudyPopupContent study={target.study} />;
  }

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed z-[61] w-72 max-w-[calc(100vw-1rem)] space-y-3 rounded-2xl border border-edge bg-paper p-4 shadow-[var(--soft-shadow)]"
        style={{ top: popupTop, left: popupLeft }}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </>
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
      <div className="bg-paper border border-edge rounded-2xl w-full max-w-sm p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
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
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-edge bg-paper p-4">
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

export type CalendarWarnTask = { taskId: string; to: string; days: number } | null;

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
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-edge bg-paper p-4">
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
