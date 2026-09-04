"use client";

import { useState } from "react";
import { QUESTAO_EXEMPLO } from "./questaoExemplo";

/**
 * As nove medidas, demonstradas numa questão.
 *
 * Escolher uma medida realça, no enunciado, os trechos que ela enxerga. O
 * enunciado vem quebrado em FRAGMENTOS e a medida guarda os índices que realça —
 * assim o realce acontece sem `dangerouslySetInnerHTML`, que `web/CLAUDE.md`
 * proíbe.
 *
 * As descrições são AGNÓSTICAS: dizem o que a medida procura em qualquer questão,
 * não o que acontece nesta. A versão anterior trazia exemplos embutidos que
 * brigavam com o enunciado ao lado — um exemplo de SOP colado num caso de
 * diabetes, uma frase sobre caso longo ao lado de um caso curto.
 *
 * ⚠️ Duas medidas não realçam trecho nenhum: "tamanho do enunciado" lê o caso
 * inteiro e "formato da resposta" lê as alternativas. Elas pintam o bloco todo,
 * senão escolhê-las não daria retorno visível e pareceria defeito.
 */
export function NoveMedidas({
  contexto,
}: {
  contexto: { pctEsperado: number | null; pctMedido: number | null; baseFormato: number };
}) {
  const [ativa, setAtiva] = useState<string | null>(null);
  const q = QUESTAO_EXEMPLO;
  const medida = q.medidas.find((m) => m.id === ativa) ?? null;

  const realceEnunciado = ativa === "tamanho";
  const realceAlternativas = ativa === "formato" || ativa === "proximas";

  return (
    <section className="border-t border-rule bg-paper py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-[var(--gutter)]">
        <div className="max-w-[66ch]">
          <h2 className="mb-4 max-w-[22ch] font-sans font-semibold">
            A prova não cobra só o que você sabe
          </h2>
          <p className="mb-4">
            Cobra também do jeito dela — e o jeito é o que se repete.
            {contexto.pctEsperado !== null && contexto.pctMedido !== null ? (
              <>
                {" "}
                Aquele{" "}
                <span className="font-mono tabular-nums">
                  {contexto.pctEsperado.toLocaleString("pt-BR")}%
                </span>{" "}
                esperado não é a média do país: é <strong>ajustado pelos temas</strong> que esta
                prova cobra, para não confundir o jeito de perguntar com a matéria perguntada.
              </>
            ) : null}
          </p>
          <p className="text-base text-muted">
            <strong className="font-semibold text-ink">Toque numa medida</strong> para ver o que ela
            enxerga nesta questão.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          <div className="rounded-surface border border-rule bg-surface p-5 sm:p-6">
            <p className="m-0 font-mono text-micro text-muted">
              exemplo construído para esta página · não é questão de prova
            </p>
            <p
              className={`mt-3 font-serif text-lg leading-relaxed transition ${
                realceEnunciado ? "bg-warning/15" : ""
              }`}
            >
              {q.fragmentos.map((frag, i) => {
                const aceso = medida?.realca.includes(i) ?? false;
                return (
                  <span
                    key={i}
                    className={aceso ? "rounded-control bg-warning/25 shadow-[0_1px_0_var(--color-accent)]" : ""}
                  >
                    {frag}
                  </span>
                );
              })}
            </p>
            <ol className={`m-0 mt-4 list-none p-0 font-serif text-base transition ${
              realceAlternativas ? "bg-warning/15" : ""
            }`}>
              {q.alternativas.map((alt) => (
                <li key={alt.letra} className="grid grid-cols-[2.2ch_1fr] gap-2 py-1.5">
                  <b className="font-semibold">{alt.letra}</b>
                  <span>{alt.texto}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3.5 text-sm text-muted">
              Gabarito: <strong className="text-ink">{q.gabarito}</strong>. {q.comentario}
            </p>
          </div>

          <ul className="m-0 mt-5 list-none border-t border-rule p-0 sm:mt-0">
            {q.medidas.map((m) => {
              const acesa = ativa === m.id;
              return (
                <li
                  key={m.id}
                  className={`-mx-2 grid grid-cols-[1fr_auto] items-baseline gap-x-3.5 gap-y-0.5
                    border-b border-rule px-2 py-2.5 transition ${acesa ? "bg-warning/15" : ""}`}
                >
                  <button
                    type="button"
                    aria-pressed={acesa}
                    onClick={() => setAtiva(acesa ? null : m.id)}
                    className="paper-control col-start-1 row-start-1 flex min-h-6 items-center rounded-control
                      text-left font-sans text-base font-semibold focus-visible:outline
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {m.rotulo}
                  </button>
                  <b className="col-start-2 row-start-1 text-right font-mono text-sm font-medium tabular-nums">
                    {m.valor}
                  </b>
                  <span className="col-span-full row-start-2 text-sm text-muted">{m.descricao}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Métodos e limitações, na forma em que um artigo os coloca. */}
        <dl className="mt-7 max-w-[62ch] border-t-2 border-ink pt-[18px]">
          <dt className="mb-3 font-sans text-sm font-semibold">Como medimos</dt>
          <dd className="m-0 mb-2 text-base text-muted">
            — Questão por questão, por sistema automático de critério fixo
          </dd>
          <dd className="m-0 mb-2 text-base text-muted">
            — O formato sai de{" "}
            <span className="font-mono tabular-nums">
              {contexto.baseFormato.toLocaleString("pt-BR")}
            </span>{" "}
            questões classificadas; a série de assuntos, de outra base — e cada número diz de qual
          </dd>
          <dd className="m-0 text-base text-muted">
            — Das nove, esta prova só se distingue do esperado em uma. A outra que testamos ficou
            dentro da oscilação que a própria prova tem de um ano para o outro:{" "}
            <strong className="text-ink">não publicamos</strong>
          </dd>
        </dl>
      </div>
    </section>
  );
}
