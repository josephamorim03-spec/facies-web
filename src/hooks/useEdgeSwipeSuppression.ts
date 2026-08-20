"use client";

import { useEffect } from "react";

/**
 * Suprime o gesto de "voltar/avancar" por swipe nas bordas em aparelhos de toque.
 *
 * ISTO NAO ABRE NEM FECHA MENU NENHUM. Morava dentro de `Nav.tsx` junto do drawer
 * e por isso parecia parte dele -- mas e' independente da navegacao: sem esta
 * supressao, o swipe de borda do iOS/Android navega o historico no meio de um
 * gesto horizontal legitimo do app, e o aluno perde a sessao.
 *
 * Quem depende disso hoje (unicos dois `data-allow-horizontal-swipe='true'`):
 *   - `cards/registros/_components/_components/TurboCard.tsx` (swipe entre cards)
 *   - `cronograma/_components/calendar/CalendarGrid.tsx` (swipe entre semanas)
 *
 * Nesses dois casos o alvo esta na allowlist e o gesto passa -- exceto na faixa
 * de 16px colada na borda, onde o navegador vence de qualquer jeito e a unica
 * saida honesta e' cancelar o toque em vez de disputar.
 *
 * @param enabled - false desliga o listener (telas sem chrome, desktop sem toque).
 */
export function useEdgeSwipeSuppression(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if ((navigator.maxTouchPoints ?? 0) <= 0) return;

    const EDGE_ZONE_PX = 24;
    const BROWSER_EDGE_PX = 16;
    const HORIZONTAL_START_PX = 14;
    const AXIS_MARGIN_PX = 8;
    let tracking = false;
    let suppressing = false;
    let startX = 0;
    let startY = 0;
    let touchId: number | null = null;

    function isAllowedHorizontalSwipeTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      return Boolean(target.closest("[data-allow-horizontal-swipe='true']"));
    }

    function isInteractiveEdgeTarget(target: EventTarget | null): boolean {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest("button, a, input, textarea, select, [role='button'], [contenteditable='true']"),
      );
    }

    function getTrackedTouch(list: TouchList): Touch | null {
      if (touchId !== null) {
        for (let i = 0; i < list.length; i += 1) {
          const touch = list.item(i);
          if (touch && touch.identifier === touchId) return touch;
        }
      }
      return list.length > 0 ? list.item(0) : null;
    }

    function clearGestureState() {
      tracking = false;
      suppressing = false;
      touchId = null;
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        clearGestureState();
        return;
      }
      const touch = e.touches.item(0);
      if (!touch) {
        clearGestureState();
        return;
      }
      const viewportWidth = window.innerWidth;
      const nearEdge = touch.clientX <= EDGE_ZONE_PX || touch.clientX >= viewportWidth - EDGE_ZONE_PX;
      if (!nearEdge) {
        clearGestureState();
        return;
      }
      if (isInteractiveEdgeTarget(e.target)) {
        clearGestureState();
        return;
      }
      if (isAllowedHorizontalSwipeTarget(e.target)) {
        const atBrowserEdge = touch.clientX <= BROWSER_EDGE_PX || touch.clientX >= viewportWidth - BROWSER_EDGE_PX;
        if (atBrowserEdge && e.cancelable) e.preventDefault();
        clearGestureState();
        return;
      }
      tracking = true;
      suppressing = false;
      startX = touch.clientX;
      startY = touch.clientY;
      touchId = touch.identifier;

      if (e.cancelable) e.preventDefault();
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking) return;
      const touch = getTrackedTouch(e.touches);
      if (!touch) {
        clearGestureState();
        return;
      }
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (!suppressing) {
        if (absX < HORIZONTAL_START_PX && absY < HORIZONTAL_START_PX) return;
        if (absX > absY + AXIS_MARGIN_PX) {
          suppressing = true;
        } else if (absY > absX + AXIS_MARGIN_PX) {
          clearGestureState();
          return;
        } else {
          return;
        }
      }

      if (e.cancelable) e.preventDefault();
    }

    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: false });
    window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    window.addEventListener("touchend", clearGestureState, { capture: true });
    window.addEventListener("touchcancel", clearGestureState, { capture: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("touchend", clearGestureState, { capture: true });
      window.removeEventListener("touchcancel", clearGestureState, { capture: true });
    };
  }, [enabled]);
}
