import { useEffect, useRef, useState } from "react";
import { CalendarEventOut, createEvent, deleteEvent } from "@/lib/api";
import {
  encodeEventLabelCategory,
  encodeSkipRoutineLabel,
  isoToDate,
  normalizedEventSignature,
  parseSkipRoutineLabel,
  todayISO,
} from "../../../_lib/cronogramaShared";
import { CalendarEventDeleteConfirm } from "../CalendarSections";
import { EVENT_DELETE_ZONE_DELAY_MS, TOUCH_DRAG_START_PX, TOUCH_EDGE_HOLD_MS, TOUCH_EDGE_ZONE_PX } from "../constants";
import {
  CalendarDragEventMeta,
  getDailyHoursOverflowMessage,
  getWorkEventCollisionMessage,
} from "../eventRules";

export function useEventDragAndMutation({
  token,
  events,
  onRefresh,
  onEventMutated,
  cellISOFromPoint,
  getTouchById,
  monthGridRef,
  prevMonth,
  nextMonth,
}: {
  token: string;
  events: CalendarEventOut[];
  onRefresh: () => void;
  onEventMutated?: () => Promise<void> | void;
  cellISOFromPoint: (x: number, y: number) => string | null;
  getTouchById: (list: TouchList, touchId: number) => Touch | null;
  monthGridRef: React.RefObject<HTMLDivElement | null>;
  prevMonth: () => void;
  nextMonth: () => void;
}) {
  const [dragEventMeta, setDragEventMeta] = useState<CalendarDragEventMeta | null>(null);
  const [touchDraggingEventId, setTouchDraggingEventId] = useState<string | null>(null);
  const [touchEventGhost, setTouchEventGhost] = useState<{ x: number; y: number; iconType: "work" | "other" } | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [eventDeleteZoneVisible, setEventDeleteZoneVisible] = useState(false);
  const [eventDeleteHot, setEventDeleteHot] = useState(false);
  const [eventMoveError, setEventMoveError] = useState("");
  const [eventDeleteConfirm, setEventDeleteConfirm] = useState<CalendarEventDeleteConfirm>(null);

  const eventDeleteZoneRef = useRef<HTMLDivElement | null>(null);
  const eventDeleteZoneVisibleRef = useRef(false);
  const eventTouchDragTouchId = useRef<number | null>(null);
  const eventTouchDragStart = useRef<{ x: number; y: number } | null>(null);
  const eventTouchDragMoved = useRef(false);
  const eventLastDragPoint = useRef<{ x: number; y: number } | null>(null);
  const eventDeleteZoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventDeleteZoneDelayStarted = useRef(false);
  const eventDropActionTriggered = useRef(false);
  const eventMoveInFlight = useRef(false);
  const eventMoveErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchEdgeTurnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMarginHold = useRef<{ side: "left" | "right"; targetISO: string; sinceMs: number } | null>(null);
  const touchLastCellISO = useRef<string | null>(null);
  const prevMonthRef = useRef(prevMonth);
  const nextMonthRef = useRef(nextMonth);
  prevMonthRef.current = prevMonth;
  nextMonthRef.current = nextMonth;

  function nowMs() { return new Date().getTime(); }

  function monthGridRect(): DOMRect | null {
    return monthGridRef.current ? monthGridRef.current.getBoundingClientRect() : null;
  }

  function monthGridMarginSide(clientX: number, clientY: number, edgePx: number): "left" | "right" | null {
    const rect = monthGridRect();
    if (!rect) return null;
    const nearGrid = (
      clientX >= rect.left - edgePx
      && clientX <= rect.right + edgePx
      && clientY >= rect.top - edgePx
      && clientY <= rect.bottom + edgePx
    );
    if (!nearGrid) return null;
    const distLeft = Math.abs(clientX - rect.left);
    const distRight = Math.abs(rect.right - clientX);
    if (distLeft <= edgePx && distLeft <= distRight) return "left";
    if (distRight <= edgePx) return "right";
    return null;
  }

  function closestCellISOFromPoint(clientX: number, clientY: number, maxDistancePx = 24): string | null {
    if (typeof document === "undefined") return null;
    const cells = document.querySelectorAll<HTMLElement>("[data-cell-iso]");
    let bestISO: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    cells.forEach((cell) => {
      const iso = cell.getAttribute("data-cell-iso");
      if (!iso) return;
      const rect = cell.getBoundingClientRect();
      const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
      const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) { bestISO = iso; bestDistance = distance; }
    });
    if (!bestISO || bestDistance > maxDistancePx) return null;
    return bestISO;
  }

  function clearTouchEdgeTurnTimer() {
    if (touchEdgeTurnTimer.current) {
      clearTimeout(touchEdgeTurnTimer.current);
      touchEdgeTurnTimer.current = null;
    }
  }

  function turnMonthFromEdge(side: "left" | "right") {
    if (side === "left") prevMonthRef.current(); else nextMonthRef.current();
    const hold = touchMarginHold.current;
    if (hold && hold.side === side) {
      touchMarginHold.current = { ...hold, sinceMs: nowMs() };
    }
    touchLastCellISO.current = null;
    scheduleTouchEdgeTurn();
  }

  function scheduleTouchEdgeTurn() {
    clearTouchEdgeTurnTimer();
    if (eventTouchDragTouchId.current === null) return;
    const hold = touchMarginHold.current;
    if (!hold) return;
    const elapsed = nowMs() - hold.sinceMs;
    const wait = Math.max(0, TOUCH_EDGE_HOLD_MS - elapsed);
    touchEdgeTurnTimer.current = setTimeout(() => {
      touchEdgeTurnTimer.current = null;
      if (eventTouchDragTouchId.current === null) return;
      const live = touchMarginHold.current;
      if (!live || live.side !== hold.side) return;
      turnMonthFromEdge(live.side);
    }, wait);
  }

  function updateTouchMarginHold(clientX: number, clientY: number, preferredISO?: string | null) {
    const side = monthGridMarginSide(clientX, clientY, TOUCH_EDGE_ZONE_PX);
    if (!side) {
      touchMarginHold.current = null;
      clearTouchEdgeTurnTimer();
      return;
    }
    const targetISO =
      preferredISO
      ?? touchLastCellISO.current
      ?? closestCellISOFromPoint(clientX, clientY, TOUCH_EDGE_ZONE_PX + 8);
    if (!targetISO) {
      touchMarginHold.current = null;
      clearTouchEdgeTurnTimer();
      return;
    }
    const current = touchMarginHold.current;
    if (current && current.side === side) {
      if (current.targetISO !== targetISO) {
        touchMarginHold.current = { ...current, targetISO };
      }
      scheduleTouchEdgeTurn();
      return;
    }
    touchMarginHold.current = { side, targetISO, sinceMs: nowMs() };
    scheduleTouchEdgeTurn();
  }

  function resolveEventDropISO(clientX: number, clientY: number): string | null {
    const directISO = cellISOFromPoint(clientX, clientY);
    if (directISO) return directISO;
    const side = monthGridMarginSide(clientX, clientY, TOUCH_EDGE_ZONE_PX);
    const marginHold = touchMarginHold.current;
    if (
      side
      && marginHold
      && marginHold.side === side
      && (nowMs() - marginHold.sinceMs) >= TOUCH_EDGE_HOLD_MS
    ) {
      return marginHold.targetISO;
    }
    return null;
  }

  function clearEventDeleteZoneDelay() {
    if (eventDeleteZoneTimer.current) {
      clearTimeout(eventDeleteZoneTimer.current);
      eventDeleteZoneTimer.current = null;
    }
    eventDeleteZoneDelayStarted.current = false;
    setEventDeleteZoneVisible(false);
    setEventDeleteHot(false);
  }

  function clearEventDragState() {
    clearTouchEdgeTurnTimer();
    touchMarginHold.current = null;
    touchLastCellISO.current = null;
    setDragEventMeta(null);
    setTouchDraggingEventId(null);
    setTouchEventGhost(null);
    clearEventDeleteZoneDelay();
    eventDropActionTriggered.current = false;
    eventLastDragPoint.current = null;
    eventTouchDragTouchId.current = null;
    eventTouchDragStart.current = null;
    eventTouchDragMoved.current = false;
    if (typeof document !== "undefined") {
      document.body.classList.remove("touch-drag-lock");
    }
  }

  function hideEventMoveError() {
    setEventMoveError("");
    if (eventMoveErrorTimer.current) {
      clearTimeout(eventMoveErrorTimer.current);
      eventMoveErrorTimer.current = null;
    }
  }

  function showEventMoveError(message: string) {
    hideEventMoveError();
    setEventMoveError(message);
    eventMoveErrorTimer.current = setTimeout(() => {
      setEventMoveError("");
      eventMoveErrorTimer.current = null;
    }, 8000);
  }

  useEffect(() => {
    return () => {
      if (eventMoveErrorTimer.current) {
        clearTimeout(eventMoveErrorTimer.current);
        eventMoveErrorTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    eventDeleteZoneVisibleRef.current = eventDeleteZoneVisible;
  }, [eventDeleteZoneVisible]);

  useEffect(() => {
    function updateOrientation() {
      if (typeof window === "undefined") return;
      setIsLandscape(window.innerWidth > window.innerHeight);
    }
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  function armEventDeleteZoneWithDelay() {
    if (eventDeleteZoneDelayStarted.current) return;
    eventDeleteZoneDelayStarted.current = true;
    if (eventDeleteZoneTimer.current) {
      clearTimeout(eventDeleteZoneTimer.current);
    }
    eventDeleteZoneTimer.current = setTimeout(() => {
      setEventDeleteZoneVisible(true);
      eventDeleteZoneTimer.current = null;
    }, EVENT_DELETE_ZONE_DELAY_MS);
  }

  function beginEventDrag(
    ev: CalendarEventOut,
    sourceISO: string,
    iconType: "work" | "other",
    touchMeta?: { touchId: number; clientX: number; clientY: number },
  ) {
    if (sourceISO < todayISO()) {
      clearEventDragState();
      return;
    }
    hideEventMoveError();
    clearEventDeleteZoneDelay();
    eventDropActionTriggered.current = false;
    eventLastDragPoint.current = touchMeta ? { x: touchMeta.clientX, y: touchMeta.clientY } : null;
    const eventType = ev.event_type === "event" ? "event" : "routine";
    setDragEventMeta({
      eventId: ev.event_id,
      sourceISO,
      eventType,
      weekday: ev.weekday ?? null,
      eventDate: ev.event_date ?? null,
      durationHours: ev.duration_hours,
      label: ev.label,
      iconType,
    });
    armEventDeleteZoneWithDelay();
    if (touchMeta) {
      eventTouchDragTouchId.current = touchMeta.touchId;
      eventTouchDragStart.current = { x: touchMeta.clientX, y: touchMeta.clientY };
      eventTouchDragMoved.current = false;
      setTouchEventGhost({ x: touchMeta.clientX, y: touchMeta.clientY, iconType });
      if (typeof document !== "undefined") {
        document.body.classList.add("touch-drag-lock");
      }
    }
  }

  async function moveEventToDate(meta: NonNullable<typeof dragEventMeta>, toISO: string) {
    const nextLabel = encodeEventLabelCategory(meta.label, meta.iconType);
    if (meta.eventType === "event") {
      if (meta.eventDate === toISO) return;

      const toWeekday = (isoToDate(toISO).getDay() + 6) % 7;
      const metaSig = normalizedEventSignature(meta.label, "event");
      const matchingRoutine = events.find((event) => {
        if (event.event_type !== "routine") return false;
        if (event.weekday !== toWeekday) return false;
        const routineSig = normalizedEventSignature(event.label, "routine");
        return routineSig.isWork === metaSig.isWork && routineSig.label === metaSig.label;
      });
      if (matchingRoutine) {
        const skipOverrides = events.filter((event) =>
          event.event_type === "event"
          && event.event_date === toISO
          && parseSkipRoutineLabel(event.label) === matchingRoutine.event_id
        );
        if (skipOverrides.length > 0) {
          await Promise.all(skipOverrides.map((override) => deleteEvent(token, override.event_id, { scope: "all" })));
          await deleteEvent(token, meta.eventId, { scope: "all" });
          return;
        }
      }

      const collisionMessage = getWorkEventCollisionMessage(meta, toISO, events);
      if (collisionMessage) throw new Error(collisionMessage);
      const overflowMessage = getDailyHoursOverflowMessage(meta, toISO, events);
      if (overflowMessage) throw new Error(overflowMessage);

      await createEvent(token, {
        label: nextLabel,
        event_type: "event",
        event_date: toISO,
        duration_hours: meta.durationHours,
      });
      await deleteEvent(token, meta.eventId, { scope: "all" });
      return;
    }

    if (meta.sourceISO === toISO) return;
    const collisionMessage = getWorkEventCollisionMessage(meta, toISO, events);
    if (collisionMessage) throw new Error(collisionMessage);
    const overflowMessage = getDailyHoursOverflowMessage(meta, toISO, events);
    if (overflowMessage) throw new Error(overflowMessage);

    const existingSkip = events.find((event) =>
      event.event_type === "event"
      && event.event_date === meta.sourceISO
      && parseSkipRoutineLabel(event.label) === meta.eventId
    );
    if (!existingSkip) {
      await createEvent(token, {
        label: encodeSkipRoutineLabel(meta.eventId),
        event_type: "event",
        event_date: meta.sourceISO,
        duration_hours: 0,
      });
    }
    await createEvent(token, {
      label: nextLabel,
      event_type: "event",
      event_date: toISO,
      duration_hours: meta.durationHours,
    });
  }

  async function handleEventDrop(iso: string) {
    const meta = dragEventMeta;
    if (!meta) return;
    if (iso === meta.sourceISO) {
      clearEventDragState();
      return;
    }
    if (eventMoveInFlight.current) return;
    eventDropActionTriggered.current = true;
    eventMoveInFlight.current = true;
    try {
      hideEventMoveError();
      await moveEventToDate(meta, iso);
      if (onEventMutated) {
        await Promise.resolve(onEventMutated());
      } else {
        await Promise.resolve(onRefresh());
      }
    } catch (error: any) {
      showEventMoveError(error?.message ?? "Nao foi possivel mover o compromisso.");
    } finally {
      eventMoveInFlight.current = false;
      clearEventDragState();
    }
  }

  async function confirmDeleteDraggedEvent() {
    const pendingDelete = eventDeleteConfirm;
    if (!pendingDelete) return;
    try {
      if (pendingDelete.eventType === "routine") {
        await createEvent(token, {
          label: encodeSkipRoutineLabel(pendingDelete.eventId),
          event_type: "event",
          event_date: pendingDelete.sourceISO,
          duration_hours: 0,
        });
      } else {
        await deleteEvent(token, pendingDelete.eventId, {
          scope: "future",
          effective_from: todayISO(),
        });
      }
      if (onEventMutated) {
        await Promise.resolve(onEventMutated());
      } else {
        await Promise.resolve(onRefresh());
      }
    } catch {
      // ignore
    } finally {
      setEventDeleteConfirm(null);
      clearEventDragState();
    }
  }

  function startTouchEventDrag(
    e: React.TouchEvent<HTMLElement>,
    ev: CalendarEventOut,
    sourceISO: string,
    iconType: "work" | "other",
  ) {
    if (sourceISO < todayISO()) return;
    const touch = e.touches[0];
    if (!touch) return;
    e.preventDefault();
    e.stopPropagation();
    setTouchDraggingEventId(ev.event_id);
    beginEventDrag(ev, sourceISO, iconType, {
      touchId: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
  }

  function isDeleteDropTargetPoint(clientX: number, clientY: number): boolean {
    if (!eventDeleteZoneVisibleRef.current) return false;
    const zone = eventDeleteZoneRef.current;
    if (!zone) return false;
    const rect = zone.getBoundingClientRect();
    return (
      clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
    );
  }

  function isDeleteDropTargetFromEvent(target: EventTarget | null, clientX: number, clientY: number): boolean {
    if (!eventDeleteZoneVisibleRef.current) return false;
    if (target instanceof Element && target.closest("[data-event-delete-zone='1']")) return true;
    return isDeleteDropTargetPoint(clientX, clientY);
  }

  function syncEventDeleteHotByPoint(clientX: number, clientY: number) {
    eventLastDragPoint.current = { x: clientX, y: clientY };
    if (!dragEventMeta || !eventDeleteZoneVisibleRef.current) {
      setEventDeleteHot(false);
      return;
    }
    setEventDeleteHot(isDeleteDropTargetPoint(clientX, clientY));
  }

  function syncEventDeleteHotByDragEvent(e: DragEvent | React.DragEvent) {
    eventLastDragPoint.current = { x: e.clientX, y: e.clientY };
    if (!dragEventMeta || !eventDeleteZoneVisibleRef.current) {
      setEventDeleteHot(false);
      return;
    }
    const hot = isDeleteDropTargetFromEvent(e.target, e.clientX, e.clientY);
    setEventDeleteHot(hot);
  }

  function handleEventDeleteDrop() {
    if (!eventDeleteZoneVisibleRef.current) return;
    if (!dragEventMeta) return;
    eventDropActionTriggered.current = true;
    setEventDeleteConfirm({
      eventId: dragEventMeta.eventId,
      eventType: dragEventMeta.eventType,
      sourceISO: dragEventMeta.sourceISO,
    });
    clearEventDragState();
  }

  function handleEventDragEnd() {
    if (typeof window === "undefined") {
      if (!eventDropActionTriggered.current) clearEventDragState();
      return;
    }
    window.setTimeout(() => {
      if (eventDropActionTriggered.current) {
        eventDropActionTriggered.current = false;
        setEventDeleteHot(false);
        return;
      }
      const lastPoint = eventLastDragPoint.current;
      if (lastPoint && isDeleteDropTargetPoint(lastPoint.x, lastPoint.y)) {
        handleEventDeleteDrop();
        return;
      }
      clearEventDragState();
    }, 0);
  }

  const clearEventDragStateRef = useRef(clearEventDragState);
  const handleEventDropRef = useRef(handleEventDrop);
  const syncEventDeleteHotByPointRef = useRef(syncEventDeleteHotByPoint);
  const syncEventDeleteHotByDragEventRef = useRef(syncEventDeleteHotByDragEvent);
  const isDeleteDropTargetFromEventRef = useRef(isDeleteDropTargetFromEvent);
  const handleEventDeleteDropRef = useRef(handleEventDeleteDrop);
  const handleEventDragEndRef = useRef(handleEventDragEnd);
  const isDeleteDropTargetPointRef = useRef(isDeleteDropTargetPoint);
  const cellISOFromPointRef = useRef(cellISOFromPoint);
  const updateTouchMarginHoldRef = useRef(updateTouchMarginHold);
  const resolveEventDropISORef = useRef(resolveEventDropISO);

  clearEventDragStateRef.current = clearEventDragState;
  handleEventDropRef.current = handleEventDrop;
  syncEventDeleteHotByPointRef.current = syncEventDeleteHotByPoint;
  syncEventDeleteHotByDragEventRef.current = syncEventDeleteHotByDragEvent;
  isDeleteDropTargetFromEventRef.current = isDeleteDropTargetFromEvent;
  handleEventDeleteDropRef.current = handleEventDeleteDrop;
  handleEventDragEndRef.current = handleEventDragEnd;
  isDeleteDropTargetPointRef.current = isDeleteDropTargetPoint;
  cellISOFromPointRef.current = cellISOFromPoint;
  updateTouchMarginHoldRef.current = updateTouchMarginHold;
  resolveEventDropISORef.current = resolveEventDropISO;

  useEffect(() => {
    if (!dragEventMeta) return;

    function onTouchMove(e: TouchEvent) {
      if (eventTouchDragTouchId.current === null) return;
      const touch = getTouchById(e.touches, eventTouchDragTouchId.current);
      if (!touch) return;
      e.preventDefault();
      const start = eventTouchDragStart.current;
      if (start) {
        const dx = Math.abs(touch.clientX - start.x);
        const dy = Math.abs(touch.clientY - start.y);
        if (dx + dy >= TOUCH_DRAG_START_PX) eventTouchDragMoved.current = true;
      }
      if (eventTouchDragMoved.current) {
        armEventDeleteZoneWithDelay();
        setTouchEventGhost((prev) => (prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null));
        syncEventDeleteHotByPointRef.current(touch.clientX, touch.clientY);
        const hoveredISO = cellISOFromPointRef.current(touch.clientX, touch.clientY);
        if (hoveredISO) touchLastCellISO.current = hoveredISO;
        updateTouchMarginHoldRef.current(touch.clientX, touch.clientY, hoveredISO);
      }
    }

    function onTouchFinish(e: TouchEvent) {
      if (eventTouchDragTouchId.current === null) return;
      const touch = getTouchById(e.changedTouches, eventTouchDragTouchId.current);
      if (!touch) return;

      const moved = eventTouchDragMoved.current;
      eventTouchDragTouchId.current = null;
      eventTouchDragStart.current = null;
      eventTouchDragMoved.current = false;

      if (!moved) {
        clearEventDragStateRef.current();
        return;
      }

      const activeMeta = dragEventMeta;
      if (!activeMeta) {
        clearEventDragStateRef.current();
        return;
      }

      if (isDeleteDropTargetPointRef.current(touch.clientX, touch.clientY)) {
        setEventDeleteConfirm({
          eventId: activeMeta.eventId,
          eventType: activeMeta.eventType,
          sourceISO: activeMeta.sourceISO,
        });
        clearEventDragStateRef.current();
        return;
      }

      const toISO = resolveEventDropISORef.current(touch.clientX, touch.clientY);
      if (toISO) void handleEventDropRef.current(toISO);
      else clearEventDragStateRef.current();
    }

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchFinish);
    window.addEventListener("touchcancel", onTouchFinish);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchFinish);
      window.removeEventListener("touchcancel", onTouchFinish);
    };
  }, [dragEventMeta, getTouchById]);

  useEffect(() => {
    return () => {
      if (eventDeleteZoneTimer.current) {
        clearTimeout(eventDeleteZoneTimer.current);
        eventDeleteZoneTimer.current = null;
      }
      if (touchEdgeTurnTimer.current) {
        clearTimeout(touchEdgeTurnTimer.current);
        touchEdgeTurnTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!dragEventMeta) return;

    function onWindowDragOver(e: DragEvent) {
      if (!eventDeleteZoneVisible) return;
      syncEventDeleteHotByDragEventRef.current(e);
      e.preventDefault();
    }

    function onWindowDrop(e: DragEvent) {
      if (!eventDeleteZoneVisible) return;
      if (!isDeleteDropTargetFromEventRef.current(e.target, e.clientX, e.clientY)) return;
      e.preventDefault();
      e.stopPropagation();
      handleEventDeleteDropRef.current();
    }

    function onWindowDragEnd() {
      handleEventDragEndRef.current();
    }

    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("drop", onWindowDrop);
    window.addEventListener("dragend", onWindowDragEnd);
    return () => {
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("drop", onWindowDrop);
      window.removeEventListener("dragend", onWindowDragEnd);
    };
  }, [dragEventMeta, eventDeleteZoneVisible]);

  return {
    dragEventMeta,
    touchDraggingEventId,
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
  };
}
