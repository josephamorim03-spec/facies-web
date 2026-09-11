"use client";

import type { Area as AreaKey } from "@/lib/perfil/perfilShared";

// ── Chart constants ──────────────────────────────────────────────

export const CHART_INK = "var(--color-ink)";
export const CHART_EDGE = "var(--color-edge)";
export const CHART_MUTED = "var(--color-muted)";
/**
 * O TEXTO DENTRO DO SVG — mono, 10px, 400.
 *
 * Os eixos herdavam a sans do documento, e cada gráfico repetia o seu
 * `{ fontSize: 10, fill: CHART_MUTED }` à mão. Rótulo de eixo é DADO — a mesma
 * família dos números, tempos e percentuais do resto do app — e o
 * `spec-do-app.mjs` mede o texto de SVG como mede o de HTML: um `fontSize={9}`
 * ou um `fontWeight={700}` aqui é um degrau que as 22 artboards não têm.
 */
export const CHART_FONT_MONO = "var(--font-mono)";
export const CHART_TICK = { fontSize: 10, fill: CHART_MUTED, fontFamily: CHART_FONT_MONO } as const;
export const CHART_SVG_LABEL = { fontSize: 10, fill: CHART_MUTED, fontFamily: CHART_FONT_MONO } as const;
export const TOUCH_INTERACTION_QUERY = "(hover: none), (pointer: coarse)";
export const AREA_SEGMENT_ORDER: AreaKey[] = ["GO", "PD", "CG", "MP", "CM", "OU"];
// Contorno da barra ativa. Precisa ser token: com um cinza-quase-preto fixo,
// o realce sumia sobre o papel escuro.
export const VOLUME_ACTIVE_OUTLINE = CHART_INK;
export const VOLUME_SEGMENT_GUTTER_PX = 24;
export const VOLUME_SEGMENT_LABEL_LEFT_PX = 4;
export const VOLUME_SEGMENT_PIN_LENGTH_PX = 6;
export const VOLUME_SEGMENT_GAP_FROM_PLOT_PX = -1;
export const CHART_Y_AXIS_WIDTH = 40;
export const WEEKLY_CHART_MARGIN = { top: 4, right: 20, left: 6, bottom: 0 } as const;
export const CHART_X_AXIS_PADDING = { left: 12, right: 12 } as const;
export const WEEKLY_CHART_INTERACTION_INSET = {
  left: CHART_Y_AXIS_WIDTH + WEEKLY_CHART_MARGIN.left + CHART_X_AXIS_PADDING.left,
  right: WEEKLY_CHART_MARGIN.right + CHART_X_AXIS_PADDING.right,
} as const;
export const CHART_PLOT_TOP_INSET = WEEKLY_CHART_MARGIN.top + 2;
export const CHART_PLOT_BOTTOM_INSET = 24;
export const CHART_LABEL_EDGE_THRESHOLD = 24;
export const CHART_LABEL_ESTIMATED_CHAR_WIDTH = 6.5;
export const CHART_LABEL_ESTIMATED_HEIGHT = 13;
export const CHART_LABEL_COLLISION_PADDING = 2;
export const CHART_LABEL_PLOT_PADDING = 2;
export const CHART_LABEL_VERTICAL_GAP = 8;
export const CHART_LABEL_HORIZONTAL_GAP = 8;
export const CHART_LABEL_MAX_ANCHOR_DISTANCE = 34;
export const CHART_LABEL_LINE_CLEARANCE = 4;
export const AREA_LABEL_LAYOUT_BEAM_WIDTH = 24;
export const AREA_LABEL_CANDIDATE_ORDER = [
  "top-center",
  "top-right",
  "bottom-center",
  "bottom-right",
] as const;
export const AREA_LABEL_TOP_CENTER_NUDGE_STEPS = [
  { dx: 0, dy: 0 },
  { dx: 0, dy: -12 },
  { dx: 0, dy: -20 },
  { dx: -8, dy: 0 },
  { dx: 8, dy: 0 },
  { dx: 8, dy: -12 },
  { dx: 16, dy: 0 },
  { dx: 16, dy: -12 },
  { dx: 24, dy: 0 },
  { dx: 24, dy: -12 },
] as const;
export const AREA_LABEL_TOP_RIGHT_NUDGE_STEPS = Array.from({ length: 24 }, (_, index) => {
  const row = Math.floor(index / 4);
  const column = index % 4;
  return {
    dx: 8 + column * 10,
    dy: -row * 12,
  };
});

// ── Types ────────────────────────────────────────────────────────

export type SlopeDatum = { area: AreaKey; first: number | null; second: number | null; delta: number | null };

export type PointerGestureState = {
  pointerId: number | null;
  moved: boolean;
  startIndex: number | null;
  initialLockedIndex: number | null;
};

export type ChartFrame = { width: number; height: number };
export type ChartPoint = { x: number; y: number };
export type LabelTransform =
  | "translate(-50%, -100%)"
  | "translate(-50%, 0)"
  | "translate(0, -100%)"
  | "translate(-100%, -100%)"
  | "translate(0, 0)"
  | "translate(-100%, 0)";
export type HtmlLabelPlacement = { left: number; top: number; transform: LabelTransform };
export type HtmlLabelBounds = { left: number; top: number; right: number; bottom: number };
export type LabelCandidatePosition = (typeof AREA_LABEL_CANDIDATE_ORDER)[number];
export type ChartLineSegment = { start: ChartPoint; end: ChartPoint };
export type LockedAreaOverlayLabel = {
  key: string;
  text: string;
  placement: HtmlLabelPlacement;
  color: string;
  point: ChartPoint;
  weekIndex: number;
};
export type WeekTickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string; index?: number };
};

// ── Utility functions ────────────────────────────────────────────

export function detectTouchInteractionMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia(TOUCH_INTERACTION_QUERY).matches
    || (navigator.maxTouchPoints ?? 0) > 0
  );
}

export function clampIndex(value: number, count: number): number {
  if (count <= 0) return 0;
  return Math.max(0, Math.min(count - 1, value));
}

export function resolveIndexFromClientX(
  clientX: number,
  element: HTMLDivElement | null,
  count: number,
  mode: "point" | "band",
  inset: { left?: number; right?: number },
): number | null {
  if (!element || count <= 0) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0) return null;
  const leftInset = Math.max(0, Number(inset.left ?? 0));
  const rightInset = Math.max(0, Number(inset.right ?? 0));
  const interactiveWidth = Math.max(1, rect.width - leftInset - rightInset);
  const rawX = clientX - rect.left - leftInset;
  const relativeX = Math.max(0, Math.min(interactiveWidth, rawX));
  if (count === 1) return 0;
  if (mode === "point") {
    const raw = Math.round((relativeX / interactiveWidth) * (count - 1));
    return clampIndex(raw, count);
  }
  const raw = Math.floor((relativeX / interactiveWidth) * count);
  return clampIndex(raw, count);
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value)}%`;
}

/**
 * Aplica alfa a qualquer cor — inclusive a uma CSS var, que é como as cores de
 * gráfico chegam aqui. A versão anterior fazia parse de hex e devolvia branco
 * para qualquer outra coisa.
 */
export function withAlpha(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computePlotBounds(frame: ChartFrame): { left: number; right: number; top: number; bottom: number } {
  const left = WEEKLY_CHART_INTERACTION_INSET.left;
  const right = Math.max(left + 1, frame.width - WEEKLY_CHART_MARGIN.right);
  const top = CHART_PLOT_TOP_INSET;
  const bottom = Math.max(top + 1, frame.height - CHART_PLOT_BOTTOM_INSET);
  return { left, right, top, bottom };
}

export function computeChartPoint(
  frame: ChartFrame,
  index: number,
  count: number,
  valuePct: number,
): ChartPoint {
  const bounds = computePlotBounds(frame);
  const plotWidth = Math.max(1, bounds.right - bounds.left);
  const plotHeight = Math.max(1, bounds.bottom - bounds.top);
  const ratioX = count <= 0 ? 0.5 : (index + 0.5) / count;
  const ratioY = clamp(valuePct, 0, 100) / 100;
  return {
    x: bounds.left + ratioX * plotWidth,
    y: bounds.bottom - ratioY * plotHeight,
  };
}

export function transformToOffset(transform: LabelTransform): { x: number; y: number } {
  switch (transform) {
    case "translate(-50%, -100%)":
      return { x: -0.5, y: -1 };
    case "translate(-50%, 0)":
      return { x: -0.5, y: 0 };
    case "translate(0, -100%)":
      return { x: 0, y: -1 };
    case "translate(-100%, -100%)":
      return { x: -1, y: -1 };
    case "translate(0, 0)":
      return { x: 0, y: 0 };
    case "translate(-100%, 0)":
      return { x: -1, y: 0 };
    default:
      return { x: -0.5, y: -1 };
  }
}

export function computeHtmlLabelBounds(text: string, placement: HtmlLabelPlacement): HtmlLabelBounds {
  const width = Math.max(16, text.length * CHART_LABEL_ESTIMATED_CHAR_WIDTH);
  const height = CHART_LABEL_ESTIMATED_HEIGHT;
  const offset = transformToOffset(placement.transform);
  const left = placement.left + width * offset.x;
  const top = placement.top + height * offset.y;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

export function clampHtmlLabelPlacementToPlot(
  text: string,
  placement: HtmlLabelPlacement,
  plotBounds: { left: number; right: number; top: number; bottom: number },
  padding: number,
): HtmlLabelPlacement {
  const bounds = computeHtmlLabelBounds(text, placement);
  let dx = 0;
  let dy = 0;
  if (bounds.left < plotBounds.left + padding) {
    dx = plotBounds.left + padding - bounds.left;
  } else if (bounds.right > plotBounds.right - padding) {
    dx = plotBounds.right - padding - bounds.right;
  }
  if (bounds.top < plotBounds.top + padding) {
    dy = plotBounds.top + padding - bounds.top;
  } else if (bounds.bottom > plotBounds.bottom - padding) {
    dy = plotBounds.bottom - padding - bounds.bottom;
  }
  if (dx === 0 && dy === 0) return placement;
  return {
    ...placement,
    left: placement.left + dx,
    top: placement.top + dy,
  };
}

export function labelsOverlap(a: HtmlLabelBounds, b: HtmlLabelBounds): boolean {
  return !(
    a.right + CHART_LABEL_COLLISION_PADDING <= b.left
    || b.right + CHART_LABEL_COLLISION_PADDING <= a.left
    || a.bottom + CHART_LABEL_COLLISION_PADDING <= b.top
    || b.bottom + CHART_LABEL_COLLISION_PADDING <= a.top
  );
}

export function pointDistance(a: ChartPoint, b: ChartPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function computeBoundsOverflow(
  bounds: HtmlLabelBounds,
  plotBounds: { left: number; right: number; top: number; bottom: number },
  padding: number,
): number {
  const overflowLeft = Math.max(0, plotBounds.left + padding - bounds.left);
  const overflowRight = Math.max(0, bounds.right - (plotBounds.right - padding));
  const overflowTop = Math.max(0, plotBounds.top + padding - bounds.top);
  const overflowBottom = Math.max(0, bounds.bottom - (plotBounds.bottom - padding));
  return overflowLeft + overflowRight + overflowTop + overflowBottom;
}

export function pointInsideBounds(point: ChartPoint, bounds: HtmlLabelBounds): boolean {
  return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
}

export function orientation(a: ChartPoint, b: ChartPoint, c: ChartPoint): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) < 1e-7) return 0;
  return value > 0 ? 1 : 2;
}

export function onSegment(a: ChartPoint, b: ChartPoint, c: ChartPoint): boolean {
  return (
    b.x <= Math.max(a.x, c.x)
    && b.x >= Math.min(a.x, c.x)
    && b.y <= Math.max(a.y, c.y)
    && b.y >= Math.min(a.y, c.y)
  );
}

export function segmentsIntersect(a: ChartPoint, b: ChartPoint, c: ChartPoint, d: ChartPoint): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a, c, b)) return true;
  if (o2 === 0 && onSegment(a, d, b)) return true;
  if (o3 === 0 && onSegment(c, a, d)) return true;
  if (o4 === 0 && onSegment(c, b, d)) return true;

  return false;
}

export function segmentTouchesRect(segment: ChartLineSegment, bounds: HtmlLabelBounds, clearance = 0): boolean {
  const rect = {
    left: bounds.left - clearance,
    right: bounds.right + clearance,
    top: bounds.top - clearance,
    bottom: bounds.bottom + clearance,
  };

  if (pointInsideBounds(segment.start, rect) || pointInsideBounds(segment.end, rect)) return true;

  const topLeft = { x: rect.left, y: rect.top };
  const topRight = { x: rect.right, y: rect.top };
  const bottomRight = { x: rect.right, y: rect.bottom };
  const bottomLeft = { x: rect.left, y: rect.bottom };

  return (
    segmentsIntersect(segment.start, segment.end, topLeft, topRight)
    || segmentsIntersect(segment.start, segment.end, topRight, bottomRight)
    || segmentsIntersect(segment.start, segment.end, bottomRight, bottomLeft)
    || segmentsIntersect(segment.start, segment.end, bottomLeft, topLeft)
  );
}

export function labelTouchesAnyLineSegment(bounds: HtmlLabelBounds, segments: ChartLineSegment[]): boolean {
  return segments.some((segment) => segmentTouchesRect(segment, bounds, CHART_LABEL_LINE_CLEARANCE));
}

export function computeAreaLabelPlacement(point: ChartPoint, position: LabelCandidatePosition): HtmlLabelPlacement {
  switch (position) {
    case "top-center":
      return { left: point.x, top: point.y - CHART_LABEL_VERTICAL_GAP, transform: "translate(-50%, -100%)" };
    case "top-right":
      return { left: point.x + CHART_LABEL_HORIZONTAL_GAP, top: point.y - CHART_LABEL_VERTICAL_GAP, transform: "translate(0, -100%)" };
    case "bottom-center":
      return { left: point.x, top: point.y + CHART_LABEL_VERTICAL_GAP, transform: "translate(-50%, 0)" };
    case "bottom-right":
      return { left: point.x + CHART_LABEL_HORIZONTAL_GAP, top: point.y + CHART_LABEL_VERTICAL_GAP, transform: "translate(0, 0)" };
    default:
      return { left: point.x, top: point.y - CHART_LABEL_VERTICAL_GAP, transform: "translate(-50%, -100%)" };
  }
}

export function buildLineSegments(points: Array<{ weekIndex: number; point: ChartPoint }>): ChartLineSegment[] {
  const segments: ChartLineSegment[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    if (current.weekIndex !== prev.weekIndex + 1) continue;
    segments.push({ start: prev.point, end: current.point });
  }
  return segments;
}

export function nudgePlacement(placement: HtmlLabelPlacement, dx: number, dy: number): HtmlLabelPlacement {
  return {
    ...placement,
    left: placement.left + dx,
    top: placement.top + dy,
  };
}

export function resolveLockedAreaOverlayLabels(
  labels: Array<Omit<LockedAreaOverlayLabel, "placement">>,
  frame: ChartFrame,
): LockedAreaOverlayLabel[] {
  if (labels.length === 0) return [];
  const plotBounds = computePlotBounds(frame);
  const lineSegments = buildLineSegments(labels.map((label) => ({ weekIndex: label.weekIndex, point: label.point })));
  type PlacedStateLabel = LockedAreaOverlayLabel & { bounds: HtmlLabelBounds };
  type LayoutState = { score: number; placed: PlacedStateLabel[] };

  let states: LayoutState[] = [{ score: 0, placed: [] }];

  for (const label of labels) {
    const candidates = AREA_LABEL_CANDIDATE_ORDER.flatMap((position, positionRank) => {
      const basePlacement = computeAreaLabelPlacement(label.point, position);
        const rawNudgeSteps = position === "top-center" || position === "bottom-center"
          ? AREA_LABEL_TOP_CENTER_NUDGE_STEPS
          : AREA_LABEL_TOP_RIGHT_NUDGE_STEPS;
      return rawNudgeSteps.map((rawNudge, nudgeRank) => {
        const nudge = position.startsWith("bottom")
          ? { dx: rawNudge.dx, dy: -rawNudge.dy }
          : rawNudge;
        const placement = clampHtmlLabelPlacementToPlot(
          label.text,
          nudgePlacement(basePlacement, nudge.dx, nudge.dy),
          plotBounds,
          CHART_LABEL_PLOT_PADDING,
        );
        const bounds = computeHtmlLabelBounds(label.text, placement);
        const overflow = computeBoundsOverflow(bounds, plotBounds, CHART_LABEL_PLOT_PADDING);
        const touchesLine = labelTouchesAnyLineSegment(bounds, lineSegments);
        const coversPoint = pointInsideBounds(label.point, bounds);
        const anchorDistance = pointDistance(label.point, { x: placement.left, y: placement.top });
        const distanceOverflow = Math.max(0, anchorDistance - CHART_LABEL_MAX_ANCHOR_DISTANCE);
        const rightShiftFromPoint = Math.max(0, placement.left - label.point.x);
        const staticPenalty = (
          overflow * 3
          + (touchesLine ? 450 : 0)
          + (coversPoint ? 6000 : 0)
          + distanceOverflow * 25
          + positionRank * 12
          + (position === "top-center" ? rightShiftFromPoint * 3 : 0)
          + nudgeRank * 2
        );
        return {
          placement,
          bounds,
          coversPoint,
          touchesLine,
          staticPenalty,
        };
      });
    });
    const usableCandidates = candidates.some((candidate) => !candidate.coversPoint)
      ? candidates.filter((candidate) => !candidate.coversPoint)
      : candidates;

    const nextStates: LayoutState[] = [];
    for (const state of states) {
      for (const candidate of usableCandidates) {
        const hasCollision = state.placed.some((other) => labelsOverlap(candidate.bounds, other.bounds));
        if (hasCollision) continue;
        let flowPenalty = 0;
        const previousPlaced = state.placed[state.placed.length - 1];
        if (previousPlaced) {
          const pointDeltaY = label.point.y - previousPlaced.point.y;
          const candidateDeltaY = candidate.placement.top - previousPlaced.placement.top;
          const pointDirection = Math.sign(pointDeltaY);
          const labelDirection = Math.sign(candidateDeltaY);
          if (Math.abs(pointDeltaY) > 2 && pointDirection !== 0 && labelDirection !== 0 && pointDirection !== labelDirection) {
            flowPenalty += 1800;
          }
          flowPenalty += Math.abs(candidateDeltaY - pointDeltaY) * 6;
        }
        const score = state.score + candidate.staticPenalty + flowPenalty;
        nextStates.push({
          score,
          placed: [
            ...state.placed,
            {
              ...label,
              placement: candidate.placement,
              bounds: candidate.bounds,
            },
          ],
        });
      }
    }

    nextStates.sort((a, b) => a.score - b.score);
    states = nextStates.slice(0, AREA_LABEL_LAYOUT_BEAM_WIDTH);
  }

  const bestState = states[0];
  if (!bestState) return [];
  return bestState.placed.map(({ bounds: _bounds, ...placedLabel }) => placedLabel);
}

export function computeExplodedLabelPlacement(frame: ChartFrame, point: ChartPoint): HtmlLabelPlacement {
  const bounds = computePlotBounds(frame);
  const nearRight = point.x >= bounds.right - CHART_LABEL_EDGE_THRESHOLD;
  const nearLeft = point.x <= bounds.left + CHART_LABEL_EDGE_THRESHOLD;
  const nearTop = point.y <= bounds.top + CHART_LABEL_EDGE_THRESHOLD;

  if (nearRight) {
    return {
      left: point.x - 6,
      top: nearTop ? bounds.top - 6 : point.y - 10,
      transform: "translate(-100%, -100%)",
    };
  }
  if (nearLeft) {
    return {
      left: point.x + 6,
      top: nearTop ? bounds.top - 6 : point.y - 10,
      transform: "translate(0, -100%)",
    };
  }
  return {
    left: point.x,
    top: nearTop ? bounds.top - 6 : point.y - 10,
    transform: "translate(-50%, -100%)",
  };
}

export function renderWeekTickLabel(
  props: WeekTickProps,
  weekIndexByLabel: Map<string, number>,
  option: { activeWeekIndex?: number | null; activeFill?: string; defaultFill?: string },
) {
  const tickLabel = typeof props.payload?.value === "string" ? props.payload.value : "";
  const mappedWeekIndex = tickLabel ? weekIndexByLabel.get(tickLabel) : undefined;
  const fallbackIndex = typeof props.payload?.index === "number" ? props.payload.index : -1;
  const weekIndex = typeof mappedWeekIndex === "number" ? mappedWeekIndex : fallbackIndex;
  const isActive = typeof option.activeWeekIndex === "number" && weekIndex === option.activeWeekIndex;
  const tickX = Number(props.x);
  const tickY = Number(props.y);
  if (!Number.isFinite(tickX) || !Number.isFinite(tickY)) return null;
  return (
    <text
      data-testid={weekIndex >= 0 ? `volume-week-tick-${weekIndex}` : undefined}
      data-week-label={tickLabel || undefined}
      x={tickX}
      y={tickY + 2}
      textAnchor="middle"
      dominantBaseline="hanging"
      fill={isActive ? (option.activeFill ?? CHART_INK) : (option.defaultFill ?? CHART_MUTED)}
      fontFamily={CHART_FONT_MONO}
      fontSize={10}
      // A semana ativa distingue-se pela TINTA (`activeFill`), e nao pelo peso:
      // no desenho a mono nunca e' negrito, e 10/700 nao existe em nenhuma das
      // 22 artboards.
      fontWeight={400}
    >
      {tickLabel}
    </text>
  );
}
