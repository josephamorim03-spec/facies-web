// Tailwind class maps for area-based coloring.
// Full class names are listed explicitly so Tailwind's content scanner keeps them.
// For hex color values (Recharts SVG props), import AREA_COLORS from the
// feature-specific shared lib instead.

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
