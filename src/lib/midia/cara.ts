import { createElement as h } from "react";
import type { ReactElement } from "react";

import { PALETA, type Numero } from "@/lib/cartao";
import { HOST_VISIVEL, SITE_QUALIFICADOR } from "@/lib/site";

/**
 * O cartão "cara da prova" — fonte ÚNICA do layout da peça.
 *
 * ## Por que `createElement` e não JSX
 *
 * Este módulo é consumido por DOIS lugares: a rota `/midia/[peca]/[slug]` (que o
 * Next compila) e o smoke test `scripts/smoke-midia-peca.mjs` (que roda em Node
 * puro, sem transformador de JSX). `createElement` é o único formato que os dois
 * conseguem importar — JSX aqui faria o smoke test não conseguir parsear o
 * arquivo, e a rota voltaria a ter uma cópia do layout. Duas cópias de layout é
 * exatamente o defeito que `lib/cartao.ts` já registra ter corrigido entre a
 * página e o cartão de Open Graph.
 *
 * Satori renderiza o mesmo elemento, venha de JSX ou de `createElement`: os dois
 * produzem a mesma árvore React. A prova de píxel (`pixel-*.png`) foi gerada com
 * esta função.
 */

const { PAPEL, TINTA, FRACA, MARCA, LINHA } = PALETA;

export type CartaoCaraProps = {
  titulo: string;
  legenda: string;
  numeros: Numero[];
  /** Caminho público da prova/banca — aparece no rodapé como o link da peça. */
  caminho: string;
  largura: number;
  altura: number;
};

export function renderCara({
  titulo,
  legenda,
  numeros,
  caminho,
  largura,
  altura,
}: CartaoCaraProps): ReactElement {
  const vertical = altura > largura;
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPEL,
        color: TINTA,
        padding: vertical ? "88px 72px" : "56px 64px",
      },
    },
    h("div", { style: { display: "flex", fontSize: vertical ? 24 : 20, color: FRACA, letterSpacing: 2 } }, "A FÁCIES DA PROVA"),
    h(
      "div",
      {
        style: {
          display: "flex",
          fontSize: vertical ? 68 : 56,
          fontWeight: 700,
          marginTop: 14,
          lineHeight: 1.15,
          maxWidth: "100%",
        },
      },
      titulo,
    ),
    h("div", { style: { display: "flex", fontSize: vertical ? 24 : 20, color: FRACA, marginTop: 12 } }, legenda),
    h(
      "div",
      {
        style: {
          display: "flex",
          flex: 1,
          flexDirection: vertical ? "column" : "row",
          gap: vertical ? 40 : 28,
          marginTop: vertical ? 64 : 44,
        },
      },
      ...numeros.map((numero) =>
        h(
          "div",
          {
            key: numero.rotulo,
            style: {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              ...(vertical
                ? { borderLeft: `3px solid ${MARCA}`, paddingLeft: 32 }
                : { borderTop: `3px solid ${MARCA}`, paddingTop: 22 }),
            },
          },
          h("div", { style: { display: "flex", fontSize: vertical ? 88 : 58, fontWeight: 700, color: MARCA, lineHeight: 1 } }, numero.valor),
          h("div", { style: { display: "flex", fontSize: vertical ? 30 : 22, fontWeight: 600, marginTop: 16, lineHeight: 1.3 } }, numero.rotulo),
          numero.nota
            ? h("div", { style: { display: "flex", fontSize: vertical ? 24 : 18, color: FRACA, marginTop: 8, lineHeight: 1.35 } }, numero.nota)
            : null,
        ),
      ),
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${LINHA}`,
          paddingTop: 20,
          fontSize: vertical ? 22 : 19,
          color: FRACA,
        },
      },
      h(
        "div",
        { style: { display: "flex" } },
        h("span", { style: { color: TINTA, fontWeight: 700 } }, "F"),
        h("span", { style: { color: MARCA, fontWeight: 700 } }, "á"),
        h("span", { style: { color: TINTA, fontWeight: 700 } }, "cies"),
        h("span", { style: { marginLeft: 10 } }, `· ${SITE_QUALIFICADOR}`),
      ),
      h("div", { style: { display: "flex" } }, `${HOST_VISIVEL}${caminho}`),
    ),
  );
}
