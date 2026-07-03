"use client";

import { useMemo, useState } from "react";
import type { QuestionBankSourceOption } from "@/lib/api";

type SourceSelection = {
  boardCodes: string[];
  institutions: string[];
};

type BancaPickerProps = {
  sources: QuestionBankSourceOption[];
  selectedBoardCodes: string[];
  selectedInstitutions: string[];
  onChange: (selection: SourceSelection) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeKey(value: string): string {
  return value.trim().toUpperCase();
}

function toggleKey(values: string[], key: string): string[] {
  const normalized = values.map(normalizeKey).filter(Boolean);
  return normalized.includes(key) ? normalized.filter((value) => value !== key) : [...normalized, key];
}

function optionId(option: QuestionBankSourceOption): string {
  return `${option.option_kind}:${normalizeKey(option.option_key)}`;
}

function sourceKindLabel(kind: QuestionBankSourceOption["option_kind"]): string {
  return kind === "board" ? "Prova" : "Instituição";
}

function formatYearRange(option: QuestionBankSourceOption): string | null {
  if (option.first_year && option.last_year && option.first_year !== option.last_year) {
    return `${option.first_year}-${option.last_year}`;
  }
  if (option.first_year || option.last_year) return String(option.first_year ?? option.last_year);
  return null;
}

export default function BancaPicker({
  sources,
  selectedBoardCodes,
  selectedInstitutions,
  onChange,
  loading = false,
  error = false,
  onRetry,
}: BancaPickerProps) {
  const [query, setQuery] = useState("");

  const selectedBoardSet = useMemo(
    () => new Set(selectedBoardCodes.map(normalizeKey).filter(Boolean)),
    [selectedBoardCodes],
  );
  const selectedInstitutionSet = useMemo(
    () => new Set(selectedInstitutions.map(normalizeKey).filter(Boolean)),
    [selectedInstitutions],
  );
  const selectedCount = selectedBoardSet.size + selectedInstitutionSet.size;

  const sourceById = useMemo(
    () => new Map(sources.map((source) => [optionId(source), source])),
    [sources],
  );

  const selectedChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; key: string; kind: QuestionBankSourceOption["option_kind"] }> = [];
    const seen = new Set<string>();
    for (const source of sources) {
      const key = normalizeKey(source.option_key);
      const selected =
        source.option_kind === "board" ? selectedBoardSet.has(key) : selectedInstitutionSet.has(key);
      if (!selected) continue;
      const id = optionId(source);
      seen.add(id);
      chips.push({ id, label: source.label, key, kind: source.option_kind });
    }
    for (const key of selectedBoardSet) {
      const id = `board:${key}`;
      if (!seen.has(id)) chips.push({ id, label: key, key, kind: "board" });
    }
    for (const key of selectedInstitutionSet) {
      const id = `institution:${key}`;
      if (!seen.has(id)) chips.push({ id, label: key, key, kind: "institution" });
    }
    return chips;
  }, [selectedBoardSet, selectedInstitutionSet, sources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((source) => {
      const yearRange = formatYearRange(source) ?? "";
      return (
        source.label.toLowerCase().includes(q) ||
        source.option_key.toLowerCase().includes(q) ||
        sourceKindLabel(source.option_kind).toLowerCase().includes(q) ||
        yearRange.includes(q)
      );
    });
  }, [sources, query]);

  function isSelected(source: QuestionBankSourceOption): boolean {
    const key = normalizeKey(source.option_key);
    return source.option_kind === "board" ? selectedBoardSet.has(key) : selectedInstitutionSet.has(key);
  }

  function toggle(source: QuestionBankSourceOption) {
    const key = normalizeKey(source.option_key);
    if (!key) return;
    if (source.option_kind === "board") {
      onChange({ boardCodes: toggleKey(selectedBoardCodes, key), institutions: selectedInstitutions });
    } else {
      onChange({ boardCodes: selectedBoardCodes, institutions: toggleKey(selectedInstitutions, key) });
    }
  }

  function removeChip(chip: { key: string; kind: QuestionBankSourceOption["option_kind"] }) {
    if (chip.kind === "board") {
      onChange({ boardCodes: selectedBoardCodes.filter((value) => normalizeKey(value) !== chip.key), institutions: selectedInstitutions });
    } else {
      onChange({ boardCodes: selectedBoardCodes, institutions: selectedInstitutions.filter((value) => normalizeKey(value) !== chip.key) });
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-edge bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="source-search" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Prova / Instituição
        </label>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ boardCodes: [], institutions: [] })}
            className="text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink"
          >
            Limpar ({selectedCount})
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedChips.map((chip) => (
            <span key={chip.id} className="km-chip max-w-full">
              <span className="min-w-0 truncate">{chip.label}</span>
              <span className="text-[10px] uppercase text-muted">{sourceKindLabel(chip.kind)}</span>
              <button
                type="button"
                onClick={() => removeChip(chip)}
                className="ml-0.5 text-muted hover:text-ink"
                aria-label={`Remover ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        id="source-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar prova ou instituição"
        className="w-full"
        autoComplete="off"
      />

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surfaceMuted" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/40 bg-paper px-3 py-2 text-xs text-danger">
          <span>Não foi possível carregar as fontes.</span>
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
      ) : sources.length === 0 ? (
        <p className="rounded-lg border border-dashed border-edge px-3 py-4 text-center text-xs text-muted">
          Nenhuma fonte disponível.
        </p>
      ) : (
        <ul
          role="group"
          aria-label="Fontes disponíveis"
          className="max-h-72 space-y-1 overflow-y-auto pr-1"
        >
          {filtered.length === 0 ? (
            <li className="px-1 py-3 text-center text-xs text-muted">
              Nenhuma fonte corresponde a &ldquo;{query.trim()}&rdquo;.
            </li>
          ) : (
            filtered.map((source) => {
              const checked = isSelected(source);
              const yearRange = formatYearRange(source);
              const key = normalizeKey(source.option_key);
              const savedSource = sourceById.get(optionId(source)) ?? source;
              return (
                <li key={optionId(source)}>
                  <label
                    className={cx(
                      "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
                      checked
                        ? "border-primary bg-[var(--amber-tint)]"
                        : "border-edge bg-paper hover:border-primary/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(savedSource)}
                      className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{source.label}</span>
                      <span className="block truncate text-xs text-muted">
                        {sourceKindLabel(source.option_kind)}
                        {source.option_kind === "board" && source.label.toUpperCase() !== key ? ` · ${key}` : ""}
                        {yearRange ? ` · ${yearRange}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{source.question_count}</span>
                  </label>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
