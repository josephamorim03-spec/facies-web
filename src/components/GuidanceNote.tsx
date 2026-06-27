import { type ReactNode } from "react";
import { AREA_BORDER_CLASS } from "@/lib/areaColors";
import type { GuidanceTone } from "@/lib/guidanceCopy";

// "Voz do sistema": a linha do porquê, em tom de tutor.
//
// Tratamento autoral — nota de margem de um prontuário: prosa em serif, com uma
// aresta lateral fina na cor da grande área (aba de índice), e um eyebrow opcional
// em caixa-alta. Reusa só tokens do tema; nenhuma cor literal.

const TONE_TEXT: Record<GuidanceTone, string> = {
  neutral: "text-muted",
  positive: "text-success",
  attention: "text-warning",
  critical: "text-danger",
};

type Props = {
  children: ReactNode;
  /** Código da grande área (GO/PD/MP/CG/CM/OU) — pinta a aresta lateral. */
  area?: string | null;
  /** Rótulo curto opcional, em caixa-alta (eyebrow). */
  eyebrow?: string;
  tone?: GuidanceTone;
  className?: string;
};

export function GuidanceNote({ children, area, eyebrow, tone = "neutral", className = "" }: Props) {
  const borderClass = area ? AREA_BORDER_CLASS[area.toUpperCase()] ?? "border-edge" : "border-edge";
  return (
    <div className={`border-l-2 ${borderClass} pl-3 ${className}`}>
      {eyebrow ? (
        <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${TONE_TEXT[tone]}`}>
          {eyebrow}
        </p>
      ) : null}
      <p className="font-serif text-sm leading-relaxed text-ink">{children}</p>
    </div>
  );
}
