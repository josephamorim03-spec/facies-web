"use client";

/**
 * Marcador de área — a sigla numa caixa com a cor da área na borda, e o glifo
 * figurativo quando a caixa é grande o bastante para ele ler.
 *
 * Este componente já foi quatro coisas, e vale registrar por quê, porque as
 * quatro cobrem o espaço inteiro do problema:
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
 * 4. **As duas, decididas pelo tamanho.** A objeção que matou a fase 1 era
 *    específica — *não liam a 16px* — e não se aplica a 44px. Acima de
 *    `PISO_GLIFO` entra o desenho (`AreaGlyph`); abaixo, a sigla, que continua
 *    sendo a verdade em quase todo o app. Hoje o único chamador acima do piso é
 *    o herói de `/hoje`, onde o ícone tem espaço para ser uma imagem e não um
 *    rótulo — e é o quadro que a landing pública mostra.
 *
 * A cor da área fica na BORDA e no TRAÇO, nunca no texto — e isso é medido, não
 * gosto. Como texto de 11px ela precisaria de 4,5:1, e a paleta Okabe-Ito
 * reprovou 29 pares nessa exigência; como limite gráfico o mínimo é 3:1, e aí
 * ela passa. O raciocínio inteiro está em `lib/areaIdentity.ts`.
 */

import React from "react";
import { AreaGlyph } from "@/components/AreaGlyph";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_SHORT_LABELS, AREA_VAR } from "@/lib/areaIdentity";

export { AREA_FULL_LABELS, AREA_SHORT_LABELS };

/**
 * A partir de onde o glifo entra no lugar da sigla.
 *
 * 40px é o alvo mínimo de toque do sistema, e é também onde um desenho de traço
 * de 1,6 unidades num viewBox de 24 passa a ter mais de 2,5px de espessura real.
 * Abaixo disso o glifo vira borrão e a sigla ganha — que é exatamente o que a
 * fase 1 descobriu do jeito caro.
 */
const PISO_GLIFO = 40;

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
  const comGlifo = size >= PISO_GLIFO;

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
        // `color` só desce para o glifo: ele desenha em `currentColor`, e é
        // MARCA (3:1). A sigla continua herdando `text-ink` da classe, porque
        // como TEXTO ela precisaria de 4,5:1 — a distinção que sustenta o
        // arquivo inteiro.
        ...(comGlifo ? { color } : null),
      }}
    >
      {comGlifo ? (
        // ~0.7 do lado: deixa a margem óptica que a borda pede, sem encostar.
        // A 0,62 o desenho boiava dentro da caixa e lia como ícone pequeno num
        // quadro grande, que é o oposto do que a caixa está ali para fazer.
        <AreaGlyph area={displayArea} size={Math.round(size * 0.7)} />
      ) : (
        AREA_SHORT_LABELS[displayArea]
      )}
    </span>
  );
}
