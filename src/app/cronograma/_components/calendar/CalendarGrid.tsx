import { MutableRefObject, Ref, useEffect, useRef, useState } from "react";
import { CalendarEventOut, DirectedStudyListItem, ReviewTask } from "@/lib/api";
import { IconCards, IconStethoscope } from "../CronogramaIcons";
import {
  eventFlags,
} from "../../_lib/cronogramaShared";
import { buildDayDotEntries, CalendarPopupTarget } from "./derived";
import { CalendarDragEventMeta, isPastCalendarCell } from "./eventRules";

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
  dragEventMeta,
  dragTaskId,
  dragFromISO,
  taskDragOrigin,
  touchDragTouchId,
  touchDraggingTaskId,
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
  dragEventMeta: CalendarDragEventMeta | null;
  dragTaskId: string | null;
  dragFromISO: string | null;
  taskDragOrigin: MutableRefObject<"touch" | "mouse" | null>;
  touchDragTouchId: MutableRefObject<number | null>;
  touchDraggingTaskId: string | null;
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
  onBarClick?: (target: CalendarPopupTarget, rect: DOMRect) => void;
  onDoubleClickEmpty?: () => void;
  taskRevisionMap?: Map<string, number>;
}) {
  const [activeFlashcardsTooltipIso, setActiveFlashcardsTooltipIso] = useState<string | null>(null);
  const [hoverDropISO, setHoverDropISO] = useState<string | null>(null);
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
    // Var de tema e nao literal: este no vive no documento, entao ele resolve
    // `var()` normalmente — e no escuro deixa de ser um cartao branco.
    dragImage.style.border = "1px solid var(--color-ink)";
    dragImage.style.borderRadius = "0";
    dragImage.style.background = "var(--color-surface)";
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
      fallback.style.color = "var(--color-ink)";
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
        const isTaskDropActive = Boolean(dragTaskId && dragFromISO);
        const isTaskDropTarget = isTaskDropActive && iso !== dragFromISO;
        const isHoverDropTarget = isTaskDropTarget && hoverDropISO === iso;
        const { hasWork, hasOther, workLabels, otherLabels, workEvent, otherEvent } = eventFlags(iso, events);
        const cardsDone = Math.max(0, Number(turboCardsByDate[iso] ?? 0));
        const hasFlashcards = cardsDone > 0;
        const isWorkCompleted = Boolean(workEvent) && isPastDay;
        const isOtherCompleted = Boolean(otherEvent) && isPastDay;
        const canDragWorkEvent = !showDayDetail && Boolean(workEvent) && !isWorkCompleted;
        const canDragOtherEvent = !showDayDetail && Boolean(otherEvent) && !isOtherCompleted;
        const openEventPopup = (
          e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
          ev: CalendarEventOut,
          iconType: "work" | "other",
          completed: boolean,
        ) => {
          e.stopPropagation();
          onBarClick?.(
            { kind: "event", event: ev, sourceISO: iso, iconType, completed },
            (e.currentTarget as HTMLElement).getBoundingClientRect(),
          );
        };

        const pendingTasks = dayTasks.filter((task) => task.status === "pending");
        const doneTasks = dayTasks.filter((task) => task.status === "done");
        const allDots = buildDayDotEntries({
          dayStudies,
          pendingTasks,
          doneTasks,
        });
        const shouldRenderDotGrid = allDots.length > 0;
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
            className={`relative ${dayCellMinHeight} p-0.5 bg-paper border-r border-b border-edge cursor-pointer overflow-visible ${
              isTaskDropTarget ? "ring-1 ring-inset ring-primary/35" : ""
            } ${isHoverDropTarget ? "bg-[var(--wash-selecao)] ring-2 ring-inset ring-primary" : ""}`}
            style={
              isSelected && isSearchMatch
                ? { backgroundColor: "var(--wash-selecao)", boxShadow: "inset 0 0 0 2px var(--color-primary)" }
                : isToday && isSelected
                  ? { backgroundColor: "var(--wash-selecao)", boxShadow: "inset 0 0 0 2px var(--color-ink)" }
                  : isSelected
                    ? { backgroundColor: "var(--wash-selecao)", boxShadow: "inset 0 0 0 1px var(--color-primary)" }
                    : isSearchMatch
                      ? { boxShadow: "inset 0 0 0 2px var(--color-primary)" }
                      : isToday
                        ? { boxShadow: "inset 0 0 0 2px var(--color-ink)" }
                        : {}
            }
            role="button"
            tabIndex={interactive ? 0 : -1}
            aria-label={iso}
            onKeyDown={(e) => {
              if (!interactive) return;
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onDaySelect(isSelected ? null : iso);
              if (isSelected) onCloseDayDetailForSameDay();
            }}
            onClick={() => {
              if (!interactive) return;
              if (dragEventMeta) { handleEventDrop(iso); return; }
              if (dragTaskId && dragFromISO) { handleDrop(iso); return; }
              onDaySelect(isSelected ? null : iso);
              if (isSelected) onCloseDayDetailForSameDay();
            }}
            onDoubleClick={() => {
              if (!interactive) return;
              if (!isSelected) onDaySelect(iso);
              onDoubleClickEmpty?.();
            }}
            onDragEnter={() => {
              if (isTaskDropTarget) setHoverDropISO(iso);
            }}
            onDragLeave={() => {
              setHoverDropISO((current) => (current === iso ? null : current));
            }}
            onDragOver={(e) => {
              if (isTaskDropTarget) setHoverDropISO(iso);
              e.preventDefault();
            }}
            onDrop={() => {
              if (!interactive) return;
              setHoverDropISO(null);
              if (dragEventMeta) handleEventDrop(iso);
              else handleDrop(iso);
            }}
          >
            <div className="absolute top-0.5 left-0 right-0 flex justify-center">
              {isToday ? (
                <span className={`${showDayDetail ? "text-micro w-3.5 h-3.5" : "text-micro w-4 h-4"} leading-none bg-ink text-paper flex items-center justify-center font-medium`}>
                  {day}
                </span>
              ) : (
                <span className={`${showDayDetail ? "text-micro" : "text-micro"} leading-none text-muted`}>
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
                    data-calendar-swipe-ignore={canDragWorkEvent ? "true" : undefined}
                    role="button"
                    tabIndex={interactive ? 0 : -1}
                    draggable={interactive && canDragWorkEvent}
                    onClick={interactive && workEvent ? (e) => openEventPopup(e, workEvent, "work", isWorkCompleted) : undefined}
                    onKeyDown={interactive && workEvent ? (e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      openEventPopup(e, workEvent, "work", isWorkCompleted);
                    } : undefined}
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
                    <span className="pointer-events-none absolute bottom-full right-0 mb-0.5 whitespace-nowrap bg-ink text-paper px-1 py-0.5 text-micro opacity-0 group-hover:opacity-100 transition-opacity z-30">
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
                    data-calendar-swipe-ignore={canDragOtherEvent ? "true" : undefined}
                    role="button"
                    tabIndex={interactive ? 0 : -1}
                    draggable={interactive && canDragOtherEvent}
                    onClick={interactive && otherEvent ? (e) => openEventPopup(e, otherEvent, "other", isOtherCompleted) : undefined}
                    onKeyDown={interactive && otherEvent ? (e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      openEventPopup(e, otherEvent, "other", isOtherCompleted);
                    } : undefined}
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
                    <span className={`inline-flex ${showDayDetail ? "w-2 h-2" : "w-2.5 h-2.5"} items-center justify-center text-ink leading-none text-micro`}>
                      !
                    </span>
                    <span className="pointer-events-none absolute bottom-full right-0 mb-0.5 whitespace-nowrap bg-ink text-paper px-1 py-0.5 text-micro opacity-0 group-hover:opacity-100 transition-opacity z-30">
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
                <span className={`pointer-events-none absolute bottom-full left-0 mb-0.5 whitespace-nowrap bg-ink text-paper px-1 py-0.5 text-micro transition-opacity z-30 ${
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
                {allDots.map((dot) => {
                  if (dot.kind === "initial") {
                    const barH = showDayDetail ? "min-h-[16px]" : "min-h-[18px]";
                    const fontSize = showDayDetail ? "9px" : "10px";
                    const chipFontSize = showDayDetail ? "8px" : "9px";
                    return (
                      <div
                        key={dot.key}
                        data-testid="calendar-day-dot"
                        data-dot-kind="initial"
                        title={dot.tooltip}
                        onClick={interactive && dot.popupTarget ? (e) => {
                          e.stopPropagation();
                          onBarClick?.(dot.popupTarget!, (e.currentTarget as HTMLElement).getBoundingClientRect());
                        } : undefined}
                        className={`flex w-full items-center gap-1 rounded-control border border-edge bg-surface px-1 py-0.5 ${barH} overflow-hidden`}
                        style={{ opacity: 0.7 }}
                      >
                        {/* Faixa de 6px + sigla na cor da area. O fundo segue
                            neutro: area como fundo com texto por cima nao passa
                            no escuro, onde os tons EGA sao quase-brancos. */}
                        <span
                          aria-hidden="true"
                          className="h-full w-[6px] shrink-0 self-stretch"
                          style={{ backgroundColor: dot.color }}
                        />
                        {dot.areaCode ? (
                          // Sigla em TINTA: a faixa de 6px a esquerda ja carrega
                          // a cor. Escrever a sigla na cor da area exige 4.5:1,
                          // que nenhuma paleta segura para daltonismo entrega.
                          <span
                            className="shrink-0 font-bold uppercase leading-none text-ink"
                            style={{ fontSize: chipFontSize }}
                          >
                            {dot.areaCode}
                          </span>
                        ) : null}
                        <span
                          className="shrink-0 font-bold leading-none tabular-nums text-ink"
                          style={{ fontSize: chipFontSize }}
                        >
                          #EI
                        </span>
                        <span
                          className="min-w-0 flex-1 truncate font-semibold leading-none text-ink"
                          style={{ fontSize }}
                        >
                          {dot.theme ?? ""}
                        </span>
                      </div>
                    );
                  }
                  if (dot.kind === "full_exam") {
                    return (
                      <div
                        key={dot.key}
                        data-testid="calendar-day-dot"
                        data-dot-kind="full_exam"
                        title={dot.tooltip}
                        onClick={interactive && dot.popupTarget ? (e) => {
                          e.stopPropagation();
                          onBarClick?.(dot.popupTarget!, (e.currentTarget as HTMLElement).getBoundingClientRect());
                        } : undefined}
                        className={`w-full overflow-hidden ${showDayDetail ? "h-1.5" : "h-2"}`}
                        style={{ backgroundColor: dot.color }}
                      />
                    );
                  }
                  const isDone = dot.kind === "done";
                  const isPending = dot.kind === "pending";
                  const barH = showDayDetail ? "min-h-[16px]" : "min-h-[18px]";
                  const fontSize = showDayDetail ? "9px" : "10px";
                  const chipFontSize = showDayDetail ? "8px" : "9px";
                  const revNum = dot.task ? (taskRevisionMap?.get(dot.task.task_id) ?? 1) : 1;
                  const canDragTask = interactive && !showDayDetail && isPending && Boolean(dot.task);
                  // Na grade do mes um dia com tarefa ATRASADA era pixel por
                  // pixel igual a um dia em dia — o unico lugar do cronograma
                  // onde o atraso nao aparecia. A visao de semana ja o marcava,
                  // e e por isso que a divergencia passou tanto tempo.
                  const isOverdue = isPending && dot.task?.is_overdue === true;
                  return (
                    <div
                      key={dot.key}
                      data-testid="calendar-day-dot"
                      data-dot-kind={dot.kind}
                      data-calendar-task-item={dot.task ? "true" : undefined}
                      // Um gesto que comeca sobre uma barra arrastavel nunca pode virar swipe de mes:
                      // sem isto o touchstart borbulha ate a grade e o mes inteiro desliza junto.
                      data-calendar-swipe-ignore={canDragTask ? "true" : undefined}
                      draggable={canDragTask}
                      title={dot.tooltip}
                      onClick={interactive && dot.popupTarget ? (e) => {
                        e.stopPropagation();
                        onBarClick?.(dot.popupTarget!, (e.currentTarget as HTMLElement).getBoundingClientRect());
                      } : undefined}
                      onContextMenu={dot.task ? (e) => e.preventDefault() : undefined}
                      onTouchStart={canDragTask ? (e) => {
                        startTouchDrag(e, dot.task!, iso, dot.color);
                      } : undefined}
                      onPointerDown={canDragTask ? (e) => {
                        startPointerTouchDrag(e, dot.task!, iso, dot.color);
                      } : undefined}
                      onDragStart={canDragTask ? (e) => {
                        if (touchDragTouchId.current !== null || taskDragOrigin.current === "touch") {
                          e.preventDefault();
                          return;
                        }
                        e.stopPropagation();
                        beginTaskDrag(dot.task!, iso);
                      } : undefined}
                      onDragEnd={canDragTask ? () => {
                        if (taskDragOrigin.current === "touch" || touchDragTouchId.current !== null) return;
                        clearDragState();
                      } : undefined}
                      className={`flex w-full items-center gap-1 border bg-surface px-1 py-0.5 ${barH} overflow-hidden ${isPending && dot.task ? "select-none" : ""} ${
                        dot.task && (touchDraggingTaskId === dot.task.task_id || dragTaskId === dot.task.task_id)
                          ? "border-ink"
                          : isOverdue
                            ? "border-warning"
                            : "border-edge"
                      }`}
                      style={{
                        opacity: isDone ? 0.45 : 1,
                        WebkitUserSelect: isPending && dot.task ? "none" : undefined,
                        userSelect: isPending && dot.task ? "none" : undefined,
                        WebkitTouchCallout: isPending && dot.task ? "none" : undefined,
                        touchAction: isPending && dot.task ? "pan-y" : undefined,
                        WebkitTapHighlightColor: dot.task ? "transparent" : undefined,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-full w-[6px] shrink-0 self-stretch"
                        style={{ backgroundColor: dot.color }}
                      />
                      {dot.areaCode ? (
                        <span
                          className="shrink-0 font-bold uppercase leading-none text-ink"
                          style={{ fontSize: chipFontSize }}
                        >
                          {dot.areaCode}
                        </span>
                      ) : null}
                      <span
                        className="shrink-0 font-bold leading-none tabular-nums text-ink"
                        style={{ fontSize: chipFontSize }}
                      >
                        {isOverdue ? "!" : ""}{`#${revNum}`}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-semibold leading-none text-ink"
                        style={{ fontSize }}
                      >
                        {dot.theme ?? dot.task?.theme ?? dot.tooltip?.split(": ")[1] ?? ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
