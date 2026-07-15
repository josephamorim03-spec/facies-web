"use client";

/**
 * Área specialty icons — SVG paths, no PNG/emoji.
 * Each icon uses `currentColor` so the caller controls color via className/style.
 */

import React from "react";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_HEX, AREA_SHORT_LABELS } from "@/lib/areaIdentity";

const VIEWBOX = "0 0 24 24";
const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: "1.8",
};

type IconProps = { className?: string; style?: React.CSSProperties };

// Compatibility alias for legacy callers that still receive an unvalidated
// string. New code should resolve the area before indexing the canonical map.
export const AREA_COLORS: Record<string, string> = AREA_HEX;
export { AREA_FULL_LABELS, AREA_SHORT_LABELS };

// ── Individual area icons ──────────────────────────────────────────────────

function IconGO({ className, style }: IconProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} aria-hidden="true" {...STROKE_PROPS}>
      {/* Uterus body */}
      <path d="M12 21 L12 17.2" />
      <path d="M9.4 17.2 C9.4 14.8 8.7 12.6 8.7 10.2 C8.7 7.2 10.3 4.5 12 4.5 C13.7 4.5 15.3 7.2 15.3 10.2 C15.3 12.6 14.6 14.8 14.6 17.2 Z" />
      {/* Left fallopian tube → ovary (solid) */}
      <path d="M8.7 8.9 C7.4 7.8 5.8 8.2 4.8 9.6" />
      <ellipse cx="3.8" cy="10.2" rx="1.15" ry="0.95" fill="currentColor" stroke="none" />
      {/* Right fallopian tube → ovary (solid) */}
      <path d="M15.3 8.9 C16.6 7.8 18.2 8.2 19.2 9.6" />
      <ellipse cx="20.2" cy="10.2" rx="1.15" ry="0.95" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCG({ className, style }: IconProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} aria-hidden="true" {...STROKE_PROPS}>
      {/* Handle */}
      <path d="M5 19 L9 15" strokeWidth="2.5" />
      {/* Blade body */}
      <path d="M9 15 L17.5 6.5" />
      {/* Blade tip — sharp triangle */}
      <path d="M17.5 6.5 L20 4 L17 5.5 Z" fill="currentColor" stroke="none" />
      {/* Handle grip mark — single discreet notch */}
      <path d="M6.6 17.4 L7.6 16.4" strokeWidth="1.2" />
    </svg>
  );
}

function IconPD({ className, style }: IconProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} aria-hidden="true" {...STROKE_PROPS}>
      {/* Baby head */}
      <circle cx="12" cy="8" r="4" />
      {/* Body */}
      <path d="M8.5 12 C8 15 9.5 18.5 12 18.5 C14.5 18.5 16 15 15.5 12" />
      {/* Left arm */}
      <path d="M8.5 13 C7 13.5 5 12.5 5 11" />
      {/* Right arm */}
      <path d="M15.5 13 C17 13.5 19 12.5 19 11" />
      {/* Left leg */}
      <path d="M10 18.5 C9.5 20 9.5 21 10.5 21.5" />
      {/* Right leg */}
      <path d="M14 18.5 C14.5 20 14.5 21 13.5 21.5" />
    </svg>
  );
}

function IconCM({ className, style }: IconProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} aria-hidden="true" {...STROKE_PROPS}>
      {/* Left ear piece */}
      <path d="M6 3.5 L6 7" />
      {/* Right ear piece */}
      <path d="M18 3.5 L18 7" />
      {/* Ear tips (small buds) */}
      <circle cx="6" cy="3.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="3.5" r="0.8" fill="currentColor" stroke="none" />
      {/* Y-join arc */}
      <path d="M6 7 C6 10 9 12 12 12 C15 12 18 10 18 7" />
      {/* Tube down and curve */}
      <path d="M12 12 C12 15 14 16 16 16 C18 16 19.5 17.5 19.5 19.5" />
      {/* Chest piece (diaphragm) — solid disc, no hollow center */}
      <circle cx="19.5" cy="19.5" r="2.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMP({ className, style }: IconProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} aria-hidden="true" {...STROKE_PROPS}>
      {/* Shield outline */}
      <path d="M12 3 L4 7 L4 13 C4 17.5 7.5 21 12 22.5 C16.5 21 20 17.5 20 13 L20 7 Z" />
      {/* Medical cross inside — solid plus */}
      <path
        d="M10.9 9.8 H13.1 V11.9 H15.2 V14.1 H13.1 V16.2 H10.9 V14.1 H8.8 V11.9 H10.9 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function IconOU({ className, style }: IconProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} style={style} aria-hidden="true" {...STROKE_PROPS}>
      {/* Erlenmeyer flask */}
      <path d="M9.5 3.5 L9.5 11 L4.5 18.5 C4 19.5 4.5 21 6 21 L18 21 C19.5 21 20 19.5 19.5 18.5 L14.5 11 L14.5 3.5" />
      {/* Neck top */}
      <line x1="8.5" y1="3.5" x2="15.5" y2="3.5" strokeWidth="2" />
      {/* Bubbles inside flask */}
      <circle cx="10" cy="18" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="13.5" cy="16" r="1.5" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="15.5" cy="18.5" r="1" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

// ── Public component ───────────────────────────────────────────────────────

const ICON_MAP: Record<string, (p: IconProps) => React.JSX.Element> = {
  GO: IconGO,
  OB: IconGO,
  CG: IconCG,
  PD: IconPD,
  CM: IconCM,
  MP: IconMP,
  OU: IconOU,
};

export function AreaIcon({
  area,
  size = 24,
  colored = true,
  className = "",
}: {
  area: string;
  size?: number;
  colored?: boolean;
  className?: string;
}) {
  const displayArea = resolveDisplayArea(area);
  const Icon = ICON_MAP[displayArea] ?? IconOU;
  const color = colored ? (AREA_COLORS[displayArea] ?? AREA_COLORS.OU) : "currentColor";
  return (
    <Icon
      className={className || "shrink-0"}
      style={{ width: size, height: size, color }}
    />
  );
}
