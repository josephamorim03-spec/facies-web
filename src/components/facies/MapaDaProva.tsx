"use client";

import { useState } from "react";
import { PISO_N_CELULA } from "@/lib/facies";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_VAR } from "@/lib/areaIdentity";

/**
 * O mapa da prova — cada célula é um assunto, o tamanho é a incidência.
 *
 * Portado do protótipo (`facies-site-v3.html`, seção "O mapa da prova"), com uma
 * diferença de propósito que muda o que ele encoda.
 *
 * ## O que o protótipo faz, e o que muda aqui
 *
 * Lá o mapa vive DEPOIS do diagnóstico e responde "onde EU estou fraco": o
 * preenchimento que sobe de baixo é o domínio do aluno, e "grande e vazia é a
 * sua maior lacuna". Aqui ele está na página anônima e responde a outra
 * pergunta — "o que ESTA BANCA cobra" — que não depende de dado do aluno
 * nenhum. Mesma forma, outro eixo.
 *
 * Por isso não há preenchimento por domínio: não existe aluno nesta tela. O que
 * sobrevive é o que o protótipo já fazia mais forte, e que a lista numerada não
 * fazia: **tamanho é incidência**, e a prova inteira cabe num olhar.
 *
 * ## A cor vem da MESMA fonte que a barra ao lado
 *
 * Por um tempo ela veio de um dicionário curado no frontend
 * (`lib/areaDoAssunto.ts`, 191 rótulos), porque o dataset não trazia a área do
 * assunto. Funcionava e estava errado por construção: virou uma SEGUNDA fonte de
 * verdade, e ela discordava do grafo do kbank em 12.103 questões.
 *
 * O efeito era visível na mesma tela. "Neoplasias do Sistema Digestivo" saía
 * laranja (Cirurgia) aqui no mapa e contava como Clínica Médica na barra logo
 * abaixo — mesmo assunto, mesma página, duas áreas. O mesmo valia para Esôfago,
 * Estômago, Pâncreas e Intestinos.
 *
 * Agora `build_facies_dataset.py` emite `area` em cada linha de `mais_cai`,
 * lida do `node_path` do nó primário — exatamente o campo que alimenta a
 * distribuição por área. Uma fonte, e o dicionário foi apagado.
 */

/** Quanto da tinta da marca entra na célula mais cobrada. */
const TINTA_MAX = 34;
/** E na menos cobrada, para nenhuma célula sumir no fundo. */
const TINTA_MIN = 8;

type Linha = {
  rotulo: string;
  n: number;
  exibivel: boolean;
  /** A grande área, vinda do MESMO grafo que alimenta a distribuição do painel
   *  ao lado. Ver o comentário sobre a fonte única, acima. */
  area?: string | null;
};

/**
 * O tamanho da célula, por posição no ranking.
 *
 * Por RANKING e não por valor absoluto: bancas têm bases de tamanhos muito
 * diferentes (90 questões no ENAMED, 2.483 na USP) e uma escala por `n` faria o
 * mapa da prova pequena nascer todo miúdo. O que o mapa compara é a prova
 * consigo mesma.
 */
function tamanho(indice: number): string {
  if (indice < 2) return "col-span-3 row-span-2 sm:col-span-2";
  if (indice < 6) return "col-span-3 sm:col-span-2";
  return "col-span-3 sm:col-span-1";
}

/**
 * Quantos assuntos a home mostra.
 *
 * O botão "Ver a fácies completa da USP-SP" levava a uma página com o laudo
 * IDÊNTICO ao da home — medido byte a byte: 1808 caracteres dos dois lados. A
 * palavra "completa" não entregava nada, e clicar era perda de tempo.
 *
 * O dataset tem 15 assuntos por banca e nem um a mais, então "completa" não pode
 * significar mais dado. Significa o RESTO do que já existe: a home mostra os 8
 * que decidem o estudo e a página da banca mostra os 15. É o mesmo corte que o
 * protótipo fazia com o botão "Ver as 15".
 */
const NA_HOME = 8;

export function MapaDaProva({
  linhas,
  limite,
}: {
  linhas: Linha[];
  /** Sem limite, mostra tudo — é o que a página da banca faz. */
  limite?: number;
}) {
  const [aberta, setAberta] = useState<string | null>(null);

  const todas = [...linhas].sort((a, b) => b.n - a.n);
  const ordenadas = limite ? todas.slice(0, limite) : todas;
  const escondidas = todas.length - ordenadas.length;
  if (ordenadas.length === 0) return null;

  const maior = ordenadas[0].n || 1;
  const escolhida = ordenadas.find((l) => l.rotulo === aberta) ?? null;
  const posicao = escolhida ? ordenadas.indexOf(escolhida) + 1 : 0;

  return (
    <div>
      {/* `auto-rows` fixo e `dense`: sem altura de linha fixa as células grandes
          esticariam o grid inteiro, e sem `dense` os buracos deixados pelas
          células de 2×2 não seriam preenchidos pelas pequenas. */}
      <ul className="grid grid-cols-6 gap-1 [grid-auto-flow:dense] [grid-auto-rows:4.5rem] sm:[grid-auto-rows:5rem]">
        {ordenadas.map((linha, indice) => {
          const area = linha.area ? resolveDisplayArea(null, linha.area) : null;
          const cor = area ? AREA_VAR[area] : "var(--color-primary)";
          const intensidade =
            TINTA_MIN + (linha.n / maior) * (TINTA_MAX - TINTA_MIN);
          const estaAberta = linha.rotulo === aberta;
          const grande = indice < 6;

          return (
            <li key={linha.rotulo} className={tamanho(indice)}>
              <button
                type="button"
                aria-expanded={estaAberta}
                onClick={() => setAberta(estaAberta ? null : linha.rotulo)}
                /* `aria-label` e nao `title`. O handoff nomeia este caso: "a
                   leitura do mapa fica FORA da grade; balao sobre grade some
                   atras do dedo no celular". O rotulo acessivel entrega a area
                   a quem ouve, e a cor do filete a entrega a quem ve — sem
                   caixa nenhuma por cima da celula. */
                aria-label={area ? `${linha.rotulo} — ${AREA_FULL_LABELS[area]}` : linha.rotulo}
                className={`paper-control flex h-full w-full flex-col overflow-hidden rounded-control border p-2 text-left transition ${
                  // Tracejada = abaixo do piso, e é o mesmo estado que o
                  // protótipo usa para "ainda não avaliado". Aqui significa
                  // "não temos base para publicar o número", que é a mesma
                  // honestidade pelo outro lado.
                  linha.exibivel ? "border-edge" : "border-dashed border-edge"
                } ${estaAberta ? "outline outline-2 -outline-offset-2 outline-accent" : ""}`}
                style={{
                  background: `color-mix(in srgb, ${cor} ${intensidade}%, var(--color-surface))`,
                  // O filete cheio na borda esquerda é o unico lugar onde a cor
                  // da area aparece SATURADA: como limite grafico o piso e 3:1,
                  // que a paleta entrega com folga. No preenchimento ela fica
                  // lavada, porque ali por cima vai texto.
                  borderLeftColor: cor,
                  borderLeftWidth: "3px",
                }}
              >
                {/* ⚠️ SEM `block` AQUI, e a razão é a mesma armadilha de sempre.
                    `block` e `line-clamp-*` definem os DOIS a propriedade
                    `display` — o clamp precisa de `-webkit-box`. Com as duas
                    classes na mesma lista, a que vier depois na folha ganha, e
                    na primeira renderização o clamp ficou inerte: "Complicações
                    da Insuficiência Hepática" ocupou três linhas e empurrou o
                    número para fora da célula, cortado ao meio.

                    O `min-h-0` é o par obrigatório do `flex-1`: item de flex
                    nasce com `min-height:auto` e se recusa a encolher abaixo do
                    conteúdo, então sem ele o clamp resolveria e o overflow
                    voltaria pelo outro lado. */}
                <span
                  className={`min-h-0 flex-1 hyphens-auto font-serif font-semibold leading-tight text-ink ${
                    grande
                      ? "line-clamp-3 text-sm sm:text-base"
                      : "line-clamp-2 text-micro sm:text-sm"
                  }`}
                >
                  {linha.rotulo}
                </span>
                {/* `shrink-0`: o número é a única coisa que não pode sumir —
                    ele é o dado, o resto é rótulo. */}
                {linha.exibivel ? (
                  <span className="mt-1 block shrink-0 font-mono text-micro tabular-nums text-ink">
                    {linha.n}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* A leitura fica FORA do mapa, como o `.mapa-read` do protótipo: dentro
          da célula não caberia, e balão sobre grade some atrás do dedo no
          celular — que é onde esta página é lida. */}
      <div
        aria-live="polite"
        className="mt-3 min-h-[3rem] border-t border-rule pt-3"
      >
        {escolhida ? (
          <p className="text-sm text-ink">
            <b className="font-semibold">{escolhida.rotulo}</b>{" "}
            {escolhida.area ? (
              <span className="text-muted">
                · {AREA_FULL_LABELS[resolveDisplayArea(null, escolhida.area)]}
              </span>
            ) : null}{" "}
            <span className="text-muted">
              · {posicao}º assunto mais cobrado ·{" "}
              {/* A GRAFIA É ÚNICA no produto inteiro, e há um guard sobre ela:
                  "menos de 5", "<5" e "3 de 5" já conviveram para a MESMA regra
                  e quem lia não tinha como saber que eram a mesma coisa.
                  A forma canônica é esta, em JSX — escrita dentro de template
                  literal (`${PISO_N_CELULA}`) ela deixa de casar com o guard,
                  que foi exatamente o que aconteceu aqui. */}
              {escolhida.exibivel ? (
                `${escolhida.n} questões`
              ) : (
                <>menos de {PISO_N_CELULA} questões — poucas para mostrar o número</>
              )}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted">
            O tamanho de cada bloco é o quanto o assunto cai nesta prova. Toque
            para ver quantas questões. Bloco tracejado apareceu poucas vezes.
            {escondidas > 0 ? (
              <>
                {" "}
                Há mais {escondidas} assuntos na leitura completa.
              </>
            ) : null}
          </p>
        )}
      </div>
    </div>
  );
}
