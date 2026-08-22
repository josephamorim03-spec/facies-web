"use client";

import { useEffect, useRef } from "react";

import { ToggleGroup } from "./ToggleGroup";
import { CadernoPesquisarSkeleton } from "./CadernoSkeletons";
import { Button } from "@/components/ui/Button";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import {
  AREA_COLORS,
  AREAS,
  type Area,
  rangeStyle,
  weightBadgeColor,
} from "../_lib/cadernoShared";
import type { SortTime, SortWeight } from "../_lib/cadernoShared";

interface CadernoPesquisarPanelProps {
  filterAreas: Set<Area>;
  onFilterAreasChange: (updater: (prev: Set<Area>) => Set<Area>) => void;
  filterTheme: string;
  onFilterThemeChange: (value: string) => void;
  sortTime: SortTime;
  onSortTimeChange: (value: SortTime) => void;
  sortWeight: SortWeight;
  onSortWeightChange: (value: SortWeight) => void;
  filterSourceType: string;
  onFilterSourceTypeChange: (value: string) => void;
  filterOutcome: string;
  onFilterOutcomeChange: (value: string) => void;
  filterWeightMin: number;
  onFilterWeightMinChange: (value: number) => void;
  filterFrom: string;
  onFilterFromChange: (value: string) => void;
  filterTo: string;
  onFilterToChange: (value: string) => void;
  onClearPeriod: () => void;
  searchLoading: boolean;
  onSearch: () => void;
  children?: React.ReactNode;
}

export function CadernoPesquisarPanel({
  filterAreas,
  onFilterAreasChange,
  filterTheme,
  onFilterThemeChange,
  sortTime,
  onSortTimeChange,
  sortWeight,
  onSortWeightChange,
  filterSourceType,
  onFilterSourceTypeChange,
  filterOutcome,
  onFilterOutcomeChange,
  filterWeightMin,
  onFilterWeightMinChange,
  filterFrom,
  onFilterFromChange,
  filterTo,
  onFilterToChange,
  onClearPeriod,
  searchLoading,
  onSearch,
  children,
}: CadernoPesquisarPanelProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div data-caderno-pesquisar-layout="true" className="w-full">
      <div className="w-full space-y-4 transition-opacity duration-200">
        {/* Filtros sempre visíveis */}
        <section
          data-caderno-pesquisar-panel="true"
          className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] md:pb-0"
        >
          {/* Área - colored pills matching registro style, multi-select */}
          <div data-caderno-pesquisar-area-picker="true" className="flex flex-wrap justify-center gap-1.5">
            {AREAS.map((a) => {
              const selected = filterAreas.has(a);
              const hasSelection = filterAreas.size > 0;
              const areaColor = AREA_COLORS[a];
              return (
                <button
                  type="button"
                  key={a}
                  onClick={() => onFilterAreasChange((prev) => {
                    const next = new Set(prev);
                    if (next.has(a)) next.delete(a); else next.add(a);
                    return next;
                  })}
                  aria-pressed={selected}
                  style={{
                    borderColor: areaColor,
                    backgroundColor: selected
                      ? `color-mix(in srgb, ${areaColor} 12%, var(--color-surface))`
                      : undefined,
                  }}
                  className={`min-h-[2.25rem] min-w-14 rounded-control border bg-surface px-2 py-1.5 text-center text-xs leading-none transition-[background-color,color] duration-150 hover:text-ink active:translate-y-px ${
                    selected
                      ? "font-semibold text-ink"
                      : hasSelection
                        ? "font-medium text-muted"
                        : "font-medium text-ink"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>

          {/* Tema */}
          <label className="sr-only" htmlFor="caderno-search-theme">Buscar por tema</label>
          <input
            ref={searchInputRef}
            id="caderno-search-theme"
            type="text"
            className="w-full rounded-control border border-edge bg-paper px-3 py-2 text-sm"
            placeholder="Buscar por tema"
            value={filterTheme}
            onChange={(e) => onFilterThemeChange(e.target.value)}
          />

          <p className="paper-eyebrow text-center">ORDENAR POR</p>

          {/* Tempo + Peso sort - lado a lado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleGroup<SortTime>
              label="Tempo:"
              options={[{ value: "recent", label: "+ Recentes" }, { value: "oldest", label: "+ Antigas" }]}
              value={sortTime}
              onChange={onSortTimeChange}
            />
            <ToggleGroup<SortWeight>
              label="Peso:"
              options={[{ value: "desc", label: "Maior" }, { value: "asc", label: "Menor" }]}
              value={sortWeight}
              onChange={onSortWeightChange}
            />
          </div>

          <div className="space-y-4 border-t border-edge pt-4">
            {/* Origem */}
            <div className="space-y-1">
              <p className="paper-eyebrow">Origem</p>
              <div className="flex gap-1 flex-wrap">
                {([["", "Todas"], ["question", "Questão"], ["reading", "Leitura"]] as [string, string][]).map(([v, l]) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => {
                      onFilterSourceTypeChange(v);
                      if (v !== "question") onFilterOutcomeChange("");
                    }}
                    className={`border px-3 py-1.5 text-xs transition-colors ${filterSourceType === v ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted hover:border-primary hover:text-ink"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado - só aparece se origem = questão */}
            {filterSourceType === "question" && (
              <div className="space-y-1">
                <p className="paper-eyebrow">Resultado</p>
                <div className="flex gap-1 flex-wrap">
                  {([["", "Todos"], ["incorrect", "Erro"], ["correct", "Acerto"]] as [string, string][]).map(([v, l]) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => onFilterOutcomeChange(v)}
                      className={`border px-3 py-1.5 text-xs transition-colors ${filterOutcome === v ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted hover:border-primary hover:text-ink"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Peso mínimo com slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="paper-eyebrow">Peso a partir de</p>
                <span
                  className="border bg-surface px-1 py-0.5 text-xs font-semibold tabular-nums"
                  style={{ borderColor: weightBadgeColor(filterWeightMin), color: weightBadgeColor(filterWeightMin) }}
                >
                  {filterWeightMin}
                </span>
              </div>
              <input
                type="range" min={1} max={10} value={filterWeightMin}
                onChange={(e) => onFilterWeightMinChange(Number(e.target.value))}
                aria-label="Peso mínimo"
                aria-valuetext={`a partir de ${filterWeightMin} de 10`}
                className="w-full"
                style={rangeStyle(filterWeightMin, 1, 10)}
              />
              <div className="flex justify-between text-xs text-muted">
                <span>1</span><span>10</span>
              </div>
            </div>

            {/* Data de / até - Limpar único abaixo */}
            <div className="space-y-2 w-full max-w-full overflow-x-hidden">
              <p className="paper-eyebrow">Período</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full max-w-full items-start">
                <div className="space-y-1 w-full min-w-0">
                  <p className="text-xs text-muted">De</p>
                  <div className="overflow-hidden rounded-control border border-edge bg-paper focus-within:border-primary">
                    <input
                      type="date"
                      className="block w-full border-0 bg-transparent px-3 py-2 text-sm outline-none"
                      value={filterFrom}
                      onChange={(e) => onFilterFromChange(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1 w-full min-w-0">
                  <p className="text-xs text-muted">Até</p>
                  <div className="overflow-hidden rounded-control border border-edge bg-paper focus-within:border-primary">
                    <input
                      type="date"
                      className="block w-full border-0 bg-transparent px-3 py-2 text-sm outline-none"
                      value={filterTo}
                      onChange={(e) => onFilterToChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {(filterFrom || filterTo) && (
                <button
                  type="button"
                  onClick={onClearPeriod}
                  className="text-xs text-muted underline underline-offset-2 hover:text-ink"
                >
                  Limpar período
                </button>
              )}
            </div>
          </div>

          <BottomActionBar className="md:mt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={onSearch}
              loading={searchLoading}
              className="w-full sm:w-auto"
            >
              Pesquisar
            </Button>
          </BottomActionBar>
        </section>

        {children}
      </div>
    </div>
  );
}

export function CadernoPesquisarSkeletonPanel() {
  return (
    <div data-caderno-pesquisar-layout="true" className="w-full">
      <div className="w-full space-y-4">
        <CadernoPesquisarSkeleton />
      </div>
    </div>
  );
}
