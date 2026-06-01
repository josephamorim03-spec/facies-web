import React from "react";
import { CalendarEventOut, DirectedStudyListItem, ReviewTask } from "@/lib/api";
import { IconEye, IconPlus } from "../CronogramaIcons";
import { NewStudyForm, StudyDotCard, TaskDetail } from "../CronogramaStudyReviewComponents";
import { displayDate, SHORT_MONTH_LABELS } from "../../_lib/cronogramaShared";

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
        <button onClick={onPrevMonth} className="p-2 text-muted hover:text-ink" aria-label="Mês anterior">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 2L4 7l5 5" />
          </svg>
        </button>
      </div>
      <span data-month-title="true" className="text-center text-lg font-serif font-bold tracking-wide">
        {SHORT_MONTH_LABELS[month]}{year !== currentYear ? ` ${year}` : ""}
      </span>
      <div data-month-nav-right="true" className="flex items-center justify-end gap-1">
        <button onClick={onNextMonth} className="p-2 text-muted hover:text-ink" aria-label="Próximo mês">
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
  showDayDetail,
  modal,
  viewSwitchSlot,
  onToggleDayDetail,
  onOpenCreateModal,
}: {
  selectedDay: string | null;
  showDayDetail: boolean;
  modal: "create" | null;
  viewSwitchSlot?: React.ReactNode;
  onToggleDayDetail: () => void;
  onOpenCreateModal: () => void;
}) {
  if (!selectedDay) return null;

  const actionMode: "idle" | "detail" | "create" = modal === "create"
    ? "create"
    : showDayDetail
      ? "detail"
      : "idle";

  const eyeBtn = (
    <button
      onClick={onToggleDayDetail}
      className={`w-12 h-12 rounded-full border shadow-sm flex items-center justify-center transition-colors ${
        actionMode === "detail" ? "border-ink bg-ink text-paper" : "border-edge bg-paper text-muted hover:text-ink hover:border-ink"
      }`}
      title="Ver atividades"
      aria-label="Ver atividades do dia"
      data-testid="calendar-action-eye"
    >
      <IconEye className="w-5 h-5" />
    </button>
  );

  const plusBtn = (
    <button
      onClick={onOpenCreateModal}
      className={`w-12 h-12 rounded-full border shadow-sm flex items-center justify-center transition-colors ${
        actionMode === "create" ? "border-ink bg-ink text-paper" : "border-edge bg-paper text-muted hover:text-ink hover:border-ink"
      }`}
      title="Registrar estudo"
      aria-label="Registrar estudo inicial"
      data-testid="calendar-action-plus"
    >
      <IconPlus className="w-5 h-5" />
    </button>
  );

  if (actionMode !== "idle") {
    const detailAction = (
      <div
        className="mt-3 flex justify-end pr-4"
        data-testid="calendar-action-mode"
        data-calendar-action-mode="detail"
      >
        {eyeBtn}
      </div>
    );

    const createAction = (
      <div
        className="fixed right-4 z-40"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        data-testid="calendar-action-mode"
        data-calendar-action-mode="create"
      >
        {plusBtn}
      </div>
    );

    return (
      <>
        {actionMode === "detail" && (
          <div className="mt-3 md:hidden">
            {viewSwitchSlot ?? null}
          </div>
        )}
        {actionMode === "detail" ? detailAction : createAction}
      </>
    );
  }

  return (
    <div
      className="fixed right-4 z-40 flex flex-col gap-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      data-testid="calendar-action-mode"
      data-calendar-action-mode="idle"
    >
      {eyeBtn}
      {plusBtn}
    </div>
  );
}

export function CalendarInlineDayDetailSection({
  showDayDetail,
  isMobilePortrait,
  selectedDay,
  modalDayTasks,
  modalDayStudies,
  modalDayPendingTasks,
  modalDayDoneTasks,
  token,
  studies,
  studyMap,
  onRefresh,
  onCloseDayDetail,
}: {
  showDayDetail: boolean;
  isMobilePortrait: boolean;
  selectedDay: string | null;
  modalDayTasks: ReviewTask[];
  modalDayStudies: DirectedStudyListItem[];
  modalDayPendingTasks: ReviewTask[];
  modalDayDoneTasks: ReviewTask[];
  token: string;
  studies: DirectedStudyListItem[];
  studyMap: Map<string, DirectedStudyListItem>;
  onRefresh: () => void;
  onCloseDayDetail: () => void;
}) {
  if (!showDayDetail || !selectedDay) return null;

  return (
    <section
      data-testid="calendar-inline-day-detail"
      className={`mt-4 border-t border-edge pt-3 space-y-3 max-w-full overflow-x-hidden ${isMobilePortrait ? "px-4" : ""}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base">{displayDate(selectedDay)}</h3>
      </div>
      {modalDayTasks.length === 0 && modalDayStudies.length === 0 && (
        <p className="text-xs text-muted">Nenhuma atividade.</p>
      )}
      <div className="space-y-4 min-w-0 overflow-x-hidden" data-testid="calendar-inline-day-detail-content">
        {modalDayStudies.map((study) => (
          <div key={study.study_id} className="min-w-0 overflow-x-hidden">
            <StudyDotCard
              study={study}
              token={token}
              onRefresh={onRefresh}
              onClose={onCloseDayDetail}
            />
          </div>
        ))}
        {modalDayPendingTasks.map((task, i) => (
          <div key={task.task_id} className="min-w-0 overflow-x-hidden">
            {(i > 0 || modalDayStudies.length > 0) && <hr className="border-edge" />}
            <div className="pt-3 min-w-0 overflow-x-hidden">
              <TaskDetail
                task={task}
                token={token}
                studies={studies}
                studyMap={studyMap}
                onRefresh={onRefresh}
                onClose={onCloseDayDetail}
                rescheduleControls="auto_manual"
                logDateISO={selectedDay}
              />
            </div>
          </div>
        ))}
        {modalDayDoneTasks.map((task, i) => (
          <div key={`done_${task.task_id}`} className="min-w-0 overflow-x-hidden">
            {(i > 0 || modalDayStudies.length > 0 || modalDayPendingTasks.length > 0) && <hr className="border-edge" />}
            <div className="pt-3 min-w-0 overflow-x-hidden">
              <TaskDetail
                task={task}
                token={token}
                studies={studies}
                studyMap={studyMap}
                onRefresh={onRefresh}
                onClose={onCloseDayDetail}
                rescheduleControls="auto_manual"
                logDateISO={selectedDay}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
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
      <button className="underline hover:text-ink" onClick={onReactivate}>Reativar</button>
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
      <div className="bg-paper border border-edge w-full max-w-sm p-4 space-y-3">
        <h3 className="font-serif text-base">Apagar compromisso</h3>
        <p className="text-sm text-muted">Você tem certeza que deseja apagar esse compromisso?</p>
        <div className="flex gap-2 flex-col">
          <button onClick={onConfirmDelete} className="text-sm border border-red-600 text-red-600 px-3 py-2 hover:bg-red-50">
            Apagar
          </button>
          <button onClick={onCancel} className="text-sm text-muted px-3 py-2">
            Cancelar
          </button>
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
      <div className="bg-paper border border-edge w-full max-w-sm p-4 space-y-3">
        <h3 className="font-serif text-base">Reagendamento longo</h3>
        <p className="text-sm text-muted">
          Esta revisão está <strong>{warnTask.days} dias</strong> fora do agendamento ideal. Deseja continuar?
        </p>
        <div className="flex gap-2 flex-col">
          <button onClick={onAccept} className="text-sm border border-ink px-3 py-2">Sim, reagendar</button>
          <button onClick={onCancel} className="text-sm text-muted px-3 py-2">Cancelar</button>
          {warnCount >= 1 && (
            <button onClick={onNoDisturb} className="text-xs text-muted underline text-center">Não me perturbe novamente</button>
          )}
        </div>
      </div>
    </div>
  );
}
