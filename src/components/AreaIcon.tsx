"use client";

/**
 * Marcador de área — desenho pixelado onde há espaço, sigla onde não há.
 *
 * As duas direções já foram tentadas e as duas erraram por motivos opostos:
 *
 * - Havia seis ilustrações figurativas em traço de 1,8px com ponta arredondada.
 *   Não pertenciam ao sistema (traço fino curvo é vocabulário de ícone vetorial
 *   moderno) e, num chip de 16px, viravam mancha.
 * - Elas foram trocadas por sigla em caixa. Legível em qualquer tamanho — e sem
 *   graça: um produto de medicina que só mostra códigos perde o que a imagem faz
 *   de melhor, que é ser reconhecida antes de ser lida.
 *
 * A saída não é escolher no vazio, é escolher pelo TAMANHO. Os dois consumidores
 * grandes (herói do Hoje a 44px, lista do Kros a 28px) recebem o desenho; os
 * apertados — barra do calendário, chip de filtro, legenda de gráfico — usam
 * sigla, e nem passam por aqui.
 *
 * Sobre COMO os desenhos são feitos: pixel art é feita de células cheias, não de
 * traço fino. A primeira tentativa usou `stroke` de 2px com degraus e virou
 * mancha a 44px. Estes são retângulos preenchidos numa grade de 12×12 (cada
 * célula = 2 unidades do viewBox de 24), que é como a `pixelarticons` desenha.
 */

import React from "react";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import {
  AREA_FULL_LABELS,
  AREA_SHORT_LABELS,
  AREA_VAR,
  type DisplayArea,
} from "@/lib/areaIdentity";

export { AREA_FULL_LABELS, AREA_SHORT_LABELS };

/**
 * Uma célula da grade 12×12 vira um retângulo do viewBox 24×24.
 *
 * Escrever os glifos em coordenadas de GRADE e não em unidades do SVG é o que
 * mantém o desenho legível no código: `cell(4, 3, 4, 4)` é "quatro por quatro a
 * partir de (4,3)", e é assim que se pensa ao desenhar em pixel.
 */
function cell(column: number, row: number, width: number, height: number): string {
  const x = column * 2;
  const y = row * 2;
  const w = width * 2;
  const h = height * 2;
  return `M${x} ${y}h${w}v${h}h${-w}z`;
}

/**
 * Cada glifo é uma lista de células cheias, mais uma lista de células VAZADAS.
 *
 * O vazado usa `fill-rule="evenodd"`, e isso impõe uma regra: os retângulos
 * vazados não podem se sobrepor entre si. Dois que se cruzam (uma cruz montada
 * como barra vertical + barra horizontal) têm a interseção preenchida de volta —
 * foi assim que a cruz do escudo virou uma fechadura na primeira versão. Por
 * isso a cruz é decomposta em três partes que não se tocam.
 */
const GLYPHS: Record<DisplayArea, { solid: string[]; holes?: string[] }> = {
  // Útero: corpo, colo, base, tubas e ovários.
  GO: {
    solid: [
      cell(1, 2, 1, 2), cell(10, 2, 1, 2),   // ovários
      cell(2, 3, 2, 1), cell(8, 3, 2, 1),    // tubas
      cell(4, 3, 4, 4),                      // corpo
      cell(5, 7, 2, 2),                      // colo
      cell(4, 9, 4, 1),                      // base
    ],
  },
  // Bisturi: cabo em escada e lâmina.
  CG: {
    solid: [
      cell(2, 9, 1, 1), cell(3, 8, 1, 1), cell(4, 7, 1, 1), cell(5, 6, 1, 1),
      cell(6, 5, 1, 1), cell(7, 4, 1, 1),
      cell(8, 2, 3, 2), cell(9, 1, 2, 1),    // lâmina
    ],
  },
  // Bebê: cabeça com dois olhos, tronco, braços e pernas.
  PD: {
    solid: [
      cell(3, 1, 6, 3),                      // cabeça
      cell(4, 5, 4, 3),                      // tronco
      cell(2, 5, 2, 1), cell(8, 5, 2, 1),    // braços
      cell(4, 8, 1, 2), cell(7, 8, 1, 2),    // pernas
    ],
    holes: [cell(4, 2, 1, 1), cell(7, 2, 1, 1)],
  },
  // Estetoscópio: olivas, tubos, junção e campânula.
  CM: {
    solid: [
      cell(2, 1, 1, 1), cell(9, 1, 1, 1),    // olivas
      cell(2, 2, 1, 3), cell(9, 2, 1, 3),    // tubos
      cell(3, 5, 1, 1), cell(8, 5, 1, 1),
      cell(4, 6, 4, 1),                      // junção
      cell(5, 7, 2, 1),                      // haste
      cell(4, 8, 4, 3),                      // campânula
    ],
  },
  // Escudo com cruz vazada, em degraus.
  MP: {
    solid: [cell(2, 1, 8, 4), cell(3, 5, 6, 2), cell(4, 7, 4, 2), cell(5, 9, 2, 1)],
    holes: [cell(5, 1, 2, 2), cell(3, 3, 6, 1), cell(5, 4, 2, 2)],
  },
  // Erlenmeyer: boca, gargalo, corpo alargando e bolhas.
  OU: {
    solid: [
      cell(4, 1, 4, 1),                      // boca
      cell(5, 2, 2, 3),                      // gargalo
      cell(4, 5, 4, 1), cell(3, 6, 6, 1), cell(2, 7, 8, 4),
    ],
    holes: [cell(3, 8, 1, 1), cell(5, 9, 2, 1), cell(7, 8, 1, 1)],
  },
} as Record<DisplayArea, { solid: string[]; holes?: string[] }>;

// Obstetrícia divide o desenho com Ginecologia: é a mesma especialidade, e o que
// as separa no produto é a sigla, não a silhueta.
GLYPHS.OB = GLYPHS.GO;

export function AreaIcon({
  area,
  size = 24,
  colored = true,
  variant = "code",
  className = "",
}: {
  area: string;
  size?: number;
  colored?: boolean;
  /**
   * `glyph` desenha; `code` escreve a sigla. O padrão é `code` de propósito —
   * quem quiser o desenho precisa ter olhado para o espaço disponível.
   */
  variant?: "glyph" | "code";
  className?: string;
}) {
  const displayArea = resolveDisplayArea(area);
  const color = colored ? (AREA_VAR[displayArea] ?? AREA_VAR.OU) : "currentColor";
  const label = AREA_FULL_LABELS[displayArea];

  if (variant === "glyph") {
    const glyph = GLYPHS[displayArea] ?? GLYPHS.OU;
    const d = [...glyph.solid, ...(glyph.holes ?? [])].join(" ");
    return (
      <span
        aria-hidden="true"
        title={label}
        className={`inline-flex shrink-0 items-center justify-center border ${className}`}
        style={{ width: size, height: size, color, borderColor: color }}
      >
        {/* O desenho ocupa ~70% da caixa: a moldura de 1px precisa de folga para
            não encostar no traço e virar mancha. */}
        <svg viewBox="0 0 24 24" className="h-[70%] w-[70%]" aria-hidden="true">
          <path d={d} fill="currentColor" fillRule="evenodd" />
        </svg>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      title={label}
      className={`inline-flex shrink-0 items-center justify-center border font-semibold uppercase leading-none tabular-nums ${className}`}
      style={{
        width: size,
        height: size,
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
