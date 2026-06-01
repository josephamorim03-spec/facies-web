import { MutableRefObject, Ref, useEffect, useRef, useState } from "react";
import { CalendarEventOut, DirectedStudyListItem, ReviewTask } from "@/lib/api";
import { IconCards, IconStethoscope } from "../CronogramaIcons";
import {
  eventFlags,
} from "../../_lib/cronogramaShared";
import { buildDayDotEntries } from "./derived";
import { CalendarDragEventMeta, isPastCalendarCell } from "./eventRules";

type ExpandedRowState = { row: number; slots: number } | null;
const MONTHLY_DOT_LIMIT = 4;

export function CalendarGrid({
  gridRef,
  cells,
  cellISO,
  byDate,
  turboCardsByDate,
  studiesByDate,
  events,
  searchMatchDays,
  today,
  isMobilePortrait,
  selectedDay,
  showDayDetail,
  expandedCell,
  expandedRow,
  setExpandedCell,
  setExpandedRow,
  expandTimer,
  dragEventMeta,
  dragTaskId,
  dragFromISO,
  taskDragOrigin,
  touchDragTouchId,
  touchDraggingTaskId,
  isTouchDevice,
  onMonthGridTouchStart,
  onMonthGridTouchMove,
  onMonthGridTouchEnd,
  onDaySelect,
  onCloseDayDetailForSameDay,
  handleEventDrop,
  handleDrop,
  startTouchEventDrag,
  beginEventDrag,
  syncEventDeleteHotByPoint,
  handleEventDragEnd,
  startTouchDrag,
  startPointerTouchDrag,
  beginTaskDrag,
  clearDragState,
  interactive = true,
  onBarClick,
  onDoubleClickEmpty,
  taskRevisionMap,
}: {
  gridRef?: Ref<HTMLDivElement>;
  cells: Array<number | null>;
  cellISO: (day: number) => string;
  byDate: Record<string, ReviewTask[]>;
  turboCardsByDate: Record<string, number>;
  studiesByDate: Record<string, DirectedStudyListItem[]>;
  events: CalendarEventOut[];
  searchMatchDays: Set<string>;
  today: string;
  isMobilePortrait: boolean;
  selectedDay: string | null;
  showDayDetail: boolean;
  expandedCell: string | null;
  expandedRow: ExpandedRowState;
  setExpandedCell: (value: string | null) => void;
  setExpandedRow: (value: ExpandedRowState) => void;
  expandTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  dragEventMeta: CalendarDragEventMeta | null;
  dragTaskId: string | null;
  dragFromISO: string | null;
  taskDragOrigin: MutableRefObject<"touch" | "mouse" | null>;
  touchDragTouchId: MutableRefObject<number | null>;
  touchDraggingTaskId: string | null;
  isTouchDevice: boolean;
  onMonthGridTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  onMonthGridTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  onMonthGridTouchEnd: () => void;
  onDaySelect: (iso: string | null) => void;
  onCloseDayDetailForSameDay: () => void;
  handleEventDrop: (iso: string) => void;
  handleDrop: (iso: string) => void;
  startTouchEventDrag: (
    e: React.TouchEvent<HTMLElement>,
    ev: CalendarEventOut,
    sourceISO: string,
    iconType: "work" | "other",
  ) => void;
  beginEventDrag: (
    ev: CalendarEventOut,
    sourceISO: string,
    iconType: "work" | "other",
    touchMeta?: { touchId: number; clientX: number; clientY: number },
  ) => void;
  syncEventDeleteHotByPoint: (clientX: number, clientY: number) => void;
  handleEventDragEnd: () => void;
  startTouchDrag: (
    e: React.TouchEvent<HTMLDivElement>,
    task: ReviewTask,
    fromISO: string,
    color: string,
  ) => void;
  startPointerTouchDrag: (
    e: React.PointerEvent<HTMLDivElement>,
    task: ReviewTask,
    fromISO: string,
    color: string,
  ) => void;
  beginTaskDrag: (
    task: ReviewTask,
    fromISO: string,
    touchMeta?: { touchId: number; clientX: number; clientY: number; color?: string; transport?: "touch" | "pointer" },
  ) => void;
  clearDragState: () => void;
  interactive?: boolean;
  onBarClick?: (task: ReviewTask, rect: DOMRect) => void;
  onDoubleClickEmpty?: () => void;
  taskRevisionMap?: Map<string, number>;
}) {
  const [activeFlashcardsTooltipIso, setActiveFlashcardsTooltipIso] = useState<string | null>(null);
  const flashcardsTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeFlashcardsTooltipIso) return;

    const clearTooltip = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.("[data-calendar-flashcards-trigger='true']")) return;
      setActiveFlashcardsTooltipIso(null);
    };

    window.addEventListener("pointerdown", clearTooltip, true);
    window.addEventListener("touchstart", clearTooltip, true);
    window.addEventListener("keydown", clearTooltip, true);
    window.addEventListener("scroll", clearTooltip, true);

    return () => {
      window.removeEventListener("pointerdown", clearTooltip, true);
      window.removeEventListener("touchstart", clearTooltip, true);
      window.removeEventListener("keydown", clearTooltip, true);
      window.removeEventListener("scroll", clearTooltip, true);
    };
  }, [activeFlashcardsTooltipIso]);

  useEffect(() => {
    if (flashcardsTooltipTimerRef.current) {
      clearTimeout(flashcardsTooltipTimerRef.current);
      flashcardsTooltipTimerRef.current = null;
    }
    if (!activeFlashcardsTooltipIso) return;

    flashcardsTooltipTimerRef.current = setTimeout(() => {
      setActiveFlashcardsTooltipIso(null);
      flashcardsTooltipTimerRef.current = null;
    }, 4000);
  }, [activeFlashcardsTooltipIso]);

  useEffect(() => {
    return () => {
      if (flashcardsTooltipTimerRef.current) clearTimeout(flashcardsTooltipTimerRef.current);
    };
  }, []);

  function setEventDragImage(e: React.DragEvent<HTMLElement>, iconType: "work" | "other") {
    if (typeof document === "undefined") return;
    if (!e.dataTransfer) return;

    const dragImage = document.createElement("div");
    dragImage.style.width = "24px";
    dragImage.style.height = "24px";
    dragImage.style.border = "1px solid rgba(30, 41, 59, 0.45)";
    dragImage.style.borderRadius = "999px";
    dragImage.style.background = "rgba(255, 255, 255, 0.96)";
    dragImage.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.18)";
    dragImage.style.display = "flex";
    dragImage.style.alignItems = "center";
    dragImage.style.justifyContent = "center";
    dragImage.style.position = "fixed";
    dragImage.style.top = "-1000px";
    dragImage.style.left = "-1000px";
    dragImage.style.pointerEvents = "none";
    dragImage.style.zIndex = "9999";

    const sourceIcon = (e.currentTarget as HTMLElement).firstElementChild?.cloneNode(true) as HTMLElement | null;
    if (sourceIcon) {
      sourceIcon.removeAttribute("style");
      sourceIcon.classList.add("w-3", "h-3");
      dragImage.appendChild(sourceIcon);
    } else {
      const fallback = document.createElement("span");
      fallback.textContent = iconType === "work" ? "W" : "!";
      fallback.style.fontSize = "11px";
      fallback.style.fontWeight = "600";
      fallback.style.lineHeight = "1";
      fallback.style.color = "#111827";
      dragImage.appendChild(fallback);
    }

    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 12, 12);
    window.setTimeout(() => dragImage.remove(), 0);
  }

  return (
    <div
      ref={gridRef}
      data-allow-horizontal-swipe={interactive ? "true" : undefined}
      className="grid grid-cols-7 border-l border-t border-edge"
      style={interactive ? { touchAction: "pan-y" } : undefined}
      onTouchStart={interactive ? onMonthGridTouchStart : undefined}
      onTouchMove={interactive ? onMonthGridTouchMove : undefined}
      onTouchEnd={interactive ? onMonthGridTouchEnd : undefined}
      onTouchCancel={interactive ? onMonthGridTouchEnd : undefined}
    >
      {cells.map((day, idx) => {
        const rowIndex = Math.floor(idx / 7);
        const totalRows = Math.max(1, Math.ceil(cells.length / 7));
        const isLastRow = rowIndex === totalRows - 1;
        const isLastCell = idx === cells.length - 1;
        if (!day) {
          return (
            <div
              key={`empty-${idx}`}
              data-calendar-cell="true"
              data-calendar-row-index={rowIndex}
              data-calendar-last-row={isLastRow ? "true" : undefined}
              data-calendar-last-cell={isLastCell ? "true" : undefined}
              className="bg-paper border-r border-b border-edge"
            />
          );
        }
        const iso = cellISO(day);
        const dayTasks = byDate[iso] ?? [];
        const dayStudies = studiesByDate[iso] ?? [];
        const isPastDay = isPastCalendarCell(iso, today);
        const isToday = iso === today;
        const isSelected = iso === selectedDay;
        const isSearchMatch = searchMatchDays.has(iso);
        const { hasWork, hasOther, workLabels, otherLabels, workEvent, otherEvent } = eventFlags(iso, events);
        const cardsDone = Math.max(0, Number(turboCardsByDate[iso] ?? 0));
        const hasFlashcards = cardsDone > 0;
        const isWorkCompleted = Boolean(workEvent) && isPastDay;
        const isOtherCompleted = Boolean(otherEvent) && isPastDay;
        const canDragWorkEvent = !showDayDetail && Boolean(workEvent) && !isWorkCompleted;
        const canDragOtherEvent = !showDayDetail && Boolean(otherEvent) && !isOtherCompleted;

        const pendingTasks = dayTasks.filter((task) => task.status === "pending");
        const doneTasks = dayTasks.filter((task) => task.status === "done");
        const isExpanded = expandedCell === iso;
        const rowExpansion = expandedRow && expandedRow.row === rowIndex ? expandedRow : null;

        const allDots = buildDayDotEntries({
          dayStudies,
          pendingTasks,
          doneTasks,
        });
        const baseVisibleDotLimit = showDayDetail
          ? 4
          : MONTHLY_DOT_LIMIT;
        const visibleDotLimit = rowExpansion
          ? (isExpanded ? allDots.length : Math.min(allDots.length, rowExpansion.slots))
          : baseVisibleDotLimit;
        const visibleDots = allDots.slice(0, visibleDotLimit);
        const shouldRenderDotGrid = visibleDots.length > 0;
        const hasOverflow = allDots.length > visibleDotLimit;
        const dayCellMinHeight = showDayDetail
          ? (isMobilePortrait ? "min-h-[3.2rem]" : "min-h-[3rem]")
          : (isMobilePortrait ? "min-h-[6.35rem]" : "min-h-[6rem]");

        return (
          <div
            key={iso}
            data-cell-iso={iso}
            data-calendar-cell="true"
            data-calendar-row-index={rowIndex}
            data-calendar-last-row={isLastRow ? "true" : undefined}
            data-calendar-last-cell={isLastCell ? "true" : undefined}
            className={`relative ${dayCellMinHeight} p-0.5 bg-paper border-r border-b border-edge cursor-pointer overflow-visible`}
            style={
              isSelected && isSearchMatch
                ? { backgroundColor: "var(--amber-tint)", boxShadow: "inset 0 0 0 2px #f59e0b" }
                : isToday && isSelected
                  ? { backgroundColor: "var(--amber-tint)", boxShadow: "inset 0 0 0 2px var(--color-ink)" }
                  : isSelected
                    ? { backgroundColor: "var(--amber-tint)", boxShadow: "inset 0 0 0 1px #f59e0b" }
                    : isSearchMatch
                      ? { boxShadow: "inset 0 0 0 2px #f59e0b" }
                      : isToday
                        ? { boxShadow: "inset 0 0 0 2px var(--color-ink)" }
                        : {}
            }
            onClick={() => {
              if (!interactive) return;
              if (dragEventMeta) { handleEventDrop(iso); return; }
              if (dragTaskId && dragFromISO) { handleDrop(iso); return; }
              if (expandedRow && expandedRow.row !== rowIndex) {
                setExpandedCell(null);
                setExpandedRow(null);
                if (expandTimer.current) clearTimeout(expandTimer.current);
              }
              onDaySelect(isSelected ? null : iso);
              if (isSelected) onCloseDayDetailForSameDay();
            }}
            onDoubleClick={() => {
              if (!interactive) return;
              if (!isSelected) onDaySelect(iso);
              onDoubleClickEmpty?.();
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!interactive) return;
              if (dragEventMeta) handleEventDrop(iso);
              else handleDrop(iso);
            }}
          >
            <div className="absolute top-0.5 left-0 right-0 flex justify-center">
              {isToday ? (
                <span className={`${showDayDetail ? "text-[9px] w-3.5 h-3.5" : "text-[10px] w-4 h-4"} leading-none bg-ink text-paper rounded-full flex items-center justify-center font-medium`}>
                  {day}
                </span>
              ) : (
                <span className={`${showDayDetail ? "text-[9px]" : "text-[10px]"} leading-none text-muted`}>
                  {day}
                </span>
              )}
            </div>

            {(hasWork || hasOther) && (
              <div
                className={`absolute top-[1px] right-[1px] flex ${hasWork && hasOther ? "flex-row items-start gap-[2px]" : "flex-col items-end gap-[1px]"}`}
                style={{ lineHeight: 1 }}
              >
                {hasWork && (
                  <div
                    className={`relative group inline-flex ${showDayDetail ? "w-3 h-3" : "w-4 h-4"} items-start justify-end ${isWorkCompleted ? "opacity-40" : ""}`}
                    data-testid="calendar-event-work-icon"
                    data-cell-iso={iso}
                    data-event-status={isWorkCompleted ? "completed" : "active"}
                    draggable={interactive && canDragWorkEvent}
                    onTouchStart={interactive && canDragWorkEvent && workEvent ? (e) => startTouchEventDrag(e, workEvent, iso, "work") : undefined}
                    onDragStart={interactive && canDragWorkEvent && workEvent ? (e) => {
                      e.stopPropagation();
                      if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", `event:${workEvent.event_id}`);
                        setEventDragImage(e, "work");
                      }
                      beginEventDrag(workEvent, iso, "work");
                    } : undefined}
                    onDrag={interactive && canDragWorkEvent && workEvent ? (e) => {
                      syncEventDeleteHotByPoint(e.clientX, e.clientY);
                    } : undefined}
                    onDragEnd={interactive && canDragWorkEvent && workEvent ? () => handleEventDragEnd() : undefined}
                  >
                    <IconStethoscope className={`${showDayDetail ? "w-2 h-2" : "w-2.5 h-2.5"} text-ink`} />
                    <span className="pointer-events-none absolute bottom-full right-0 mb-0.5 whitespace-nowrap rounded bg-ink text-paper px-1 py-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      {(workLabels.length > 0 ? workLabels.join(" - ") : "Trabalho") + (isWorkCompleted ? " - feito" : "")}
                    </span>
                  </div>
                )}
                {hasOther && (
                  <div
                    className={`relative group inline-flex ${showDayDetail ? "w-3 h-3" : "w-4 h-4"} items-start justify-end ${isOtherCompleted ? "opacity-40" : ""}`}
                    data-testid="calendar-event-other-icon"
                    data-cell-iso={iso}
                    data-event-status={isOtherCompleted ? "completed" : "active"}
                    draggable={interactive && canDragOtherEvent}
                    onTouchStart={interactive && canDragOtherEvent && otherEvent ? (e) => startTouchEventDrag(e, otherEvent, iso, "other") : undefined}
                    onDragStart={interactive && canDragOtherEvent && otherEvent ? (e) => {
                      e.stopPropagation();
                      if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", `event:${otherEvent.event_id}`);
                        setEventDragImage(e, "other");
                      }
                      beginEventDrag(otherEvent, iso, "other");
                    } : undefined}
                    onDrag={interactive && canDragOtherEvent && otherEvent ? (e) => {
                      syncEventDeleteHotByPoint(e.clientX, e.clientY);
                    } : undefined}
                    onDragEnd={interactive && canDragOtherEvent && otherEvent ? () => handleEventDragEnd() : undefined}
                  >
                    <span className={`inline-flex ${showDayDetail ? "w-2 h-2" : "w-2.5 h-2.5"} items-center justify-center text-ink font-semibold leading-none text-[8px]`}>
                      !
                    </span>
                    <span className="pointer-events-none absolute bottom-full right-0 mb-0.5 whitespace-nowrap rounded bg-ink text-paper px-1 py-0.5 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-30">
                      {(otherLabels.length > 0 ? otherLabels.join(" - ") : "Outras") + (isOtherCompleted ? " - feito" : "")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {hasFlashcards && (
              <div
                className={`absolute bottom-[1px] left-[1px] inline-flex ${showDayDetail ? "w-3 h-3" : "w-4 h-4"} items-end justify-start text-ink opacity-40 group`}
                data-testid="calendar-flashcards-icon"
                data-cell-iso={iso}
                title={`Cards: ${cardsDone}`}
              >
                <button
                  type="button"
                  className="inline-flex items-center justify-center"
                  data-calendar-flashcards-trigger="true"
                  onClick={(event) => {
                    if (!interactive) return;
                    event.stopPropagation();
                    setActiveFlashcardsTooltipIso((current) => (current === iso ? null : iso));
                  }}
                  onPointerDown={(event) => {
                    if (!interactive) return;
                    event.stopPropagation();
                  }}
                  aria-label={`Cards: ${cardsDone}`}
                  title={`Cards: ${cardsDone}`}
                >
                  <IconCards className={`${showDayDetail ? "w-2 h-2" : "w-2.5 h-2.5"}`} />
                </button>
                <span className={`pointer-events-none absolute bottom-full left-0 mb-0.5 whitespace-nowrap rounded bg-ink text-paper px-1 py-0.5 text-[8px] transition-opacity z-30 ${
                  activeFlashcardsTooltipIso === iso
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                }`}>
                  {`Cards: ${cardsDone}`}
                </span>
              </div>
            )}

            {shouldRenderDotGrid && (
              <div className={`flex flex-col gap-[2px] ${showDayDetail ? "mt-[7px]" : "mt-[15px]"} px-0.5`}>
                {visibleDots.map((dot) => {
                  if (dot.kind === "initial") {
                    return (
                      <div
                        key={dot.key}
                        data-testid="calendar-day-dot"
                        data-dot-kind="initial"
                        title={dot.tooltip}
                        className={`w-full rounded-sm overflow-hidden ${showDayDetail ? "h-1.5" : "h-2"}`}
                        style={{ backgroundColor: dot.color, opacity: 0.7 }}
                      />
                    );
                  }
                  if (dot.kind === "full_exam") {
                    return (
                      <div
                        key={dot.key}
                        data-testid="calendar-day-dot"
                        data-dot-kind="full_exam"
                        title={dot.tooltip}
                        className={`w-full rounded-sm overflow-hidden ${showDayDetail ? "h-1.5" : "h-2"}`}
                        style={{ backgroundColor: dot.color }}
                      />
                    );
                  }
                  const isDone = dot.kind === "done";
                  const barH = showDayDetail ? "min-h-[16px]" : "min-h-[18px]";
                  const fontSize = showDayDetail ? "9px" : "10px";
                  const chipFontSize = showDayDetail ? "8px" : "9px";
                  const revNum = dot.task ? (taskRevisionMap?.get(dot.task.task_id) ?? 1) : 1;
                  return (
                    <div
                      key={dot.key}
                      data-testid="calendar-day-dot"
                      data-dot-kind={dot.kind}
                      draggable={interactive && !showDayDetail && dot.kind === "pending" && !!dot.task && !isTouchDevice}
                      title={dot.tooltip}
                      onClick={interactive && dot.task ? (e) => {
                        e.stopPropagation();
                        onBarClick?.(dot.task!, (e.currentTarget as HTMLElement).getBoundingClientRect());
                      } : undefined}
                      onContextMenu={dot.task ? (e) => e.preventDefault() : undefined}
                      onTouchStart={interactive && !showDayDetail && dot.task ? (e) => {
                        startTouchDrag(e, dot.task!, iso, dot.color);
                      } : undefined}
                      onPointerDown={interactive && !showDayDetail && dot.task ? (e) => {
                        startPointerTouchDrag(e, dot.task!, iso, dot.color);
                      } : undefined}
                      onDragStart={interactive && !showDayDetail && dot.task ? (e) => {
                        if (touchDragTouchId.current !== null || taskDragOrigin.current === "touch") {
                          e.preventDefault();
                          return;
                        }
                        e.stopPropagation();
                        beginTaskDrag(dot.task!, iso);
                      } : undefined}
                      onDragEnd={interactive && !showDayDetail && dot.task ? () => {
                        if (taskDragOrigin.current === "touch" || touchDragTouchId.current !== null) return;
                        clearDragState();
                      } : undefined}
                      className={`flex w-full items-center gap-1 rounded-md px-1 py-0.5 ${barH} overflow-hidden shadow-sm ${dot.task ? "select-none touch-none" : ""} ${
                        dot.task && touchDraggingTaskId === dot.task.task_id ? "ring-1 ring-white/60 scale-[1.02]" : ""
                      } ${dot.task && dragTaskId === dot.task.task_id ? "ring-1 ring-white/60" : ""}`}
                      style={{
                        backgroundColor: dot.color,
                        opacity: isDone ? 0.45 : 1,
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
                        WebkitUserSelect: dot.task ? "none" : undefined,
                        userSelect: dot.task ? "none" : undefined,
                        WebkitTouchCallout: dot.task ? "none" : undefined,
                        touchAction: dot.task ? "none" : undefined,
                        WebkitTapHighlightColor: dot.task ? "transparent" : undefined,
                      }}
                    >
                      <span
                        className="shrink-0 rounded-[4px] bg-white/95 px-1 py-[2px] font-bold leading-none shadow-sm"
                        style={{
                          color: dot.color,
                          fontSize: chipFontSize,
                        }}
                      >
                        {`#${revNum}`}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-semibold leading-none text-white"
                        style={{ fontSize }}
                      >
                        {dot.task?.theme ?? dot.tooltip?.split(": ")[1] ?? ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {hasOverflow && (
              <span
                className="absolute bottom-0.5 right-0.5 text-[8px] text-muted leading-none cursor-pointer hover:text-ink"
                title="Mostrar todos"
                data-testid="calendar-day-overflow"
                data-cell-iso={iso}
                onClick={(e) => {
                  if (!interactive) return;
                  e.stopPropagation();
                  if (expandTimer.current) clearTimeout(expandTimer.current);
                  setExpandedCell(iso);
                  const expandedRows = Math.max(2, Math.ceil(allDots.length / 2));
                  setExpandedRow({ row: rowIndex, slots: expandedRows * 2 });
                  expandTimer.current = setTimeout(() => {
                    setExpandedCell(null);
                    setExpandedRow(null);
                  }, 8000);
                }}
              >
                ...
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
