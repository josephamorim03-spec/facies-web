"use client";

import { AREA_VAR } from "@/lib/areaIdentity";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import type { Peca } from "./mapaLayout";

/**
 * Uma peça do mapa.
 *
 * ⚠️ A CAIXA É A UNIDADE INDIVISÍVEL. Na versão anterior havia um `<button>` para
 * cada nó dos três grãos, empilhados — o clique nunca chegava ao pai, e cada
 * nível desenhava borda e filete, o que produzia três molduras encaixadas. Aqui
 * só o nível corrente é caixa; o que está DENTRO aparece como filete.
 */

/**
 * O nome do grão, com o substantivo colado.
 *
 * ⚠️ O SUBSTANTIVO É O PONTO. A versão anterior imprimia um número solto — que
 * por cima era um score [0,1] arredondado, então saía "0" ou "1" — e o operador
 * disse, com razão, que não ficava claro o que significava. Com a palavra ao
 * lado é impossível confundir com contagem de questões, que é o denominador que
 * este produto registra ter custado 12.103 questões quando foi confundido.
 */
function grao(quantos: number, tipo: string | null | undefined): string {
  const um = tipo === "specialty" ? "área" : tipo === "theme" ? "tema" : "assunto";
  const muitos = tipo === "specialty" ? "áreas" : tipo === "theme" ? "temas" : "assuntos";
  return `${quantos} ${quantos === 1 ? um : muitos}`;
}

/**
 * O nome acessível — e é o ÚNICO lugar da célula que fala em questões.
 *
 * ⚠️ Quem ouve não tem geometria. O tamanho da peça é a codificação principal do
 * mapa, e ela não se escuta; então o número vai aqui, sempre com o denominador
 * por extenso. É a regra que `FolhaDoAssunto` já impõe — "questões" sem dizer de
 * onde é o erro que este produto registra ter custado 12.103 questões.
 *
 * Isto substitui o `Math.round(peca.peso)` da versão anterior, que anunciava
 * literalmente "Insuficiência cardíaca, 0, praticar".
 */
function nomeAcessivel(peca: Peca, nomeDaBanca: string, marcado: boolean): string {
  if (peca.tipo === "cauda") {
    // A cauda também pode estar marcada: quando o tema que pede atenção é leve,
    // ele fica dobrado aqui dentro. Quem ouve precisa do mesmo aviso que quem vê.
    const pede = marcado ? "pede atenção, " : "";
    return `${pede}Mais ${grao(peca.quantos, peca.grao)} ${
      peca.quantos === 1 ? "menor" : "menores"
    }, abrir`;
  }
  // ⚠️ "COBRADAS PELA", e não "no acervo da" — a frase mudou de sujeito porque a
  // fonte mudou de população.
  //
  // Desde 2026-09-10 a árvore vem de `population: "exam"`: `question_count` é o
  // que a prova COBROU, e inclui anulada, duplicata e desatualizada. Dizer "no
  // acervo" sobre esse número seria a troca silenciosa de denominador que este
  // arquivo passa o tempo a evitar — e prometeria praticar 600 onde há 530.
  const n = peca.no.question_count ?? 0;
  const praticaveis = peca.no.servable_question_count ?? n;
  // ⚠️ O PARTICÍPIO ACOMPANHA O NÚMERO. A primeira versão escrevia "cobradas"
  // fixo, e o singular saía "1 questão cobradas pela UNIFESP" — erro de
  // concordância visível só para quem usa leitor de tela, que é exatamente
  // quem depende deste rótulo.
  const questoes = `${n} ${n === 1 ? "questão cobrada" : "questões cobradas"} pela ${nomeDaBanca}`;
  // Só quando divergem: repetir o mesmo número duas vezes é ruído para quem
  // ouve, e a igualdade é o caso comum na maioria dos nós.
  const paraPraticar =
    praticaveis < n
      ? `, ${praticaveis} ${praticaveis === 1 ? "disponível" : "disponíveis"} para praticar`
      : "";
  const dentro = peca.dentro > 0 ? `, ${grao(peca.dentro, filhoDe(peca))} dentro, aproximar` : ", praticar";
  // A marca é visual; quem ouve recebe a palavra. Sem isto, o modo "Atenção"
  // seria invisível no leitor de tela — e ele é a razão de a tela existir hoje.
  const atencao = marcado ? "pede atenção, " : "";
  return `${atencao}${peca.no.node_name}, ${questoes}${paraPraticar}${dentro}`;
}

/** O grão dos FILHOS de uma peça — é o que o rodapé e o rótulo acessível contam. */
function filhoDe(peca: Extract<Peca, { tipo: "no" }>): string {
  const meu = peca.no.node_type;
  if (meu === "specialty") return "theme";
  if (meu === "theme") return "subtheme";
  return "subtheme";
}

/** Abaixo disto o rodapé não cabe sem espremer o nome. */
const ALTURA_PARA_RODAPE = 52;

export function CelulaDoMapa({
  peca,
  nomeDaBanca,
  meu,
  marcado = false,
  onEntrar,
  onPraticar,
}: {
  peca: Peca;
  nomeDaBanca: string;
  meu?: { mastery: number; attempts: number };
  /** Está entre os que pedem atenção. Ver `prioridades()` em `mapaLayout`. */
  marcado?: boolean;
  onEntrar: (peca: Peca) => void;
  onPraticar: (assunto: string) => void;
}) {
  const ehCauda = peca.tipo === "cauda";
  const area = ehCauda
    ? "OU"
    : resolveDisplayArea(null, peca.no.node_path?.[0] ?? peca.no.node_name);
  const cor = AREA_VAR[area as keyof typeof AREA_VAR] ?? "var(--color-primary)";
  const folha = !ehCauda && peca.dentro === 0;

  // A tinta é o que FALTA, e ela chega em todos os níveis porque
  // `agregarDominio` rolou a proficiência para cima. Sem isso, raiz e tema
  // ficariam brancos e a legenda "quanto mais escuro, mais falta" seria falsa
  // em dois dos três níveis.
  const fundo = meu
    ? `color-mix(in srgb, ${cor} ${Math.round((1 - meu.mastery) * 55)}%, var(--color-surface))`
    : "var(--color-surface)";

  // A cauda diz tudo no título ("Mais 2 áreas"), então não repete no rodapé —
  // ela dizia "Mais 2 menores" em cima e "+ 2 assuntos" embaixo, com o
  // substantivo ERRADO, porque não sabia o grão dos irmãos que dobrou.
  const rodape = ehCauda ? null : peca.dentro > 0 ? grao(peca.dentro, filhoDe(peca)) : null;

  return (
    <button
      type="button"
      onClick={() => {
        if (ehCauda || !folha) onEntrar(peca);
        else onPraticar(peca.no.node_name);
      }}
      aria-label={nomeAcessivel(peca, nomeDaBanca, marcado)}
      className="paper-control relative flex h-full w-full flex-col justify-between overflow-hidden rounded-control border border-edge p-1.5 text-left transition-colors hover:border-muted"
      style={{ borderLeftWidth: 3, borderLeftColor: cor, background: fundo }}
    >
      {/* ══ A PRÉVIA — filetes, nunca caixas ═════════════════════════════════
          Mostra um degrau adiante sem entrar, e é o que torna FOLHA visível:
          célula lisa = fim do caminho. Filetes e não caixas de propósito — caixa
          dentro de caixa foi o que poluiu a versão anterior. */}
      {!ehCauda && peca.previa.length > 1 ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50">
          {peca.previa.slice(1).map((c, i) => (
            <span
              key={i}
              className="absolute border-l border-t border-rule"
              style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
            />
          ))}
        </span>
      ) : null}

      {/* `hyphens-auto` e `break-words` porque a taxonomia é cheia de palavra
          longa e única — "Gastroenterologia", "Endocrinologia" — que não tem
          onde quebrar e saía cortada no meio, sem reticência. É o mesmo par que
          `MapaDaProva` já usa nas células dele. */}
      {/* ══ A MARCA DE ATENÇÃO ═══════════════════════════════════════════════
          Quadrado de tinta no canto, como no projeto de design — é o que o mapa
          tem a dizer quando não há espaço para frase nenhuma.

          ⚠️ Ela NÃO é a única portadora: o mesmo item aparece na lista abaixo do
          mapa, com o porquê escrito. Marca sozinha seria cor/forma como único
          sinal, e este produto proíbe isso — quem não distingue a marca ficaria
          sem a informação. */}
      {marcado ? (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-2 w-2 shrink-0 bg-ink"
        />
      ) : null}

      <span className="relative line-clamp-3 hyphens-auto break-words font-serif text-nota leading-tight text-ink">
        {/* "Mais 1 área menores" saía com o adjetivo no plural e o substantivo
            no singular. O adjetivo concorda com a contagem, como tudo o mais. */}
        {ehCauda
          ? `Mais ${grao(peca.quantos, peca.grao)} ${peca.quantos === 1 ? "menor" : "menores"}`
          : peca.no.node_name}
      </span>

      {/* ⚠️ CONTAGEM DE TÓPICOS, e o substantivo vem colado. É o que ocupa o
          lugar onde ficava o "0". Impossível confundir com questão porque a
          palavra está ali — e o número de questões, esse, mora no nome acessível
          e na legenda do nível, os dois com o denominador por extenso. */}
      {rodape && peca.caixa.h >= ALTURA_PARA_RODAPE ? (
        <span className="relative font-mono text-micro text-muted">{rodape}</span>
      ) : null}
    </button>
  );
}
