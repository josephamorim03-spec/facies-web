"use client";

import { useMemo } from "react";
import type { QuestionBankYearStat } from "@/lib/api";

type YearPickerProps = {
  // Cross-filtered year facet: numeric years present in the current recorte plus
  // a { year: null } "sem ano" bucket. Counts react to the selected banca.
  yearStats: QuestionBankYearStat[];
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
    return map;
  }, [yearStats]);

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
    <div className="space-y-3 rounded-xl border border-edge bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ano da prova</p>
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
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-9 w-16 animate-pulse rounded-full bg-surfaceMuted" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/40 bg-paper px-3 py-2 text-xs text-danger">
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
        <p className="rounded-lg border border-dashed border-edge px-3 py-4 text-center text-xs text-muted">
          Nenhum ano disponível com os filtros atuais.
        </p>
      ) : (
        <>
          {/* Faixa: quick contiguous selection. Derives its display from the
              current selection so it always reflects the chips below. */}
          {numericYears.length > 1 && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
                De
                <select
                  value={selMin ?? ""}
                  onChange={(event) => {
                    const from = Number(event.target.value);
                    if (!from) return;
                    selectRange(from, selMax ?? from);
                  }}
                  className="min-h-[40px] rounded-lg border border-edge bg-paper px-2 py-1.5 text-sm text-ink"
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
              <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
                Até
                <select
                  value={selMax ?? ""}
                  onChange={(event) => {
                    const to = Number(event.target.value);
                    if (!to) return;
                    selectRange(selMin ?? to, to);
                  }}
                  className="min-h-[40px] rounded-lg border border-edge bg-paper px-2 py-1.5 text-sm text-ink"
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

          <div className="flex flex-wrap gap-2">
            {numericYears.map((year) => {
              const selected = selectedSet.has(year);
              const count = countByYear.get(year) ?? 0;
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
                  {year}
                  <span className="ml-1 text-[10px] text-muted">{count}</span>
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
                <span className="ml-1 text-[10px] text-muted">{noYearCount}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
