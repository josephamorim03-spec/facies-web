"use client";

/**
 * Marcador de área — a sigla, não uma ilustração.
 *
 * Eram seis desenhos figurativos (útero com ovários, bisturi, bebê,
 * estetoscópio, escudo com cruz, erlenmeyer com bolhas) em traço de 1,8px com
 * ponta arredondada. Três problemas de uma vez:
 *
 * 1. **Não liam.** Ilustração figurativa em 24px vira mancha; em 16px, ruído.
 *    Distinguir "útero" de "escudo" a essa escala é adivinhação.
 * 2. **Não pertenciam.** Traço fino arredondado é o vocabulário do ícone
 *    vetorial moderno — o oposto exato de um sistema de 1px duro.
 * 3. **Escondiam a informação.** O aluno já pensa em "CM", "GO", "PD" — as
 *    siglas são o vocabulário do produto e da prova. O desenho era uma camada
 *    de tradução no meio do caminho.
 *
 * A sigla resolve os três: legível em qualquer tamanho, é chrome mono como o
 * resto, e é o nome que o aluno usa. O `title` mantém o nome completo para quem
 * ainda não decorou os códigos.
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
      className={`inline-flex shrink-0 items-center justify-center border font-semibold uppercase leading-none tabular-nums ${className}`.trim()}
      style={{
        width: size,
        height: size,
        // A sigla tem 2 caracteres e a caixa é quadrada: ~0.42 do lado mantém as
        // duas letras dentro da borda de 24px até 16px, sem medir texto.
        fontSize: Math.max(8, Math.round(size * 0.42)),
        letterSpacing: "0.02em",
        color,
        borderColor: color,
      }}
    >
      {AREA_SHORT_LABELS[displayArea]}
    </span>
  );
}
