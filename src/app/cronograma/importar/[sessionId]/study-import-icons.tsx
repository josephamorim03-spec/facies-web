"use client";

/**
 * Icones da importacao — reexportacao de `pixelarticons`.
 *
 * O `IconScissors` era o pior caso do repo: cinco circulos num icone de 24px,
 * tres deles com raio 0,8 (reticencias). Nesse tamanho um circulo de raio 0,8 e
 * uma mancha antisserrilhada, nao um ponto.
 *
 * `IconGrid` ja era quatro retangulos duros e continuaria correto — mas manter
 * um desenho proprio ao lado de dois importados garantiria que os tres
 * divergissem de novo na proxima mexida. Vem tudo da mesma fonte.
 */
export {
  Flag as IconFlagQuestion,
  Scissors as IconScissors,
  Grid2x22 as IconGrid,
} from "pixelarticons/react";
