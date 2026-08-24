"use client";

import { useState } from "react";
import { PISO_N_CELULA } from "@/lib/facies";

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
 * ## A cor NÃO é por grande área, e isso é medido
 *
 * O protótipo colore por grande área. Tentei e não dá — ainda:
 * `mais_cai.linhas` é `{rotulo, n, exibivel}` e o dataset não tem NENHUM campo
 * de área, tema ou especialidade (conferido em todas as chaves). A única saída
 * seria inferir do texto com `inferAreaFromText`, e medi-la nos 2.115 assuntos
 * reais do acervo:
 *
 *     resolvidos: 502 de 2.115  (23,7%)
 *
 * Três em cada quatro células cairiam em cinza, e as falhas não são casos de
 * borda — "Arritmias Cardíacas", "Glomerulopatias", "Imunizações/Vacinação" e
 * "Rastreamento do câncer de colo do útero" não resolvem. Os padrões daquela
 * função são feitos para nomes de ÁREA, não para nomes clínicos. Colorir assim
 * erraria a maioria das células com aparência de autoridade, que é o defeito
 * que esta página menos pode ter.
 *
 * Então a intensidade acompanha a INCIDÊNCIA, que é o dado que temos. Quando o
 * `build_facies_dataset.py` (kbank) passar a emitir a grande área por assunto —
 * a relação existe no grafo, só não viaja no JSON — a cor troca de eixo em uma
 * linha e o mapa fica idêntico ao do protótipo.
 */

/** Quanto da tinta da marca entra na célula mais cobrada. */
const TINTA_MAX = 34;
/** E na menos cobrada, para nenhuma célula sumir no fundo. */
const TINTA_MIN = 8;

type Linha = { rotulo: string; n: number; exibivel: boolean };

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

export function MapaDaProva({ linhas }: { linhas: Linha[] }) {
  const [aberta, setAberta] = useState<string | null>(null);

  const ordenadas = [...linhas].sort((a, b) => b.n - a.n);
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
                title={linha.rotulo}
                className={`paper-control flex h-full w-full flex-col overflow-hidden rounded-control border p-2 text-left transition ${
                  // Tracejada = abaixo do piso, e é o mesmo estado que o
                  // protótipo usa para "ainda não avaliado". Aqui significa
                  // "não temos base para publicar o número", que é a mesma
                  // honestidade pelo outro lado.
                  linha.exibivel ? "border-edge" : "border-dashed border-edge"
                } ${estaAberta ? "outline outline-2 -outline-offset-2 outline-accent" : ""}`}
                style={{
                  background: `color-mix(in srgb, var(--color-primary) ${intensidade}%, var(--color-surface))`,
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
            <span className="text-muted">
              · {posicao}º assunto mais cobrado ·{" "}
              {escolhida.exibivel
                ? `${escolhida.n} questões`
                : `menos de ${PISO_N_CELULA} questões, abaixo do piso para publicar o número`}
            </span>
          </p>
        ) : (
          <p className="text-sm text-muted">
            O tamanho de cada bloco é a incidência do assunto nesta prova. Toque
            para ver a contagem. Bloco tracejado tem base abaixo do piso.
          </p>
        )}
      </div>
    </div>
  );
}
