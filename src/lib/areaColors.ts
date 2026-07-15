import {
  AREA_BG_CLASS as CANONICAL_AREA_BG_CLASS,
  AREA_BORDER_CLASS as CANONICAL_AREA_BORDER_CLASS,
  AREA_FULL_EXAM_HEX,
  AREA_HEX,
  AREA_TEXT_CLASS as CANONICAL_AREA_TEXT_CLASS,
} from "@/lib/areaIdentity";

export const AREA_BG_CLASS: Record<string, string> = CANONICAL_AREA_BG_CLASS;
export const AREA_BORDER_CLASS: Record<string, string> = CANONICAL_AREA_BORDER_CLASS;
export const AREA_TEXT_CLASS: Record<string, string> = CANONICAL_AREA_TEXT_CLASS;
export { AREA_FULL_EXAM_HEX, AREA_HEX };

export function areaHex(area: string | null | undefined): string {
  const key = (area ?? "").toUpperCase() as keyof typeof AREA_HEX;
  return AREA_HEX[key] ?? AREA_HEX.OU;
}
