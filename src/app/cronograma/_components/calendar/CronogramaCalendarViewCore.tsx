import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CalendarEventOut,
  DirectedStudyListItem,
  ReviewTask,
  updateReviewTask,
} from "@/lib/api";
import { IconStethoscope } from "../CronogramaIcons";
import { IconTrash } from "@/app/desempenho/_components/PerfilIcons";
import {
  displayDate,
  getRevisionNumber,
  todayISO,
} from "../../_lib/cronogramaShared";
import {
  CalendarActionButtons,
  CalendarCreateStudyModal,
  CalendarEventDeleteConfirmModal,
  CalendarEventRescheduleSheet,
  CalendarEventMoveErrorToast,
  CalendarNoDisturbNotice,
  CalendarRescheduleWarningModal,
  CalendarEntryPopup,
  CalendarStudyDeleteConfirmModal,
  CalendarTaskRescheduleSheet,
  CalendarUndoRescheduleToast,
} from "./CalendarSections";
import {
  buildCalendarCells,
  buildSearchMatchDays,
  buildTasksByDate,
  CalendarPopupTarget,
} from "./derived";
import { CalendarGrid } from "./CalendarGrid";
import { useCalendarMonthNavigation } from "./hooks/useCalendarMonthNavigation";
import { useEventDragAndMutation } from "./hooks/useEventDragAndMutation";
import { useTaskDragReschedule } from "./hooks/useTaskDragReschedule";

const TRACK_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

type MonthSnapshot = {
  year: number;
  month: number;
  cells: Array<number | null>;
  rowCount: number;
};

function buildMonthSnapshot(year: number, month: number): MonthSnapshot {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = buildCalendarCells(startOffset, daysInMonth);
  return {
    year,
    month,
    cells,
    rowCount: Math.max(1, Math.ceil(cells.length / 7)),
  };
}

function estimateCalendarGridHeightPx(params: {
  rowCount: number;
  showDayDetail: boolean;
  isMobilePortrait: boolean;
}): number {
  const { rowCount, showDayDetail, isMobilePortrait } = params;
  // Conservative fallback used only before DOM measurement settles.
  const rowBasePx = showDayDetail
    ? (isMobilePortrait ? 56 : 52)
    : (isMobilePortrait ? 112 : 96);
  return rowBasePx * rowCount;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isSamePopupTarget(left: CalendarPopupTarget, right: CalendarPopupTarget): boolean {
  if (left.kind !== right.kind) return false;
  if ("task" in left && "task" in right) return left.task.task_id === right.task.task_id;
  if ("study" in left && "study" in right) return left.study.study_id === right.study.study_id;
  if (left.kind === "event" && right.kind === "event") {
    return left.event.event_id === right.event.event_id && left.sourceISO === right.sourceISO;
  }
  return false;
}

function measureGridContentHeight(gridEl: HTMLDivElement | null): number {
  if (!gridEl) return 0;
  const gridRect = gridEl.getBoundingClientRect();
  if (gridRect.height <= 0) return 0;

  const lastRowCells = Array.from(
    gridEl.querySelectorAll<HTMLElement>('[data-calendar-last-row="true"]'),
  );
  const measuredCells = lastRowCells.length > 0
    ? lastRowCells
    : Array.from(gridEl.querySelectorAll<HTMLElement>('[data-calendar-cell="true"]'));

  if (measuredCells.length === 0) {
    return Math.max(0, Math.ceil(gridRect.height));
  }

  let maxBottom = gridRect.top;
  for (const cell of measuredCells) {
    const rect = cell.getBoundingClientRect();
    maxBottom = Math.max(maxBottom, rect.bottom);
  }

  const rawContentHeight = maxBottom - gridRect.top;
  if (rawContentHeight <= 0) return Math.max(0, Math.ceil(gridRect.height));

  // +2px safety margin to avoid subpixel cut on the final row.
  return Math.max(0, Math.ceil(rawContentHeight) + 2);
}

export function CronogramaCalendarView({
  tasks,
  doneTasks,
  studies,
  turboCardsByDate,
  studiesByDate,
  studyMap,
  events,
  token,
  onRefresh,
  onEventMutated,
  onTaskRescheduled,
  searchQuery,
  initialSelectedDay = null,
  onMonthYearChange,
  viewSwitchSlot,
  isMobilePortrait = false,
}: {
  tasks: ReviewTask[];
  doneTasks: ReviewTask[];
  studies: DirectedStudyListItem[];
  turboCardsByDate: Record<string, number>;
  studiesByDate: Record<string, DirectedStudyListItem[]>;
  studyMap: Map<string, DirectedStudyListItem>;
  events: CalendarEventOut[];
  token: string;
  onRefresh: () => void;
  onEventMutated?: () => Promise<void> | void;
  onTaskRescheduled?: () => void;
  searchQuery?: string;
  initialSelectedDay?: string | null;
  onMonthYearChange?: (
    month: number,
    year: number,
    rowCount: number,
    goToToday: () => void,
    prevMonth: () => void,
    nextMonth: () => void,
    goToMonth: (year: number, month: number) => void,
  ) => void;
  viewSwitchSlot?: React.ReactNode;
  isMobilePortrait?: boolean;
}) {
  const today = todayISO();
  const [selectedDay, setSelectedDay] = useState<string | null>(initialSelectedDay);
  const showDayDetail = false;

  const [modal, setModal] = useState<"create" | null>(null);
  const [barPopup, setBarPopup] = useState<{ target: CalendarPopupTarget; rect: DOMRect } | null>(null);
  const [rescheduleTask, setRescheduleTask] = useState<ReviewTask | null>(null);
  const [deleteStudy, setDeleteStudy] = useState<DirectedStudyListItem | null>(null);
  const [rescheduleEvent, setRescheduleEvent] = useState<{
    event: CalendarEventOut;
    sourceISO: string;
    iconType: "work" | "other";
  } | null>(null);
  const [taskMoveError, setTaskMoveError] = useState("");
  const [undoReschedule, setUndoReschedule] = useState<{
    task: ReviewTask;
    fromISO: string;
    toISO: string;
  } | null>(null);

  useEffect(() => {
    if (initialSelectedDay) setSelectedDay(initialSelectedDay);
  }, [initialSelectedDay]);

  function handleDaySelect(iso: string | null) {
    setSelectedDay(iso);
    setBarPopup(null);
  }

  function handleBarClick(target: CalendarPopupTarget, rect: DOMRect) {
    setBarPopup((prev) => (prev && isSamePopupTarget(prev.target, target) ? null : { target, rect }));
  }

  function handleTaskRescheduled(task: ReviewTask, fromISO: string, toISO: string) {
    setTaskMoveError("");
    setUndoReschedule({ task, fromISO, toISO });
    void onRefresh();
    onTaskRescheduled?.();
  }

  function handleTaskRescheduleError(_task: ReviewTask, _fromISO: string, toISO: string) {
    setTaskMoveError(`Não foi possível reagendar para ${displayDate(toISO)}.`);
  }

  async function undoLastTaskReschedule() {
    if (!undoReschedule) return;
    const { task, fromISO } = undoReschedule;
    setUndoReschedule(null);
    try {
      await updateReviewTask(token, task.task_id, { due_date: fromISO });
      await onRefresh();
    } catch {
      setTaskMoveError("Não foi possível desfazer o reagendamento.");
    }
  }

  const taskRevisionMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of [...tasks, ...doneTasks]) {
      map.set(task.task_id, getRevisionNumber(task, studies, studyMap));
    }
    return map;
  }, [tasks, doneTasks, studies, studyMap]);
  const [viewportWidth, setViewportWidthState] = useState(0);
  const [activeLayerHeight, setActiveLayerHeight] = useState(0);
  const [previewLayerHeight, setPreviewLayerHeight] = useState(0);

  const activeGridRef = useRef<HTMLDivElement | null>(null);
  const previewGridRef = useRef<HTMLDivElement | null>(null);

  const {
    year,
    month,
    transition,
    setViewportWidth,
    prevMonth,
    nextMonth,
    goToToday,
    goToMonth,
    handleMonthGridTouchStart: rawHandleMonthGridTouchStart,
    handleMonthGridTouchMove: rawHandleMonthGridTouchMove,
    handleMonthGridTouchEnd: rawHandleMonthGridTouchEnd,
    consumeSuppressTap,
  } = useCalendarMonthNavigation();

  const {
    monthGridRef,
    dragTaskId,
    dragFromISO,
    touchDraggingTaskId,
    touchDragGhost,
    taskDragOrigin,
    touchDragTouchId,
    warnTask,
    warnCount,
    noDisturb,
    setWarnTask,
    handleWarnAccept,
    handleNoDisturb,
    reactivateNoDisturb,
    clearDragState,
    handleDrop,
    beginTaskDrag,
    startTouchDrag,
    startPointerTouchDrag,
    cellISOFromPoint,
    getTouchById,
  } = useTaskDragReschedule({
    token,
    onRefresh,
    prevMonth,
    nextMonth,
    onRescheduleSuccess: handleTaskRescheduled,
    onRescheduleError: handleTaskRescheduleError,
  });

  const {
    dragEventMeta,
    touchEventGhost,
    isLandscape,
    eventDeleteZoneVisible,
    eventDeleteHot,
    eventMoveError,
    eventDeleteConfirm,
    eventDeleteZoneRef,
    setEventDeleteHot,
    setEventDeleteConfirm,
    hideEventMoveError,
    beginEventDrag,
    startTouchEventDrag,
    handleEventDrop,
    isDeleteDropTargetFromEvent,
    syncEventDeleteHotByPoint,
    syncEventDeleteHotByDragEvent,
    handleEventDeleteDrop,
    handleEventDragEnd,
    confirmDeleteDraggedEvent,
    requestEventDelete,
    rescheduleEventToDate,
  } = useEventDragAndMutation({
    token,
    events,
    onRefresh,
    onEventMutated,
    cellISOFromPoint,
    getTouchById,
    monthGridRef,
    prevMonth,
    nextMonth,
  });

  const monthNavLocked = Boolean(dragTaskId || dragEventMeta);

  useEffect(() => {
    const rowCount = buildMonthSnapshot(year, month).rowCount;
    onMonthYearChange?.(month, year, rowCount, goToToday, prevMonth, nextMonth, goToMonth);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  useEffect(() => {
    const viewportEl = monthGridRef.current;
    if (!viewportEl) return;

    const measure = () => {
      const nextWidth = viewportEl.getBoundingClientRect().width;
      setViewportWidth(nextWidth);
      setViewportWidthState(nextWidth);
    };

    measure();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(viewportEl);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [monthGridRef, setViewportWidth]);

  useLayoutEffect(() => {
    const activeGrid = activeGridRef.current;
    if (!activeGrid) return;
    const measure = () => {
      const next = measureGridContentHeight(activeGrid);
      setActiveLayerHeight(next);
    };
    measure();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(activeGrid);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [year, month, showDayDetail, isMobilePortrait, transition.phase]);

  useLayoutEffect(() => {
    const previewGrid = previewGridRef.current;
    if (!previewGrid) {
      setPreviewLayerHeight(0);
      return;
    }
    const measure = () => {
      const next = measureGridContentHeight(previewGrid);
      setPreviewLayerHeight(next);
    };
    measure();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(previewGrid);
    }
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [transition.previewYear, transition.previewMonth, showDayDetail, isMobilePortrait, transition.phase]);

  const activeSnapshot = useMemo(
    () => buildMonthSnapshot(year, month),
    [year, month],
  );

  const previewSnapshot = useMemo(() => {
    if (transition.previewYear === null || transition.previewMonth === null) return null;
    return buildMonthSnapshot(transition.previewYear, transition.previewMonth);
  }, [transition.previewYear, transition.previewMonth]);

  const byDate = useMemo(() => buildTasksByDate(tasks, doneTasks), [tasks, doneTasks]);

  const searchMatchDays = useMemo(
    () => buildSearchMatchDays({
      searchQuery,
      studiesByDate,
      tasks,
      doneTasks,
    }),
    [searchQuery, studiesByDate, tasks, doneTasks],
  );

  function closeModal() {
    setModal(null);
  }

  function handleMonthGridTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (monthNavLocked) return;
    rawHandleMonthGridTouchStart(e);
  }

  function handleMonthGridTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (monthNavLocked) return;
    rawHandleMonthGridTouchMove(e);
  }

  function handleMonthGridTouchEnd() {
    if (monthNavLocked) return;
    rawHandleMonthGridTouchEnd();
  }

  function activeCellISO(day: number): string {
    return `${activeSnapshot.year}-${String(activeSnapshot.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function previewCellISO(day: number): string {
    if (!previewSnapshot) return "";
    return `${previewSnapshot.year}-${String(previewSnapshot.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const hasPreviewLayer = Boolean(transition.direction && previewSnapshot);
  const trackOffsetPx = hasPreviewLayer ? transition.offsetPx : 0;
  const previewLayerOffset = transition.direction === "next" ? "100%" : "-100%";

  const activeHeightFallback = estimateCalendarGridHeightPx({
    rowCount: activeSnapshot.rowCount,
    showDayDetail,
    isMobilePortrait,
  });
  const previewHeightFallback = estimateCalendarGridHeightPx({
    rowCount: previewSnapshot?.rowCount ?? activeSnapshot.rowCount,
    showDayDetail,
    isMobilePortrait,
  });

  const resolvedActiveHeight = activeLayerHeight > 0 ? activeLayerHeight : activeHeightFallback;
  const resolvedPreviewHeight = previewLayerHeight > 0 ? previewLayerHeight : previewHeightFallback;

  let viewportHeight = resolvedActiveHeight;
  if (hasPreviewLayer) {
    if (transition.phase === "dragging" && viewportWidth > 0) {
      const progress = clamp01(Math.abs(trackOffsetPx) / viewportWidth);
      viewportHeight = resolvedActiveHeight + (resolvedPreviewHeight - resolvedActiveHeight) * progress;
    } else if (transition.phase === "animating") {
      viewportHeight = transition.shouldCommit ? resolvedPreviewHeight : resolvedActiveHeight;
    }
  }

  const viewportStyle: React.CSSProperties = {
    height: viewportHeight,
    transition: transition.phase === "animating"
      ? `height ${transition.durationMs}ms ${TRACK_EASING}`
      : undefined,
  };
  const trackStyle: React.CSSProperties = {
    transform: `translate3d(${trackOffsetPx}px, 0, 0)`,
    transition: transition.phase === "animating"
      ? `transform ${transition.durationMs}ms ${TRACK_EASING}`
      : undefined,
  };

  return (
    <div
      className="touch-no-select"
      onClickCapture={(e) => {
        if (consumeSuppressTap()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragOverCapture={(e) => {
        if (!dragEventMeta || !eventDeleteZoneVisible) return;
        syncEventDeleteHotByDragEvent(e);
        e.preventDefault();
      }}
      onDropCapture={(e) => {
        if (!dragEventMeta || !eventDeleteZoneVisible) return;
        if (!isDeleteDropTargetFromEvent(e.target, e.clientX, e.clientY)) return;
        e.preventDefault();
        e.stopPropagation();
        handleEventDeleteDrop();
      }}
    >
      {touchDragGhost && (
        <div
          className="pointer-events-none fixed z-[70] max-w-[14rem]"
          style={{ left: touchDragGhost.x, top: touchDragGhost.y, transform: "translate(-50%, -50%)" }}
        >
          <div className="flex items-center gap-2 border border-edge bg-paper px-2 py-1.5 ">
            <span
              className="h-3 w-3 shrink-0 border border-ink/35"
              style={{ backgroundColor: touchDragGhost.color, opacity: 0.92 }}
            />
            <span className="min-w-0 truncate text-micro font-semibold text-ink">
              {touchDragGhost.label}
            </span>
          </div>
        </div>
      )}

      {touchEventGhost && (
        <div
          className="pointer-events-none fixed z-[71]"
          style={{ left: touchEventGhost.x, top: touchEventGhost.y, transform: "translate(-50%, -50%)" }}
        >
          <div className="w-6 h-6 border border-ink/45 bg-paper flex items-center justify-center">
            {touchEventGhost.iconType === "work" ? (
              <IconStethoscope className="w-3.5 h-3.5 text-ink" />
            ) : (
              <span className="text-xs font-semibold leading-none text-ink">!</span>
            )}
          </div>
        </div>
      )}

      <CalendarEventMoveErrorToast message={eventMoveError} onClose={hideEventMoveError} />
      <CalendarEventMoveErrorToast message={taskMoveError} onClose={() => setTaskMoveError("")} />

      <div className="overflow-visible">
        <div className="grid grid-cols-7 text-center mb-1">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((dayLabel, idx) => (
            <span key={idx} className="text-xs text-muted">{dayLabel}</span>
          ))}
        </div>

        <div
          ref={monthGridRef}
          data-calendar-viewport="true"
          data-calendar-transition-phase={transition.phase}
          data-calendar-transition-direction={transition.direction ?? "none"}
          data-calendar-active-rows={activeSnapshot.rowCount}
          data-calendar-preview-rows={previewSnapshot?.rowCount ?? ""}
          className="relative overflow-hidden"
          style={viewportStyle}
        >
          <div
            data-calendar-track="true"
            className="absolute inset-0 will-change-transform"
            style={trackStyle}
          >
            <div
              data-calendar-layer="active"
              data-calendar-layer-rows={activeSnapshot.rowCount}
              className="absolute inset-0"
            >
              <CalendarGrid
                gridRef={activeGridRef}
                cells={activeSnapshot.cells}
                cellISO={activeCellISO}
                byDate={byDate}
                turboCardsByDate={turboCardsByDate}
                studiesByDate={studiesByDate}
                events={events}
                searchMatchDays={searchMatchDays}
                today={today}
                isMobilePortrait={isMobilePortrait}
                selectedDay={selectedDay}
                showDayDetail={showDayDetail}
                dragEventMeta={dragEventMeta}
                dragTaskId={dragTaskId}
                dragFromISO={dragFromISO}
                taskDragOrigin={taskDragOrigin}
                touchDragTouchId={touchDragTouchId}
                touchDraggingTaskId={touchDraggingTaskId}
                onMonthGridTouchStart={handleMonthGridTouchStart}
                onMonthGridTouchMove={handleMonthGridTouchMove}
                onMonthGridTouchEnd={handleMonthGridTouchEnd}
                onDaySelect={handleDaySelect}
                onCloseDayDetailForSameDay={() => handleDaySelect(null)}
                onBarClick={handleBarClick}
                onDoubleClickEmpty={() => setModal("create")}
                taskRevisionMap={taskRevisionMap}
                handleEventDrop={handleEventDrop}
                handleDrop={handleDrop}
                startTouchEventDrag={startTouchEventDrag}
                beginEventDrag={beginEventDrag}
                syncEventDeleteHotByPoint={syncEventDeleteHotByPoint}
                handleEventDragEnd={handleEventDragEnd}
                startTouchDrag={startTouchDrag}
                startPointerTouchDrag={startPointerTouchDrag}
                beginTaskDrag={beginTaskDrag}
                clearDragState={clearDragState}
              />
            </div>

            {hasPreviewLayer && previewSnapshot && (
              <div
                data-calendar-layer="preview"
                data-calendar-layer-rows={previewSnapshot.rowCount}
                className="absolute inset-y-0 w-full pointer-events-none"
                style={{ left: previewLayerOffset }}
              >
                <CalendarGrid
                  gridRef={previewGridRef}
                  cells={previewSnapshot.cells}
                  cellISO={previewCellISO}
                  byDate={byDate}
                  turboCardsByDate={turboCardsByDate}
                  studiesByDate={studiesByDate}
                  events={events}
                  searchMatchDays={searchMatchDays}
                  today={today}
                  isMobilePortrait={isMobilePortrait}
                  selectedDay={null}
                  showDayDetail={showDayDetail}
                  dragEventMeta={null}
                  dragTaskId={null}
                  dragFromISO={null}
                  taskDragOrigin={taskDragOrigin}
                  touchDragTouchId={touchDragTouchId}
                  touchDraggingTaskId={null}
                  onMonthGridTouchStart={handleMonthGridTouchStart}
                  onMonthGridTouchMove={handleMonthGridTouchMove}
                  onMonthGridTouchEnd={handleMonthGridTouchEnd}
                  onDaySelect={() => {}}
                  onCloseDayDetailForSameDay={() => {}}
                  handleEventDrop={() => {}}
                  handleDrop={() => {}}
                  startTouchEventDrag={startTouchEventDrag}
                  beginEventDrag={beginEventDrag}
                  syncEventDeleteHotByPoint={syncEventDeleteHotByPoint}
                  handleEventDragEnd={handleEventDragEnd}
                  startTouchDrag={startTouchDrag}
                  startPointerTouchDrag={startPointerTouchDrag}
                  beginTaskDrag={beginTaskDrag}
                  clearDragState={clearDragState}
                  interactive={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {dragEventMeta && eventDeleteZoneVisible && (
        <div
          ref={eventDeleteZoneRef}
          data-event-delete-zone="1"
          onDragEnter={() => setEventDeleteHot(true)}
          onDragLeave={() => setEventDeleteHot(false)}
          onDragOver={(e) => {
            e.preventDefault();
            syncEventDeleteHotByPoint(e.clientX, e.clientY);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleEventDeleteDrop();
          }}
          className={`flex items-center justify-center gap-2 py-3 mt-1 border transition-colors ${
            eventDeleteHot
              ? "border-danger bg-surfaceMuted text-danger dark:border-danger dark:bg-danger/40 dark:text-danger"
              : "border-dashed border-edge text-muted"
          }`}
          aria-label="Apagar compromisso"
        >
          <IconTrash className="w-4 h-4 transition-colors" />
          <span className="text-xs">Solte aqui para apagar</span>
        </div>
      )}

      <CalendarActionButtons
        selectedDay={selectedDay}
        modal={modal}
        viewSwitchSlot={viewSwitchSlot}
        onOpenCreateModal={() => setModal("create")}
      />

      {barPopup && (
        <CalendarEntryPopup
          target={barPopup.target}
          anchorRect={barPopup.rect}
          studies={studies}
          studyMap={studyMap}
          onRescheduleRequest={setRescheduleTask}
          onDeleteStudyRequest={setDeleteStudy}
          onDeleteEventRequest={requestEventDelete}
          onRescheduleEventRequest={(event, sourceISO, iconType) => setRescheduleEvent({ event, sourceISO, iconType })}
          onClose={() => setBarPopup(null)}
        />
      )}

      <CalendarTaskRescheduleSheet
        task={rescheduleTask}
        token={token}
        onClose={() => setRescheduleTask(null)}
        onRescheduled={handleTaskRescheduled}
      />

      <CalendarEventRescheduleSheet
        key={rescheduleEvent ? `${rescheduleEvent.event.event_id}:${rescheduleEvent.sourceISO}` : "no-event-reschedule"}
        event={rescheduleEvent?.event ?? null}
        sourceISO={rescheduleEvent?.sourceISO ?? null}
        iconType={rescheduleEvent?.iconType ?? null}
        onClose={() => setRescheduleEvent(null)}
        onReschedule={rescheduleEventToDate}
      />

      <CalendarStudyDeleteConfirmModal
        key={deleteStudy?.study_id ?? "no-study-delete"}
        study={deleteStudy}
        token={token}
        onCancel={() => setDeleteStudy(null)}
        onDeleted={() => {
          setDeleteStudy(null);
          void onRefresh();
        }}
      />

      {undoReschedule ? (
        <CalendarUndoRescheduleToast
          message={`Atividade reagendada para ${displayDate(undoReschedule.toISO)}.`}
          onUndo={undoLastTaskReschedule}
          onClose={() => setUndoReschedule(null)}
        />
      ) : null}

      <CalendarNoDisturbNotice
        noDisturb={noDisturb}
        onReactivate={reactivateNoDisturb}
      />

      <CalendarCreateStudyModal
        modal={modal}
        selectedDay={selectedDay}
        token={token}
        studies={studies}
        events={events}
        onRefresh={onRefresh}
        onClose={closeModal}
        onClearSelectedDay={() => setSelectedDay(null)}
      />

      <CalendarEventDeleteConfirmModal
        eventDeleteConfirm={eventDeleteConfirm}
        onConfirmDelete={confirmDeleteDraggedEvent}
        onCancel={() => setEventDeleteConfirm(null)}
      />

      <CalendarRescheduleWarningModal
        warnTask={warnTask}
        warnCount={warnCount}
        onAccept={handleWarnAccept}
        onCancel={() => setWarnTask(null)}
        onNoDisturb={handleNoDisturb}
      />
    </div>
  );
}
