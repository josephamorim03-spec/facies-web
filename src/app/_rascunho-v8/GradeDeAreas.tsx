"use client";

import { useId, useState } from "react";
import { AREA_FULL_LABELS, AREA_VAR } from "@/lib/areaIdentity";
import { resolveDisplayArea } from "@/lib/areaDisplay";

/**
 * Cem quadrados, um por questão da edição medida.
 *
 * ## Por que quadrado contável, e não uma barra proporcional
 *
 * Uma barra esconde o balde: "sem especialidade classificada" vira uma fatia
 * cinza que ninguém lê. Com um quadrado por questão o leitor conta, confere, e o
 * balde aparece do mesmo tamanho que os outros — que é o que ele é.
 *
 * ## A ordem é AGRUPADA, e a tela diz isso
 *
 * ⚠️ Não afirmar "na ordem em que apareceram na prova". `provas.json` não carrega
 * a posição de cada questão, e ordenar assim seria inventar. Os quadrados vêm
 * agrupados por área, e a interação isola uma área — não desfaz uma ordem que o
 * dataset não tem.
 *
 * ## Estado, e não CSS puro
 *
 * A peça em `web/design/` faz este realce só com CSS (`radio` + `:has()`), o que
 * a mantém viva sem JS. Aqui é `useState`, por duas razões: `web/CLAUDE.md` manda
 * seguir o padrão local, que é o do `MapaDaProva`; e `:has()` em Tailwind exige
 * variante arbitrária em toda regra, o que troca uma linha de CSS por ruído.
 *
 * O conteúdo não depende disso: os cem quadrados, os rótulos e as contagens são
 * renderizados no servidor. Sem JS perde-se o realce, não a leitura.
 */
export function GradeDeAreas({
  linhas,
}: {
  linhas: { rotulo: string; qtd: number; pct: number }[];
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const legenda = useId();

  const total = linhas.reduce((s, l) => s + l.qtd, 0);

  return (
    <div>
      <p id={legenda} className="sr-only">
        Distribuição por grande área, em questões de um total de {total}:{" "}
        {linhas.map((l) => `${l.rotulo}, ${l.qtd}`).join("; ")}.
      </p>

      <ul className="m-0 list-none p-0" aria-describedby={legenda}>
        {linhas.map((linha) => {
          const area = resolveDisplayArea(null, linha.rotulo);
          const estaAberta = aberta === linha.rotulo;
          const apagada = aberta !== null && !estaAberta;
          return (
            <li
              key={linha.rotulo}
              className={`grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-rule
                py-2.5 transition first:border-t sm:grid-cols-[230px_1fr_3ch] sm:items-center sm:gap-4 ${
                  apagada ? "opacity-25" : "opacity-100"
                }`}
            >
              <button
                type="button"
                aria-pressed={estaAberta}
                onClick={() => setAberta(estaAberta ? null : linha.rotulo)}
                /* ⚠️ `sm:[grid-area:auto]` e não `sm:col-auto sm:row-auto`.
                   `col-span-full` define grid-column como 1/-1 — início E fim —,
                   então resetar só uma das pontas deixa o filho preso na linha
                   inteira e a linha estoura de altura. Foi o que o render mostrou,
                   e o typecheck não pegaria: `grid-area: auto` zera os quatro. */
                className="paper-control col-start-1 row-start-1 flex min-h-6 items-center rounded-control
                  text-left text-base text-ink focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-offset-2 focus-visible:outline-primary sm:[grid-area:auto]"
              >
                {/* O rótulo do balde é o que ele é, e não o nome de uma área.
                    "Outros" ao lado de seis especialidades sugere uma sétima. */}
                {linha.rotulo === "Outros" ? "sem especialidade classificada" : linha.rotulo}
              </button>

              {/* `aria-hidden`: a contagem já está no rótulo acessível e no número
                  ao lado. Cem elementos vazios num leitor de tela são cem ruídos. */}
              <span
                aria-hidden
                className="col-span-full row-start-2 mt-0.5 flex flex-wrap gap-0.5 sm:mt-0 sm:[grid-area:auto]"
              >
                {Array.from({ length: linha.qtd }, (_, i) => (
                  <i
                    key={i}
                    className="block h-[11px] w-[11px]"
                    style={{ background: AREA_VAR[area] }}
                  />
                ))}
              </span>

              <span className="col-start-2 row-start-1 text-right font-mono text-base font-medium tabular-nums sm:[grid-area:auto]">
                {linha.qtd}
                <span className="sr-only"> questões de {AREA_FULL_LABELS[area]}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {aberta ? (
        <button
          type="button"
          onClick={() => setAberta(null)}
          className="paper-control mt-3.5 inline-flex min-h-6 items-center rounded-control text-sm
            text-marcaViva underline underline-offset-4 focus-visible:outline focus-visible:outline-2
            focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          todas as áreas
        </button>
      ) : (
        <p className="mt-3.5 text-sm text-muted">Toque numa área para isolá-la.</p>
      )}
    </div>
  );
}
