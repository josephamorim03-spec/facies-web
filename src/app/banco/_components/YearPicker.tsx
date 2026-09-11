"use client";

import { useMemo } from "react";
import type { QuestionBankYearStat } from "@/lib/api";

type YearPickerProps = {
  // Cross-filtered year facet: numeric years present in the current recorte plus
  // a { year: null } "sem ano" bucket. Counts react to the selected banca.
  yearStats: QuestionBankYearStat[];
  /**
   * No MODO PROVA, quantas questões a prova daquele ano teve.
   *
   * `yearStats` conta o índice de TREINO, que exclui anulada, desatualizada e
   * duplicata. O aluno via "2026 · 67" e escolhia uma prova de 100 — certo
   * para treino, errado num seletor que está escolhendo qual PROVA fazer.
   *
   * `null` fora do modo prova: ali o número do treino É o número certo.
   */
  tamanhoPorAnoDaProva?: Map<number, number> | null;
  /**
   * QUANDO A PROVA DAQUELE ANO CAIU — "out/2025" sob o "2026".
   *
   * A fonte rotula pela TURMA: a "ENARE 2026" foi aplicada em 20/10/2025,
   * porque o processo seletivo para ingresso em 2026 acontece no fim de 2025.
   * Quem lê "2026" entende "a prova deste ano" e se engana — relatado na tela
   * sobre uma prova que o aluno acreditava ainda não ter ocorrido.
   *
   * Ano sem entrada não ganha frase nenhuma: só 662 das 2.043 edições têm data
   * provada, e inventar `ano - 1` para as outras seria afirmar sem medir.
   */
  aplicacaoPorAnoDaProva?: Map<number, string> | null;
  selectedYears: number[];
  onSelectedYearsChange: (years: number[]) => void;
  includeNoYear: boolean;
  onIncludeNoYearChange: (value: boolean) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function YearPicker({
  yearStats,
  tamanhoPorAnoDaProva = null,
  aplicacaoPorAnoDaProva = null,
  selectedYears,
  onSelectedYearsChange,
  includeNoYear,
  onIncludeNoYearChange,
  loading = false,
  error = false,
  onRetry,
}: YearPickerProps) {
  const noYearCount = useMemo(
    () => yearStats.find((item) => item.year === null)?.question_count ?? 0,
    [yearStats],
  );

  const countByYear = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of yearStats) {
      if (item.year !== null) map.set(item.year, item.question_count);
    }
    // ⚠️ O tamanho da PROVA sobrepõe o do treino ANO A ANO, e nunca substitui o
    // mapa inteiro.
    //
    // A primeira versão fazia `return tamanhoPorAnoDaProva`, e no modo prova
    // esse mapa nasce VAZIO — as edições chegam por rede, depois. Resultado: ao
    // escolher a banca, a lista de anos SUMIA; e ficava sumida de vez numa
    // banca sem edição publicada. Relatado na tela em 2026-09-10.
    //
    // Quais anos existem é do `yearStats`; quantas questões cada um tem é da
    // prova, onde ela souber. Ano que a prova não conhece continua ofertado com
    // a contagem do treino — que é o que a sessão de fato serviria ali.
    for (const [ano, tamanho] of tamanhoPorAnoDaProva ?? []) map.set(ano, tamanho);
    return map;
  }, [tamanhoPorAnoDaProva, yearStats]);

  // Show the union of available years and any still-selected year (which may have
  // dropped out of the facet after a banca change) so the user can always
  // deselect. Selected-but-unavailable years render with count 0.
  const numericYears = useMemo(() => {
    const set = new Set<number>(countByYear.keys());
    for (const year of selectedYears) set.add(year);
    return Array.from(set).sort((a, b) => b - a);
  }, [countByYear, selectedYears]);

  const selectedSet = useMemo(() => new Set(selectedYears), [selectedYears]);

  const selMin = selectedYears.length ? Math.min(...selectedYears) : undefined;
  const selMax = selectedYears.length ? Math.max(...selectedYears) : undefined;

  function selectRange(from: number, to: number) {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const inRange = numericYears.filter((year) => year >= lo && year <= hi);
    onSelectedYearsChange(inRange.sort((a, b) => b - a));
  }

  function toggleYear(year: number) {
    onSelectedYearsChange(
      selectedSet.has(year)
        ? selectedYears.filter((value) => value !== year)
        : [...selectedYears, year].sort((a, b) => b - a),
    );
  }

  const hasSelection = selectedYears.length > 0 || includeNoYear;

  return (
    <div className="space-y-3 border-t border-edge pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="paper-eyebrow">Ano da prova</p>
        <div className="flex items-center gap-3">
          {numericYears.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectedYearsChange(numericYears)}
              className="text-xs text-muted hover:text-ink"
            >
              Selecionar todos
            </button>
          )}
          {hasSelection && (
            <button
              type="button"
              onClick={() => {
                onSelectedYearsChange([]);
                onIncludeNoYearChange(false);
              }}
              className="text-xs text-muted hover:text-ink"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="fileira-de-controles" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-9 w-16 paper-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2 border border-danger/40 bg-paper px-3 py-2 text-xs text-danger">
          <span>Não foi possível carregar os anos.</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Tentar novamente
            </button>
          )}
        </div>
      ) : numericYears.length === 0 && noYearCount === 0 ? (
        <p className="paper-dashed px-3 py-4 text-center text-xs text-muted">
          Nenhum ano disponível com os filtros atuais.
        </p>
      ) : (
        <>
          {/* Faixa: quick contiguous selection. Derives its display from the
              current selection so it always reflects the chips below. */}
          {numericYears.length > 1 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-micro text-muted">
                De
                <select
                  value={selMin ?? ""}
                  onChange={(event) => {
                    const from = Number(event.target.value);
                    if (!from) return;
                    selectRange(from, selMax ?? from);
                  }}
                  className="min-h-[40px] rounded-control border border-edge bg-paper px-2 py-1.5 text-sm text-ink"
                  aria-label="Ano inicial da faixa"
                >
                  <option value="">—</option>
                  {numericYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-micro text-muted">
                Até
                <select
                  value={selMax ?? ""}
                  onChange={(event) => {
                    const to = Number(event.target.value);
                    if (!to) return;
                    selectRange(selMin ?? to, to);
                  }}
                  className="min-h-[40px] rounded-control border border-edge bg-paper px-2 py-1.5 text-sm text-ink"
                  aria-label="Ano final da faixa"
                >
                  <option value="">—</option>
                  {numericYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="fileira-de-controles">
            {numericYears.map((year) => {
              const selected = selectedSet.has(year);
              const count = countByYear.get(year) ?? 0;
              const quando = aplicacaoPorAnoDaProva?.get(year) ?? null;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => toggleYear(year)}
                  className={cx(
                    "km-chip min-h-[40px] tabular-nums",
                    selected && "km-chip-active",
                    count === 0 && !selected && "opacity-45",
                  )}
                  aria-pressed={selected}
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span>
                      {year}
                      <span className="ml-1 text-micro text-muted">{count}</span>
                    </span>
                    {quando !== null && (
                      <span className="text-micro text-muted">{quando}</span>
                    )}
                  </span>
                </button>
              );
            })}

            {noYearCount > 0 && (
              <button
                type="button"
                onClick={() => onIncludeNoYearChange(!includeNoYear)}
                className={cx("km-chip min-h-[40px] tabular-nums", includeNoYear && "km-chip-active")}
                aria-pressed={includeNoYear}
                title="Questões sem ano identificado na prova de origem"
              >
                Sem ano
                <span className="ml-1 text-micro text-muted">{noYearCount}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
