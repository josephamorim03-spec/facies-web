import { createElement as h } from "react";
import type { ReactElement } from "react";

import { numerosDaBanca, numerosDaProva, PALETA, type Numero } from "@/lib/cartao";
import { dec } from "@/lib/decimal";
import { encurtar } from "@/lib/encurtar";
import { nomeCurto, type Banca } from "@/lib/facies";
import type { Prova } from "@/lib/provas";
import type { RevisaoFinal } from "@/lib/revisao";
import { HOST_VISIVEL, SITE_QUALIFICADOR } from "@/lib/site";

/**
 * Os cartões da central de mídia — a fonte ÚNICA do layout.
 *
 * ## Por que `createElement` e não JSX
 *
 * Este módulo é consumido por DOIS lugares: a rota `/midia/[peca]/[slug]` (que o
 * Next compila) e o smoke test `scripts/smoke-midia-peca.mjs` (que roda em Node
 * puro, sem transformador de JSX). `createElement` é o único formato que os dois
 * conseguem importar — JSX aqui faria o smoke test não conseguir parsear o
 * arquivo, e a rota voltaria a ter uma cópia do layout.
 *
 * `renderCara` e `renderRevisao` diferem SÓ no rótulo de topo; o resto é o mesmo
 * cartão (manchete, legenda, três números, rodapé). Duas funções finas sobre um
 * layout só — se o layout mudar, muda uma vez.
 */

const { PAPEL, TINTA, FRACA, MARCA, LINHA } = PALETA;

export type DadosDoCartao = {
  titulo: string;
  legenda: string;
  numeros: Numero[];
  /** Caminho público da prova/banca/ebook — aparece no rodapé como o link da peça. */
  caminho: string;
};

export type CartaoProps = DadosDoCartao & { largura: number; altura: number };

function renderCartao({
  eyebrow,
  titulo,
  legenda,
  numeros,
  caminho,
  largura,
  altura,
}: CartaoProps & { eyebrow: string }): ReactElement {
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
    h("div", { style: { display: "flex", fontSize: vertical ? 24 : 20, color: FRACA, letterSpacing: 2 } }, eyebrow),
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

/** A peça "cara da prova" — a fácies pública nos formatos do Instagram. */
export function renderCara(props: CartaoProps): ReactElement {
  return renderCartao({ ...props, eyebrow: "A FÁCIES DA PROVA" });
}

/** A peça "revisão" — o ebook da Revisão Final, grátis e sem cadastro. */
export function renderRevisao(props: CartaoProps): ReactElement {
  return renderCartao({ ...props, eyebrow: "REVISÃO FINAL · GRÁTIS" });
}

/**
 * Os dados do cartão da Revisão Final, derivados do ebook congelado.
 *
 * Fonte ÚNICA para a rota e o smoke test — e o mesmo cálculo que o Open Graph do
 * ebook já fazia. Os três números são os mesmos que a página publica e que o
 * registro sustenta; o lift carrega a faixa histórica ao lado, porque "3,4× o
 * acaso" sem a faixa seria o melhor caso posando de típico.
 */
export function dadosDaRevisao(revisao: RevisaoFinal, sigla: string, slug: string): DadosDoCartao {
  const h = revisao.honestidade;
  const total = revisao.estrutura.total_questoes;
  const dias = revisao.dias.length;
  const lift = h.lift !== null ? `${dec(h.lift, 1)}×` : "—";
  const faixa =
    h.historico_minimo !== null && h.historico_maximo !== null
      ? `medido · faixa ${dec(h.historico_minimo, 2)}–${dec(h.historico_maximo, 2)}×`
      : undefined;
  return {
    titulo: encurtar(`A última semana antes do ${sigla}`, 60),
    legenda: `${total} questões da própria base da prova, organizadas em ${dias} dias.`,
    numeros: [
      { valor: String(total), rotulo: "questões da base real da prova" },
      { valor: String(dias), rotulo: "assuntos mais prováveis, um por dia" },
      { valor: lift, rotulo: "o acaso", nota: faixa },
    ],
    caminho: `/prova/${slug}/revisao-final`,
  };
}

/** Um dado só — a família C do handoff: um número gigante e uma linha. */
export type DadoUnico = {
  sigla: string;
  valor: string;
  rotulo: string;
  nota?: string;
};

/**
 * O número mais memorável de uma prova ou banca — o lift para a prova (o "wow")
 * e o formato mais distintivo para a banca. Fonte ÚNICA: `numerosDaProva` e
 * `numerosDaBanca`, que já aplicam os filtros estatísticos (`formatosDistintivos`).
 */
export function dadoUnico(prova: Prova | undefined, banca: Banca | undefined): DadoUnico | undefined {
  if (prova) {
    const numeros = numerosDaProva(prova);
    const escolhido = numeros.find((n) => n.rotulo === "melhor que o acaso") ?? numeros[0];
    if (!escolhido) return undefined;
    return { sigla: prova.sigla, valor: escolhido.valor, rotulo: escolhido.rotulo, nota: escolhido.nota };
  }
  if (banca) {
    const numeros = numerosDaBanca(banca);
    const escolhido = numeros[0];
    if (!escolhido) return undefined;
    return { sigla: nomeCurto(banca), valor: escolhido.valor, rotulo: escolhido.rotulo, nota: escolhido.nota };
  }
  return undefined;
}

/** A peça "dado" — um número gigante, uma linha, nada mais. */
export function renderDado({
  sigla,
  valor,
  rotulo,
  nota,
  caminho,
  largura,
  altura,
}: DadoUnico & { caminho: string; largura: number; altura: number }): ReactElement {
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
        padding: vertical ? "120px 72px" : "72px 72px",
      },
    },
    h("div", { style: { display: "flex", fontSize: vertical ? 26 : 22, color: FRACA, letterSpacing: 2 } }, `${sigla} · um dado só`),
    h(
      "div",
      { style: { display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" } },
      h("div", { style: { display: "flex", fontSize: vertical ? 240 : 200, fontWeight: 700, color: MARCA, lineHeight: 1 } }, valor),
      h("div", { style: { display: "flex", fontSize: vertical ? 40 : 34, fontWeight: 600, marginTop: 24, lineHeight: 1.2 } }, rotulo),
      nota ? h("div", { style: { display: "flex", fontSize: vertical ? 30 : 24, color: FRACA, marginTop: 16, lineHeight: 1.4 } }, nota) : null,
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
