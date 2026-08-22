"use client";

/**
 * Marcador de área — a sigla numa caixa com a cor da área na borda.
 *
 * Este componente já foi três coisas, e vale registrar por quê, porque as três
 * tentativas cobrem o espaço inteiro do problema:
 *
 * 1. **Seis ilustrações figurativas** (útero, bisturi, bebê, estetoscópio…) em
 *    traço fino com ponta arredondada. Não liam a 16px e não pertenciam ao
 *    sistema de 1px duro que existia então.
 * 2. **Pixel art**, sete glifos em grade de 12×12 de células cheias. Liam bem e
 *    eram bonitos — e eram a assinatura do KROS/DOS, que é a identidade que a
 *    Fácies substitui. Num prontuário, pixel art é ruído.
 * 3. **A sigla**, que é o que sobrou de verdadeiro nas três: "CM", "GO", "PD"
 *    são o vocabulário do aluno e da prova. O desenho sempre foi uma camada de
 *    tradução no meio do caminho.
 *
 * A cor da área fica na BORDA, não no texto — e isso é medido, não gosto. Como
 * texto de 11px ela precisaria de 4,5:1, e a paleta Okabe-Ito reprovou 29 pares
 * nessa exigência; como limite gráfico o mínimo é 3:1, e aí ela passa. O
 * raciocínio inteiro está em `lib/areaIdentity.ts`.
 */

import React from "react";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_SHORT_LABELS, AREA_VAR } from "@/lib/areaIdentity";

export { AREA_FULL_LABELS, AREA_SHORT_LABELS };

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
  const color = colored ? (AREA_VAR[displayArea] ?? AREA_VAR.OU) : "currentColor";

  return (
    <span
      aria-hidden="true"
      title={AREA_FULL_LABELS[displayArea]}
      className={`inline-flex shrink-0 items-center justify-center rounded-control border font-semibold uppercase leading-none tabular-nums text-ink ${className}`.trim()}
      style={{
        width: size,
        height: size,
        // A sigla tem 2 caracteres e a caixa é quadrada: ~0.38 do lado mantém as
        // duas letras dentro da borda de 44px até 24px, sem medir texto.
        fontSize: Math.max(11, Math.round(size * 0.38)),
        letterSpacing: "0.02em",
        borderColor: color,
      }}
    >
      {AREA_SHORT_LABELS[displayArea]}
    </span>
  );
}
