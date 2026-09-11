"use client";

import { useState } from "react";

import type { ActiveFilter } from "@/app/banco/_lib/sessionBuilder";

/**
 * A linha que diz quais filtros estão a valer — e como sair deles.
 *
 * ## O que faltava aqui
 *
 * ⚠️ Ela sabia LOCALIZAR e não sabia REMOVER. Tocar no chip rolava até o
 * controlo e piscava-o; nada nesta tela desfazia a escolha. Num acervo de 130
 * mil questões, filtrar até zero é o erro mais fácil de cometer, e o desenho
 * fixa a regra em letra: *"sem beco sem saída"*. O que o app entregava era a
 * frase seca **depois** do beco — "Nenhum assunto encontrado para os filtros
 * atuais" — sem nada que a desfizesse.
 *
 * Um "Limpar" aqui resolve todos os vazios da tela de uma vez, em vez de um
 * botão por vazio: enquanto houver filtro ativo, a saída está visível.
 *
 * ## Por que saiu da página
 *
 * `banco/page.tsx` está na catraca de tamanho, e isto é apresentação pura: ela
 * não decide nada, só desenha o que a página já calculou. O estado do menu
 * (aberto/fechado) mora aqui porque não interessa a mais ninguém.
 */
export function BarraDeFiltrosAtivos({
  filtros,
  onLocalizar,
  onLimpar,
}: {
  filtros: ActiveFilter[];
  onLocalizar: (filtro: ActiveFilter) => void;
  onLimpar: () => void;
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  if (filtros.length === 0) return null;

  return (
    /* A linha ganha rótulo e deixa de flutuar à direita: ela abria a tela com um
       chip solto no canto, sem nada que dissesse o que aquilo era. Os chips
       ficam onde estavam — muda o que a linha AFIRMA, não a geometria de
       toque. */
    <div className="flex w-full flex-col flex-wrap items-center gap-3 border-b border-edge pb-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <p className="paper-eyebrow">filtros ativos</p>
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            aria-expanded={menuAberto}
            aria-controls="question-bank-active-filters"
            aria-label={
              filtros.length === 1
                ? "1 filtro ativo: " + filtros[0].label + ". Toque para localizar."
                : filtros.length + " filtros ativos. Toque para visualizar."
            }
            onClick={() => {
              if (filtros.length === 1) {
                onLocalizar(filtros[0]);
                return;
              }
              setMenuAberto((aberto) => !aberto);
            }}
            className="min-h-11 bg-surfaceMuted px-3 text-xs text-muted transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {filtros.length === 1 ? filtros[0].label : filtros.length + " filtros"}
          </button>
          {menuAberto && filtros.length > 1 && (
            <div
              id="question-bank-active-filters"
              role="dialog"
              aria-label="Filtros ativos"
              className="absolute right-0 z-30 mt-2 w-72 rounded-control border border-edge bg-surface p-2 "
            >
              {filtros.map((filtro) => (
                <button
                  key={filtro.id}
                  type="button"
                  onClick={() => {
                    setMenuAberto(false);
                    onLocalizar(filtro);
                  }}
                  className="flex min-h-11 w-full items-center px-3 text-left text-sm font-medium text-ink hover:bg-surfaceMuted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {filtro.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setMenuAberto(false);
            onLimpar();
          }}
          className="min-h-11 px-3 text-xs text-muted underline underline-offset-4 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
