import { useEffect, useRef, useState } from "react";
import { ReviewTask, updateReviewTask } from "@/lib/api";
import { AREA_COLORS, diffDays } from "../../../_lib/cronogramaShared";
import {
  TOUCH_DRAG_LONG_PRESS_CANCEL_PX,
  TOUCH_DRAG_LONG_PRESS_MS,
  TOUCH_DRAG_START_PX,
  TOUCH_EDGE_HOLD_MS,
  TOUCH_EDGE_ZONE_PX,
  TOUCH_GRID_TOLERANCE_PX,
  TOUCH_NEAREST_CELL_TOLERANCE_PX,
} from "../constants";

const RESCHEDULE_NO_DISTURB_KEY = "cronograma_reschedule_no_disturb";
const RESCHEDULE_WARN_COUNT_KEY = "cronograma_reschedule_warn_count";

export type CalendarWarnTask = { task: ReviewTask; from: string; to: string; days: number } | null;

export function useTaskDragReschedule({
  token,
  onRefresh,
  prevMonth,
  nextMonth,
  onRescheduleSuccess,
  onRescheduleError,
}: {
  token: string;
  onRefresh: () => void;
  prevMonth: () => void;
  nextMonth: () => void;
  onRescheduleSuccess?: (task: ReviewTask, fromISO: string, toISO: string) => void;
  onRescheduleError?: (task: ReviewTask, fromISO: string, toISO: string) => void;
}) {
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragFromISO, setDragFromISO] = useState<string | null>(null);
  const [dragIdealISO, setDragIdealISO] = useState<string | null>(null);
  const [taskInitialDates, setTaskInitialDates] = useState<Record<string, string>>({});
  const [touchDraggingTaskId, setTouchDraggingTaskId] = useState<string | null>(null);
  const [touchDragGhost, setTouchDragGhost] = useState<{ x: number; y: number; color: string; label: string } | null>(null);
  const [isTouchDevice] = useState(() => (
    typeof window === "undefined" ? true : (navigator.maxTouchPoints ?? 0) > 0
  ));
  const [warnTask, setWarnTask] = useState<CalendarWarnTask>(null);
  const [noDisturb, setNoDisturb] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(RESCHEDULE_NO_DISTURB_KEY) === "1";
    } catch {
      return false;
    }
  });

  const monthGridRef = useRef<HTMLDivElement | null>(null);
  const taskDragOrigin = useRef<"touch" | "mouse" | null>(null);
  const dragTaskRef = useRef<ReviewTask | null>(null);
  const touchDragTouchId = useRef<number | null>(null);
  const touchDragStart = useRef<{ x: number; y: number } | null>(null);
  const touchDragMoved = useRef(false);
  const touchDragLastPoint = useRef<{ x: number; y: number } | null>(null);
  const touchFinalizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchEdgeTurnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchLastCellISO = useRef<string | null>(null);
  const touchMarginHold = useRef<{ side: "left" | "right" | "top" | "bottom"; targetISO: string; sinceMs: number } | null>(null);
  const touchDragHandlersRef = useRef<(() => void) | null>(null);
  const touchLongPressCleanupRef = useRef<(() => void) | null>(null);

  function nowMs(): number {
    return new Date().getTime();
  }

  useEffect(() => {
    return () => {
      if (touchFinalizeTimer.current) {
        clearTimeout(touchFinalizeTimer.current);
        touchFinalizeTimer.current = null;
      }
      if (touchEdgeTurnTimer.current) {
        clearTimeout(touchEdgeTurnTimer.current);
        touchEdgeTurnTimer.current = null;
      }
      if (touchDragHandlersRef.current) {
        touchDragHandlersRef.current();
        touchDragHandlersRef.current = null;
      }
      if (touchLongPressCleanupRef.current) {
        touchLongPressCleanupRef.current();
        touchLongPressCleanupRef.current = null;
      }
    };
  }, []);

  async function doReschedule(task: ReviewTask, fromISO: string, toDate: string) {
    try {
      await updateReviewTask(token, task.task_id, { due_date: toDate });
      onRescheduleSuccess?.(task, fromISO, toDate);
      return true;
    } catch {
      onRescheduleError?.(task, fromISO, toDate);
      return false;
    }
  }

  function clearTouchEdgeTurnTimer() {
    if (touchEdgeTurnTimer.current) {
      clearTimeout(touchEdgeTurnTimer.current);
      touchEdgeTurnTimer.current = null;
    }
  }

  function turnMonthFromEdge(side: "left" | "right") {
    if (side === "left") {
      prevMonth();
    } else {
      nextMonth();
    }
    const hold = touchMarginHold.current;
    if (hold && hold.side === side) {
      touchMarginHold.current = { ...hold, sinceMs: nowMs() };
    }
    touchLastCellISO.current = null;
    scheduleTouchEdgeTurn();
  }

  function scheduleTouchEdgeTurn() {
    clearTouchEdgeTurnTimer();
    if (touchDragTouchId.current === null) return;
    const hold = touchMarginHold.current;
    if (!hold || (hold.side !== "left" && hold.side !== "right")) return;

    const elapsed = nowMs() - hold.sinceMs;
    const wait = Math.max(0, TOUCH_EDGE_HOLD_MS - elapsed);
    touchEdgeTurnTimer.current = setTimeout(() => {
      touchEdgeTurnTimer.current = null;
      if (touchDragTouchId.current === null) return;
      const live = touchMarginHold.current;
      if (!live || live.side !== hold.side) return;
      turnMonthFromEdge(live.side as "left" | "right");
    }, wait);
  }

  function clearDragState() {
    if (touchFinalizeTimer.current) {
      clearTimeout(touchFinalizeTimer.current);
      touchFinalizeTimer.current = null;
    }
    clearTouchEdgeTurnTimer();
    if (touchDragHandlersRef.current) {
      touchDragHandlersRef.current();
      touchDragHandlersRef.current = null;
    }
    if (touchLongPressCleanupRef.current) {
      touchLongPressCleanupRef.current();
      touchLongPressCleanupRef.current = null;
    }
    taskDragOrigin.current = null;
    dragTaskRef.current = null;
    setDragTaskId(null);
    setDragFromISO(null);
    setDragIdealISO(null);
    setTouchDraggingTaskId(null);
    setTouchDragGhost(null);
    touchDragTouchId.current = null;
    touchDragStart.current = null;
    touchDragMoved.current = false;
    touchDragLastPoint.current = null;
    touchLastCellISO.current = null;
    touchMarginHold.current = null;
    if (typeof document !== "undefined") {
      document.body.classList.remove("touch-drag-lock");
    }
  }

  function cellISOFromPoint(clientX: number, clientY: number): string | null {
    if (typeof document === "undefined") return null;
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const cell = el.closest("[data-cell-iso]") as HTMLElement | null;
    return cell ? cell.getAttribute("data-cell-iso") : null;
  }

  function monthGridRect(): DOMRect | null {
    return monthGridRef.current ? monthGridRef.current.getBoundingClientRect() : null;
  }

  function pointNearMonthGrid(clientX: number, clientY: number, tolerancePx: number): boolean {
    const rect = monthGridRect();
    if (!rect) return false;
    return (
      clientX >= rect.left - tolerancePx
      && clientX <= rect.right + tolerancePx
      && clientY >= rect.top - tolerancePx
      && clientY <= rect.bottom + tolerancePx
    );
  }

  function monthGridMarginSide(
    clientX: number,
    clientY: number,
    edgePx: number,
  ): "left" | "right" | "top" | "bottom" | null {
    const rect = monthGridRect();
    if (!rect) return null;

    const nearGrid = (
      clientX >= rect.left - edgePx
      && clientX <= rect.right + edgePx
      && clientY >= rect.top - edgePx
      && clientY <= rect.bottom + edgePx
    );
    if (!nearGrid) return null;

    const distances: Array<{ side: "left" | "right" | "top" | "bottom"; dist: number }> = [
      { side: "left", dist: Math.abs(clientX - rect.left) },
      { side: "right", dist: Math.abs(rect.right - clientX) },
      { side: "top", dist: Math.abs(clientY - rect.top) },
      { side: "bottom", dist: Math.abs(rect.bottom - clientY) },
    ];
    const best = distances.reduce((acc, curr) => (curr.dist < acc.dist ? curr : acc));
    return best.dist <= edgePx ? best.side : null;
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
      if (distance < bestDistance) {
        bestISO = iso;
        bestDistance = distance;
      }
    });

    if (!bestISO || bestDistance > maxDistancePx) return null;
    return bestISO;
  }

  function updateTouchMarginHold(clientX: number, clientY: number, preferredISO?: string | null) {
    const side = monthGridMarginSide(clientX, clientY, TOUCH_EDGE_ZONE_PX);
    if (!side || (side !== "left" && side !== "right")) {
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

  function resolveTaskDropISO(clientX: number, clientY: number): string | null {
    const directISO = cellISOFromPoint(clientX, clientY);
    if (directISO) return directISO;

    if (pointNearMonthGrid(clientX, clientY, TOUCH_GRID_TOLERANCE_PX)) {
      const nearbyISO = closestCellISOFromPoint(clientX, clientY, TOUCH_NEAREST_CELL_TOLERANCE_PX);
      if (nearbyISO) return nearbyISO;
    }

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

  function getTouchById(list: TouchList, touchId: number): Touch | null {
    for (let i = 0; i < list.length; i += 1) {
      const touch = list.item(i);
      if (touch && touch.identifier === touchId) return touch;
    }
    return null;
  }

  function getTrackedTouch(list: TouchList, touchId: number | null): Touch | null {
    if (touchId !== null) {
      const tracked = getTouchById(list, touchId);
      if (tracked) return tracked;
    }
    if (list.length > 0) return list.item(0);
    return null;
  }

  function beginTaskDrag(
    task: ReviewTask,
    fromISO: string,
    touchMeta?: { touchId: number; clientX: number; clientY: number; color?: string; transport?: "touch" | "pointer" },
  ) {
    if (touchFinalizeTimer.current) {
      clearTimeout(touchFinalizeTimer.current);
      touchFinalizeTimer.current = null;
    }
    clearTouchEdgeTurnTimer();
    taskDragOrigin.current = touchMeta ? "touch" : "mouse";
    dragTaskRef.current = task;
    setDragTaskId(task.task_id);
    setDragFromISO(fromISO);
    setDragIdealISO(task.ideal_due_date);
    setTaskInitialDates((prev) => (
      prev[task.task_id] ? prev : { ...prev, [task.task_id]: task.ideal_due_date || fromISO }
    ));
    touchLastCellISO.current = fromISO;
    touchMarginHold.current = null;

    if (touchMeta) {
      if (touchDragHandlersRef.current) {
        touchDragHandlersRef.current();
        touchDragHandlersRef.current = null;
      }
      touchDragTouchId.current = touchMeta.touchId;
      touchDragStart.current = { x: touchMeta.clientX, y: touchMeta.clientY };
      touchDragMoved.current = false;
      touchDragLastPoint.current = { x: touchMeta.clientX, y: touchMeta.clientY };
      setTouchDragGhost({
        x: touchMeta.clientX,
        y: touchMeta.clientY,
        color: touchMeta.color ?? AREA_COLORS[task.area] ?? "#888",
        label: task.subtheme || task.theme || "Revisao",
      });
      if (typeof document !== "undefined") {
        document.body.classList.add("touch-drag-lock");
      }

      function syncDragPoint(clientX: number, clientY: number) {
        if (touchFinalizeTimer.current) {
          clearTimeout(touchFinalizeTimer.current);
          touchFinalizeTimer.current = null;
        }
        touchDragLastPoint.current = { x: clientX, y: clientY };
        const start = touchDragStart.current;
        if (start) {
          const dx = Math.abs(clientX - start.x);
          const dy = Math.abs(clientY - start.y);
          if (dx + dy >= TOUCH_DRAG_START_PX) touchDragMoved.current = true;
        }
        if (!touchDragMoved.current) return;

        setTouchDragGhost((prev) => (prev ? { ...prev, x: clientX, y: clientY } : null));
        const hoveredISO = cellISOFromPoint(clientX, clientY);
        if (hoveredISO) touchLastCellISO.current = hoveredISO;

        updateTouchMarginHold(clientX, clientY, hoveredISO);
      }

      function queueFinalize(point: { x: number; y: number }, moved: boolean) {
        if (touchFinalizeTimer.current) {
          clearTimeout(touchFinalizeTimer.current);
          touchFinalizeTimer.current = null;
        }
        clearTouchEdgeTurnTimer();
        touchFinalizeTimer.current = setTimeout(() => {
          touchFinalizeTimer.current = null;
          if (touchDragTouchId.current !== null) return;
          touchDragMoved.current = false;
          touchDragLastPoint.current = null;
          if (!moved) {
            clearDragState();
            return;
          }
          const toISO = resolveTaskDropISO(point.x, point.y);
          if (!toISO) {
            clearDragState();
            return;
          }
          if (toISO === fromISO) {
            clearDragState();
            return;
          }

          const baseline = taskInitialDates[task.task_id] ?? task.ideal_due_date ?? fromISO;
          const totalDrift = Math.abs(diffDays(baseline, toISO));
          if (!noDisturb && totalDrift >= 3) {
            setWarnTask({ task, from: fromISO, to: toISO, days: totalDrift });
          } else {
            void doReschedule(task, fromISO, toISO);
          }
          clearDragState();
        }, 180);
      }

      if (touchMeta.transport === "pointer") {
        const pointerId = touchMeta.touchId;
        const captureEl = monthGridRef.current;
        if (captureEl) {
          try {
            captureEl.setPointerCapture(pointerId);
          } catch {
            // ignore
          }
        }
        function onPointerMove(e: PointerEvent) {
          if (e.pointerType !== "touch") return;
          if (touchDragTouchId.current !== null && e.pointerId !== touchDragTouchId.current) return;
          touchDragTouchId.current = e.pointerId;
          if (e.cancelable) e.preventDefault();
          syncDragPoint(e.clientX, e.clientY);
        }
        function onPointerFinish(e: PointerEvent) {
          if (e.pointerType !== "touch") return;
          if (touchDragTouchId.current !== null && e.pointerId !== touchDragTouchId.current) return;
          if (e.cancelable) e.preventDefault();
          const point = touchDragLastPoint.current ?? { x: e.clientX, y: e.clientY };
          const moved = touchDragMoved.current;
          touchDragTouchId.current = null;
          touchDragStart.current = null;
          touchDragLastPoint.current = point;
          queueFinalize(point, moved);
        }
        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerFinish, true);
        window.addEventListener("pointercancel", onPointerFinish, true);
        touchDragHandlersRef.current = () => {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerFinish, true);
          window.removeEventListener("pointercancel", onPointerFinish, true);
          if (captureEl) {
            try {
              if (captureEl.hasPointerCapture(pointerId)) captureEl.releasePointerCapture(pointerId);
            } catch {
              // ignore
            }
          }
        };
        return;
      }

      function onMove(e: TouchEvent) {
        const touch = getTrackedTouch(e.touches, touchDragTouchId.current);
        if (!touch) return;
        touchDragTouchId.current = touch.identifier;
        if (e.cancelable) e.preventDefault();
        syncDragPoint(touch.clientX, touch.clientY);
      }
      function onEnd(e: TouchEvent) {
        const active = getTrackedTouch(e.touches, touchDragTouchId.current);
        if (active) {
          if (touchFinalizeTimer.current) {
            clearTimeout(touchFinalizeTimer.current);
            touchFinalizeTimer.current = null;
          }
          touchDragTouchId.current = active.identifier;
          touchDragLastPoint.current = { x: active.clientX, y: active.clientY };
          setTouchDragGhost((prev) => (prev ? { ...prev, x: active.clientX, y: active.clientY } : prev));
          return;
        }
        const changed = getTrackedTouch(e.changedTouches, touchDragTouchId.current);
        const point = changed ? { x: changed.clientX, y: changed.clientY } : touchDragLastPoint.current;
        if (!point) {
          clearDragState();
          return;
        }
        const moved = touchDragMoved.current;
        touchDragTouchId.current = null;
        touchDragStart.current = null;
        touchDragLastPoint.current = point;
        queueFinalize(point, moved);
      }

      if (typeof document !== "undefined") {
        document.addEventListener("touchmove", onMove, { passive: false, capture: true });
        document.addEventListener("touchend", onEnd, true);
        document.addEventListener("touchcancel", onEnd, true);
      }
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      window.addEventListener("touchcancel", onEnd);
      touchDragHandlersRef.current = () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
        window.removeEventListener("touchcancel", onEnd);
        if (typeof document !== "undefined") {
          document.removeEventListener("touchmove", onMove, true);
          document.removeEventListener("touchend", onEnd, true);
          document.removeEventListener("touchcancel", onEnd, true);
        }
      };
    }
  }

  function handleDrop(iso: string) {
    if (!dragTaskId || !dragFromISO) return;
    const task = dragTaskRef.current;
    if (!task) {
      clearDragState();
      return;
    }
    if (iso === dragFromISO) {
      clearDragState();
      return;
    }
    const baseline = (dragTaskId && taskInitialDates[dragTaskId]) ?? dragIdealISO ?? dragFromISO;
    const totalDrift = Math.abs(diffDays(baseline, iso));
    if (!noDisturb && totalDrift >= 3) {
      setWarnTask({ task, from: dragFromISO, to: iso, days: totalDrift });
    } else {
      void doReschedule(task, dragFromISO, iso);
    }
    clearDragState();
  }

  function vibrateLongPress() {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(12);
    } catch {
      // ignore
    }
  }

  function cancelTouchLongPress() {
    if (touchLongPressCleanupRef.current) {
      touchLongPressCleanupRef.current();
      touchLongPressCleanupRef.current = null;
    }
  }

  function startTouchDrag(
    e: React.TouchEvent<HTMLDivElement>,
    task: ReviewTask,
    fromISO: string,
    color: string,
  ) {
    if (typeof window !== "undefined" && "PointerEvent" in window && (navigator.maxTouchPoints ?? 0) > 0) {
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    cancelTouchLongPress();
    const start = { x: touch.clientX, y: touch.clientY };
    let started = false;
    const timer = window.setTimeout(() => {
      started = true;
      setTouchDraggingTaskId(task.task_id);
      vibrateLongPress();
      beginTaskDrag(task, fromISO, {
        touchId: touch.identifier,
        clientX: start.x,
        clientY: start.y,
        color,
        transport: "touch",
      });
    }, TOUCH_DRAG_LONG_PRESS_MS);

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("touchmove", onMove, true);
      window.removeEventListener("touchend", onFinish, true);
      window.removeEventListener("touchcancel", onFinish, true);
    }
    function onMove(event: TouchEvent) {
      const active = getTrackedTouch(event.touches, touch.identifier);
      if (!active) return;
      const dx = Math.abs(active.clientX - start.x);
      const dy = Math.abs(active.clientY - start.y);
      if (!started && Math.max(dx, dy) > TOUCH_DRAG_LONG_PRESS_CANCEL_PX) {
        cleanup();
        touchLongPressCleanupRef.current = null;
      }
    }
    function onFinish() {
      if (!started) {
        cleanup();
        touchLongPressCleanupRef.current = null;
      }
    }
    window.addEventListener("touchmove", onMove, { capture: true, passive: true });
    window.addEventListener("touchend", onFinish, true);
    window.addEventListener("touchcancel", onFinish, true);
    touchLongPressCleanupRef.current = cleanup;
  }

  function startPointerTouchDrag(
    e: React.PointerEvent<HTMLDivElement>,
    task: ReviewTask,
    fromISO: string,
    color: string,
  ) {
    if (e.pointerType !== "touch") return;
    cancelTouchLongPress();
    const pointerId = e.pointerId;
    const start = { x: e.clientX, y: e.clientY };
    let started = false;
    const timer = window.setTimeout(() => {
      started = true;
      setTouchDraggingTaskId(task.task_id);
      vibrateLongPress();
      beginTaskDrag(task, fromISO, {
        touchId: pointerId,
        clientX: start.x,
        clientY: start.y,
        color,
        transport: "pointer",
      });
    }, TOUCH_DRAG_LONG_PRESS_MS);

    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onFinish, true);
      window.removeEventListener("pointercancel", onFinish, true);
    }
    function onMove(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      const dx = Math.abs(event.clientX - start.x);
      const dy = Math.abs(event.clientY - start.y);
      if (!started && Math.max(dx, dy) > TOUCH_DRAG_LONG_PRESS_CANCEL_PX) {
        cleanup();
        touchLongPressCleanupRef.current = null;
      }
    }
    function onFinish(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      if (!started) {
        cleanup();
        touchLongPressCleanupRef.current = null;
      }
    }
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onFinish, true);
    window.addEventListener("pointercancel", onFinish, true);
    touchLongPressCleanupRef.current = cleanup;
  }

  function handleWarnAccept() {
    if (!warnTask) return;
    const count = parseInt(localStorage.getItem(RESCHEDULE_WARN_COUNT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(RESCHEDULE_WARN_COUNT_KEY, String(count));
    void doReschedule(warnTask.task, warnTask.from, warnTask.to);
    setWarnTask(null);
  }

  function handleNoDisturb() {
    localStorage.setItem(RESCHEDULE_NO_DISTURB_KEY, "1");
    setNoDisturb(true);
    if (warnTask) void doReschedule(warnTask.task, warnTask.from, warnTask.to);
    setWarnTask(null);
  }

  function reactivateNoDisturb() {
    localStorage.removeItem(RESCHEDULE_NO_DISTURB_KEY);
    localStorage.removeItem(RESCHEDULE_WARN_COUNT_KEY);
    setNoDisturb(false);
  }

  const warnCount = typeof window !== "undefined"
    ? parseInt(localStorage.getItem(RESCHEDULE_WARN_COUNT_KEY) ?? "0", 10)
    : 0;

  return {
    monthGridRef,
    dragTaskId,
    dragFromISO,
    touchDraggingTaskId,
    touchDragGhost,
    taskDragOrigin,
    touchDragTouchId,
    isTouchDevice,
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
    getTrackedTouch,
  };
}
