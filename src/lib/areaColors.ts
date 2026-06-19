// Tailwind class maps for area-based coloring.
// Full class names are listed explicitly so Tailwind's content scanner keeps them.
// For hex values (SVG/canvas/inline styles) use AREA_HEX / areaHex() below.

// Canonical hex values for the medical areas — these mirror the theme-independent
// `--area-*` CSS variables in globals.css. This is the SINGLE source of truth:
// feature libs and pages must import from here instead of redefining their own map.
export const AREA_HEX: Record<string, string> = {
  GO: "#B65AA0",
  PD: "#2E79A8",
  MP: "#A97816",
  CG: "#B44A4F",
  CM: "#2D8B62",
  OU: "#8C928E",
};

/** Canonical color for a full mock-exam (mirrors --area-full-exam in globals.css). */
export const AREA_FULL_EXAM_HEX = "#0F4C5C";

/** Safe area-color accessor: case-insensitive, falls back to the neutral "Outras" tone. */
export function areaHex(area: string | null | undefined): string {
  return AREA_HEX[(area ?? "").toUpperCase()] ?? AREA_HEX.OU;
}

export const AREA_BG_CLASS: Record<string, string> = {
  GO: "bg-area-go",
  PD: "bg-area-ped",
  MP: "bg-area-mp",
  CG: "bg-area-cg",
  CM: "bg-area-cm",
  OU: "bg-area-ou",
};

export const AREA_TEXT_CLASS: Record<string, string> = {
  GO: "text-area-go",
  PD: "text-area-ped",
  MP: "text-area-mp",
  CG: "text-area-cg",
  CM: "text-area-cm",
  OU: "text-area-ou",
};

export const AREA_BORDER_CLASS: Record<string, string> = {
  GO: "border-area-go",
  PD: "border-area-ped",
  MP: "border-area-mp",
  CG: "border-area-cg",
  CM: "border-area-cm",
  OU: "border-area-ou",
};
