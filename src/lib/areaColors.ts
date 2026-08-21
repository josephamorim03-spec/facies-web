import {
  AREA_BG_CLASS as CANONICAL_AREA_BG_CLASS,
  AREA_BORDER_CLASS as CANONICAL_AREA_BORDER_CLASS,
  AREA_FULL_EXAM_VAR,
  AREA_TEXT_CLASS as CANONICAL_AREA_TEXT_CLASS,
  AREA_VAR,
} from "@/lib/areaIdentity";

export const AREA_BG_CLASS: Record<string, string> = CANONICAL_AREA_BG_CLASS;
export const AREA_BORDER_CLASS: Record<string, string> = CANONICAL_AREA_BORDER_CLASS;
export const AREA_TEXT_CLASS: Record<string, string> = CANONICAL_AREA_TEXT_CLASS;
export { AREA_FULL_EXAM_VAR, AREA_VAR };

/**
 * Cor de área. Sempre CSS var — tem override no `.dark`, e é a única paleta.
 *
 * Havia um par `areaHex`/`areaVar` aqui; o primeiro devolvia hex fixo, o mesmo
 * nos dois temas, e era o que a maioria dos call sites acabava usando por ter o
 * nome mais óbvio. Sobrou um só, para não haver escolha errada a fazer.
 */
export function areaColor(area: string | null | undefined): string {
  const key = (area ?? "").toUpperCase() as keyof typeof AREA_VAR;
  return AREA_VAR[key] ?? AREA_VAR.OU;
}
