"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  getWeeklyTimeline,
  getTurboAreaStats,
  type WeeklyTimeline,
  type OperationalTurboAreaStats,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { AREA_COLORS } from "@/app/desempenho/_lib/perfilAnalytics";
import type { Area as AreaKey } from "@/app/desempenho/_lib/perfilShared";
import {
  AREA_SEGMENT_ORDER,
  CHART_MUTED,
  CHART_INK,
  TOUCH_INTERACTION_QUERY,
  WEEKLY_CHART_INTERACTION_INSET,
  VOLUME_ACTIVE_OUTLINE,
  detectTouchInteractionMode,
  resolveIndexFromClientX,
  clamp,
  computeChartPoint,
  computeExplodedLabelPlacement,
  resolveLockedAreaOverlayLabels,
  type SlopeDatum,
  type PointerGestureState,
  type ChartFrame,
  type HtmlLabelPlacement,
  type LockedAreaOverlayLabel,
} from "../_lib/chartGeometry";

// ── Types ────────────────────────────────────────────────────────

type VolumeWeekDatum = WeeklyTimeline["weeks"][number] & {
  areaTotals: Record<AreaKey, number>;
  hasAreaBreakdown: boolean;
};

export type GraficosState = {
  timeline: WeeklyTimeline | null;
  loading: boolean;
  error: string;
  turboAreaStats: OperationalTurboAreaStats | null;
  turboAreaLoading: boolean;
  isTouchInteractionMode: boolean;
  accuracyLockedWeekIndex: number | null;
  accuracyHoverWeekIndex: number | null;
  volumeLockedWeekIndex: number | null;
  volumeHoverWeekIndex: number | null;
  lockedAreaLine: AreaKey | null;
  lockedSlopeArea: AreaKey | null;
  accuracyFrame: ChartFrame;
  areaLinesFrame: ChartFrame;
  volumeSegmentLabelPositions: Array<{ area: AreaKey; midY: number; count: number }>;
  weeks: WeeklyTimeline["weeks"];
  hasData: boolean;
  volumeXAxisTicks: string[];
  weekIndexByLabel: Map<string, number>;
  accuracyIsLocked: boolean;
  accuracyActiveWeekIndex: number | null;
  activeAccuracyWeek: WeeklyTimeline["weeks"][number] | null;
  activeAccuracyWeekWithData: WeeklyTimeline["weeks"][number] | null;
  volumeIsLocked: boolean;
  volumeActiveWeekIndex: number | null;
  activeVolumeWeek: WeeklyTimeline["weeks"][number] | null;
  volumeData: VolumeWeekDatum[];
  activeVolumeSegments: AreaKey[];
  activeAreaLines: AreaKey[];
  areaLineData: Record<string, unknown>[];
  slopeData: SlopeDatum[];
  slopePeriodLabels: { before: string; after: string };
  cardAnalysisRows: Array<{ area: AreaKey; volumePct: number; accuracyPct: number | null; reviewsTotal: number }>;
  activeAccuracyOverlayLabel: { key: string; text: string; placement: HtmlLabelPlacement } | null;
  lockedAreaOverlayLabels: LockedAreaOverlayLabel[];
};

export type GraficosRefs = {
  accuracySectionRef: RefObject<HTMLElement | null>;
  volumeSectionRef: RefObject<HTMLElement | null>;
  accuracyFrameRef: RefObject<HTMLDivElement | null>;
  areaLinesFrameRef: RefObject<HTMLDivElement | null>;
  accuracyOverlayRef: RefObject<HTMLDivElement | null>;
  volumeOverlayRef: RefObject<HTMLDivElement | null>;
  volumeSegmentPositionsRef: RefObject<Array<{ area: AreaKey; midY: number; count: number }>>;
  accuracyPointerStateRef: RefObject<PointerGestureState>;
  volumePointerStateRef: RefObject<PointerGestureState>;
};

export type GraficosActions = {
  retryCharts: () => void;
  setAccuracyLockedWeekIndex: Dispatch<SetStateAction<number | null>>;
  setVolumeLockedWeekIndex: Dispatch<SetStateAction<number | null>>;
  setLockedAreaLine: Dispatch<SetStateAction<AreaKey | null>>;
  setLockedSlopeArea: Dispatch<SetStateAction<AreaKey | null>>;
  setVolumeSegmentLabelPositions: Dispatch<SetStateAction<Array<{ area: AreaKey; midY: number; count: number }>>>;
  handleAccuracyPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleAccuracyPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleAccuracyPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleAccuracyPointerLeave: () => void;
  handleVolumePointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleVolumePointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleVolumePointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleVolumePointerLeave: () => void;
  renderVolumeBar: (props: any) => ReactNode;
};

/**
 * KROS-022: `weeks` era o literal 12 dentro do efeito, então a Evolução não tinha
 * seletor de período nenhum — e o rótulo "Últimas 12 semanas" era texto fixo em
 * dois lugares. Vira parâmetro; os memos derivados já dependiam do TAMANHO do
 * array de semanas, não do número 12, então nada abaixo daqui precisou mudar.
 */
export function useGraficosData(
  { weeks: rangeWeeks = 12 }: { weeks?: number } = {},
): [GraficosState, GraficosRefs, GraficosActions] {
  const [timeline, setTimeline] = useState<WeeklyTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Período a que o `timeline` em memória pertence. Trocar de período mantém os
   * dados anteriores na tela por um instante; sem isto o aluno veria os números
   * do intervalo antigo sob o rótulo do novo. Derivar a obsolescência (em vez de
   * chamar `setLoading(true)` dentro do efeito) também respeita a regra
   * `react-hooks/set-state-in-effect`.
   */
  const [loadedWeeks, setLoadedWeeks] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [turboAreaStats, setTurboAreaStats] = useState<OperationalTurboAreaStats | null>(null);
  const [turboAreaLoading, setTurboAreaLoading] = useState(true);
  const [isTouchInteractionMode, setIsTouchInteractionMode] = useState(false);

  const [accuracyLockedWeekIndex, setAccuracyLockedWeekIndex] = useState<number | null>(null);
  const [accuracyHoverWeekIndex, setAccuracyHoverWeekIndex] = useState<number | null>(null);
  const [volumeLockedWeekIndex, setVolumeLockedWeekIndex] = useState<number | null>(null);
  const [volumeHoverWeekIndex, setVolumeHoverWeekIndex] = useState<number | null>(null);
  const [lockedAreaLine, setLockedAreaLine] = useState<AreaKey | null>(null);
  const [lockedSlopeArea, setLockedSlopeArea] = useState<AreaKey | null>(null);

  const accuracySectionRef = useRef<HTMLElement | null>(null);
  const volumeSectionRef = useRef<HTMLElement | null>(null);
  const accuracyFrameRef = useRef<HTMLDivElement | null>(null);
  const areaLinesFrameRef = useRef<HTMLDivElement | null>(null);
  const accuracyOverlayRef = useRef<HTMLDivElement | null>(null);
  const volumeOverlayRef = useRef<HTMLDivElement | null>(null);
  const volumeSegmentPositionsRef = useRef<Array<{ area: AreaKey; midY: number; count: number }>>([]);
  const [volumeSegmentLabelPositions, setVolumeSegmentLabelPositions] = useState<Array<{ area: AreaKey; midY: number; count: number }>>([]);
  const [accuracyFrame, setAccuracyFrame] = useState<ChartFrame>({ width: 0, height: 0 });
  const [areaLinesFrame, setAreaLinesFrame] = useState<ChartFrame>({ width: 0, height: 0 });

  const accuracyPointerStateRef = useRef<PointerGestureState>({
    pointerId: null,
    moved: false,
    startIndex: null,
    initialLockedIndex: null,
  });
  const volumePointerStateRef = useRef<PointerGestureState>({
    pointerId: null,
    moved: false,
    startIndex: null,
    initialLockedIndex: null,
  });

  // ── Effects ────────────────────────────────────────────────────

  useEffect(() => {
    const token = getAuthToken();
    getWeeklyTimeline(token, rangeWeeks)
      .then((tl) => {
        setTimeline(tl);
        setLoadedWeeks(rangeWeeks);
      })
      .catch((e: unknown) => {
        const err = e as { message?: string } | Error | null;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err?.message === "string"
              ? err.message
              : "Erro ao carregar dados.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [reloadVersion, rangeWeeks]);

  useEffect(() => {
    const token = getAuthToken();
    getTurboAreaStats(token)
      .then(setTurboAreaStats)
      .catch(() => setTurboAreaStats(null))
      .finally(() => setTurboAreaLoading(false));
  }, [reloadVersion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(TOUCH_INTERACTION_QUERY);
    const update = () => setIsTouchInteractionMode(detectTouchInteractionMode());
    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
    } else {
      mediaQuery.addListener(update);
    }
    window.addEventListener("resize", update);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", update);
      } else {
        mediaQuery.removeListener(update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  // ── Derived data ───────────────────────────────────────────────

  const weeks = useMemo(() => timeline?.weeks ?? [], [timeline]);
  const hasData = weeks.some((w) => w.total > 0);
  const volumeXAxisTicks = useMemo(() => {
    const evenWeekLabels = weeks
      .filter((_, index) => index % 2 === 1)
      .map((week) => week.week_label);
    return evenWeekLabels.length > 0 ? evenWeekLabels : weeks.map((week) => week.week_label);
  }, [weeks]);
  const weekIndexByLabel = useMemo(() => {
    const labelToIndex = new Map<string, number>();
    weeks.forEach((week, index) => {
      if (!labelToIndex.has(week.week_label)) labelToIndex.set(week.week_label, index);
    });
    return labelToIndex;
  }, [weeks]);

  const accuracyIsLocked = accuracyLockedWeekIndex !== null;
  const accuracyActiveWeekIndex = accuracyIsLocked ? accuracyLockedWeekIndex : accuracyHoverWeekIndex;
  const activeAccuracyWeek = accuracyActiveWeekIndex !== null ? weeks[accuracyActiveWeekIndex] : null;
  const activeAccuracyWeekWithData = activeAccuracyWeek && activeAccuracyWeek.total > 0 ? activeAccuracyWeek : null;

  const volumeIsLocked = volumeLockedWeekIndex !== null;
  const volumeActiveWeekIndex = volumeIsLocked ? volumeLockedWeekIndex : volumeHoverWeekIndex;
  const activeVolumeWeek = volumeActiveWeekIndex !== null ? weeks[volumeActiveWeekIndex] : null;

  const volumeData = useMemo<VolumeWeekDatum[]>(() => {
    return weeks.map((week) => {
      const areaTotals = AREA_SEGMENT_ORDER.reduce<Record<AreaKey, number>>((acc, area) => {
        acc[area] = Math.max(0, Number(week.areas?.[area]?.total ?? 0));
        return acc;
      }, { GO: 0, PD: 0, CG: 0, MP: 0, CM: 0, OU: 0 });
      const hasAreaBreakdown = AREA_SEGMENT_ORDER.some((area) => areaTotals[area] > 0);
      return {
        ...week,
        areaTotals,
        hasAreaBreakdown,
      };
    });
  }, [weeks]);

  const activeVolumeSegments = useMemo(() => {
    if (volumeActiveWeekIndex === null || volumeActiveWeekIndex >= volumeData.length) return [] as AreaKey[];
    const row = volumeData[volumeActiveWeekIndex];
    return AREA_SEGMENT_ORDER.filter((area) => row.areaTotals[area] > 0);
  }, [volumeActiveWeekIndex, volumeData]);

  const activeAreaLines = useMemo<AreaKey[]>(() =>
    AREA_SEGMENT_ORDER.filter((area) =>
      weeks.filter((w) => (w.areas[area]?.accuracy_pct ?? null) !== null).length >= 2
    ), [weeks]);

  const areaLineData = useMemo<Record<string, unknown>[]>(() =>
    weeks.map((week) => {
      const entry: Record<string, unknown> = { week_label: week.week_label };
      for (const area of activeAreaLines) entry[area] = week.areas[area]?.accuracy_pct ?? null;
      return entry;
    }), [weeks, activeAreaLines]);

  const slopeData = useMemo<SlopeDatum[]>(() => {
    const mid = Math.floor(weeks.length / 2);
    function halfAcc(halfWeeks: typeof weeks, area: AreaKey): number | null {
      let total = 0, correct = 0;
      for (const w of halfWeeks) { total += w.areas[area]?.total ?? 0; correct += w.areas[area]?.correct ?? 0; }
      return total > 0 ? Math.round((correct / total) * 100) : null;
    }
    return AREA_SEGMENT_ORDER.map((area) => {
      const first = halfAcc(weeks.slice(0, mid), area);
      const second = halfAcc(weeks.slice(mid), area);
      return { area, first, second, delta: first !== null && second !== null ? second - first : null };
    }).filter((d) => d.first !== null || d.second !== null);
  }, [weeks]);

  const slopePeriodLabels = useMemo(() => {
    if (weeks.length < 2) return { before: "Antes", after: "Recente" };
    const mid = Math.floor(weeks.length / 2);
    return {
      before: weeks[0].week_label,
      after: weeks[mid]?.week_label ?? weeks[weeks.length - 1].week_label,
    };
  }, [weeks]);

  const cardAnalysisRows = useMemo(() => {
    if (!turboAreaStats || turboAreaStats.total_reviews <= 0) return [];
    return (turboAreaStats.by_area ?? [])
      .filter((item) => AREA_SEGMENT_ORDER.includes(item.area as AreaKey))
      .sort((a, b) => b.reviews_total - a.reviews_total)
      .map((item) => {
        const area = item.area as AreaKey;
        const volumePct = Math.round((item.reviews_total / turboAreaStats.total_reviews) * 100);
        const accuracyPct = item.reviews_total > 0
          ? Math.round((item.reviews_correct / item.reviews_total) * 100)
          : null;
        return {
          area,
          volumePct,
          accuracyPct,
          reviewsTotal: item.reviews_total,
        };
      });
  }, [turboAreaStats]);

  const activeAccuracyOverlayLabel = useMemo(() => {
    if (!activeAccuracyWeekWithData || accuracyActiveWeekIndex === null) return null;
    if (accuracyFrame.width <= 0 || accuracyFrame.height <= 0) return null;
    const value = Number(activeAccuracyWeekWithData.accuracy_pct ?? 0);
    const point = computeChartPoint(accuracyFrame, accuracyActiveWeekIndex, weeks.length, value);
    const placement = computeExplodedLabelPlacement(accuracyFrame, point);
    return {
      key: `${activeAccuracyWeekWithData.week_start}-accuracy`,
      text: `${Math.round(value)}%`,
      placement,
    };
  }, [activeAccuracyWeekWithData, accuracyActiveWeekIndex, accuracyFrame, weeks.length]);

  const lockedAreaOverlayLabels = useMemo(() => {
    if (!lockedAreaLine) return [] as LockedAreaOverlayLabel[];
    if (areaLinesFrame.width <= 0 || areaLinesFrame.height <= 0) return [] as LockedAreaOverlayLabel[];
    const labels = areaLineData
      .map((entry, index) => {
        const raw = entry[lockedAreaLine];
        if (raw === null || raw === undefined) return null;
        const value = Number(raw);
        if (!Number.isFinite(value)) return null;
        const point = computeChartPoint(areaLinesFrame, index, areaLineData.length, value);
        return {
          key: `${lockedAreaLine}-${index}`,
          text: `${Math.round(value)}%`,
          color: AREA_COLORS[lockedAreaLine],
          point,
          weekIndex: index,
        };
      })
      .filter((item): item is Omit<LockedAreaOverlayLabel, "placement"> => item !== null);
    return resolveLockedAreaOverlayLabels(labels, areaLinesFrame);
  }, [lockedAreaLine, areaLinesFrame, areaLineData]);

  // ── Layout effects ─────────────────────────────────────────────

  useLayoutEffect(() => {
    if (volumeActiveWeekIndex === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVolumeSegmentLabelPositions([]);
    } else {
      setVolumeSegmentLabelPositions([...volumeSegmentPositionsRef.current]);
    }
  }, [volumeActiveWeekIndex]);

  useLayoutEffect(() => {
    if (loading) return;
    const targets: Array<{ ref: RefObject<HTMLDivElement | null>; update: (frame: ChartFrame) => void }> = [
      { ref: accuracyFrameRef, update: setAccuracyFrame },
      { ref: areaLinesFrameRef, update: setAreaLinesFrame },
    ];
    const observers: ResizeObserver[] = [];
    const resizeHandlers: Array<() => void> = [];

    for (const target of targets) {
      const node = target.ref.current;
      if (!node) continue;
      const measure = () => {
        const rect = node.getBoundingClientRect();
        target.update({ width: rect.width, height: rect.height });
      };
      measure();
      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        observers.push(observer);
      } else {
        window.addEventListener("resize", measure);
        resizeHandlers.push(measure);
      }
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
      resizeHandlers.forEach((handler) => window.removeEventListener("resize", handler));
    };
  }, [loading, activeAreaLines.length]);

  // ── Event handlers ─────────────────────────────────────────────

  function handleAccuracyPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const index = resolveIndexFromClientX(
      e.clientX,
      accuracyOverlayRef.current,
      weeks.length,
      "point",
      WEEKLY_CHART_INTERACTION_INSET,
    );
    if (index === null) return;
    accuracyPointerStateRef.current = {
      pointerId: e.pointerId,
      moved: false,
      startIndex: index,
      initialLockedIndex: accuracyLockedWeekIndex,
    };
    setAccuracyLockedWeekIndex(index);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (e.pointerType === "touch") e.preventDefault();
  }

  function handleAccuracyPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const pointerState = accuracyPointerStateRef.current;
    const index = resolveIndexFromClientX(
      e.clientX,
      accuracyOverlayRef.current,
      weeks.length,
      "point",
      WEEKLY_CHART_INTERACTION_INSET,
    );
    if (pointerState.pointerId === e.pointerId) {
      if (index === null) return;
      if (index !== pointerState.startIndex) pointerState.moved = true;
      setAccuracyLockedWeekIndex(index);
      if (e.pointerType === "touch") e.preventDefault();
      return;
    }
    if (!isTouchInteractionMode && !accuracyIsLocked && e.pointerType === "mouse") {
      setAccuracyHoverWeekIndex(index);
    }
  }

  function handleAccuracyPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const pointerState = accuracyPointerStateRef.current;
    if (pointerState.pointerId !== e.pointerId) return;
    accuracyPointerStateRef.current = { pointerId: null, moved: false, startIndex: null, initialLockedIndex: null };
  }

  function handleAccuracyPointerLeave() {
    if (!isTouchInteractionMode && !accuracyIsLocked) setAccuracyHoverWeekIndex(null);
  }

  function handleVolumePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const index = resolveIndexFromClientX(
      e.clientX,
      volumeOverlayRef.current,
      weeks.length,
      "band",
      WEEKLY_CHART_INTERACTION_INSET,
    );
    if (index === null) return;
    volumePointerStateRef.current = {
      pointerId: e.pointerId,
      moved: false,
      startIndex: index,
      initialLockedIndex: volumeLockedWeekIndex,
    };
    setVolumeLockedWeekIndex(index);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (e.pointerType === "touch") e.preventDefault();
  }

  function handleVolumePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const pointerState = volumePointerStateRef.current;
    const index = resolveIndexFromClientX(
      e.clientX,
      volumeOverlayRef.current,
      weeks.length,
      "band",
      WEEKLY_CHART_INTERACTION_INSET,
    );
    if (pointerState.pointerId === e.pointerId) {
      if (index === null) return;
      if (index !== pointerState.startIndex) pointerState.moved = true;
      setVolumeLockedWeekIndex(index);
      if (e.pointerType === "touch") e.preventDefault();
      return;
    }
    if (!isTouchInteractionMode && !volumeIsLocked && e.pointerType === "mouse") {
      setVolumeHoverWeekIndex(index);
    }
  }

  function handleVolumePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const pointerState = volumePointerStateRef.current;
    if (pointerState.pointerId !== e.pointerId) return;
    volumePointerStateRef.current = { pointerId: null, moved: false, startIndex: null, initialLockedIndex: null };
  }

  function handleVolumePointerLeave() {
    if (!isTouchInteractionMode && !volumeIsLocked) setVolumeHoverWeekIndex(null);
  }

  const renderVolumeBar = (props: any) => {
    const { x, y, width, height, index, payload } = props as {
      x: number;
      y: number;
      width: number;
      height: number;
      index: number;
      payload: VolumeWeekDatum;
    };
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (width <= 0 || height <= 0) return null;

    const isActive = index === volumeActiveWeekIndex;
    const hasBreakdown = payload.hasAreaBreakdown && payload.total > 0;

    if (!isActive || !hasBreakdown) {
      return <rect x={x} y={y} width={width} height={height} fill={CHART_INK} fillOpacity={isActive ? 0.75 : 0.58} />;
    }

    const positiveAreas = AREA_SEGMENT_ORDER.filter((area) => payload.areaTotals[area] > 0);
    let cursorY = y + height;
    const segments = positiveAreas.map((area, areaIndex) => {
      const isLast = areaIndex === positiveAreas.length - 1;
      const rawHeight = (payload.areaTotals[area] / payload.total) * height;
      const segmentHeight = isLast ? Math.max(0, cursorY - y) : Math.max(0, rawHeight);
      cursorY -= segmentHeight;
      return { area, segY: cursorY, segHeight: segmentHeight };
    });
    volumeSegmentPositionsRef.current = segments.map(({ area, segY, segHeight }) => ({
      area,
      midY: segY + segHeight / 2,
      count: payload.areaTotals[area],
    }));

    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={CHART_INK} fillOpacity={0.22} />
        {segments.map(({ area, segY, segHeight }) => (
          <rect
            key={`${payload.week_start}-${area}`}
            x={x}
            y={segY}
            width={width}
            height={segHeight}
            fill={AREA_COLORS[area]}
            fillOpacity={0.95}
          />
        ))}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={VOLUME_ACTIVE_OUTLINE}
          // Selecao marcada por PESO de traco, nao por brilho: 2px duros em
          // vez de 1,5px com 7px de blur. O blur era o unico pixel macio do
          // grafico inteiro.
          strokeWidth={2}
        />
      </g>
    );
  };

  // ── Build state object ─────────────────────────────────────────

  const state: GraficosState = {
    timeline,
    loading: loading || (timeline !== null && loadedWeeks !== rangeWeeks),
    error,
    turboAreaStats,
    turboAreaLoading,
    isTouchInteractionMode,
    accuracyLockedWeekIndex,
    accuracyHoverWeekIndex,
    volumeLockedWeekIndex,
    volumeHoverWeekIndex,
    lockedAreaLine,
    lockedSlopeArea,
    accuracyFrame,
    areaLinesFrame,
    volumeSegmentLabelPositions,
    weeks,
    hasData,
    volumeXAxisTicks,
    weekIndexByLabel,
    accuracyIsLocked,
    accuracyActiveWeekIndex,
    activeAccuracyWeek,
    activeAccuracyWeekWithData,
    volumeIsLocked,
    volumeActiveWeekIndex,
    activeVolumeWeek,
    volumeData,
    activeVolumeSegments,
    activeAreaLines,
    areaLineData,
    slopeData,
    slopePeriodLabels,
    cardAnalysisRows,
    activeAccuracyOverlayLabel,
    lockedAreaOverlayLabels,
  };

  const refs: GraficosRefs = {
    accuracySectionRef,
    volumeSectionRef,
    accuracyFrameRef,
    areaLinesFrameRef,
    accuracyOverlayRef,
    volumeOverlayRef,
    volumeSegmentPositionsRef,
    accuracyPointerStateRef,
    volumePointerStateRef,
  };

  const actions: GraficosActions = {
    retryCharts: () => {
      setLoading(true);
      setError("");
      setTurboAreaLoading(true);
      setReloadVersion((version) => version + 1);
    },
    setAccuracyLockedWeekIndex,
    setVolumeLockedWeekIndex,
    setLockedAreaLine,
    setLockedSlopeArea,
    setVolumeSegmentLabelPositions,
    handleAccuracyPointerDown,
    handleAccuracyPointerMove,
    handleAccuracyPointerUp,
    handleAccuracyPointerLeave,
    handleVolumePointerDown,
    handleVolumePointerMove,
    handleVolumePointerUp,
    handleVolumePointerLeave,
    renderVolumeBar,
  };

  return [state, refs, actions];
}
