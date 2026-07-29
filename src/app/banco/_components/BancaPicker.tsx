"use client";

import { useMemo, useState } from "react";
import type { QuestionBankSourceOption } from "@/lib/api";

type SourceSelection = {
  boardCodes: string[];
  examCodes: string[];
  institutions: string[];
};

type BancaPickerProps = {
  sources: QuestionBankSourceOption[];
  selectedBoardCodes: string[];
  selectedExamCodes: string[];
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

/**
 * Mirrors kbank_source_token_norm: uppercase, strip accents, collapse
 * non-alphanumeric chars to "-", and trim edge dashes.
 */
function sourceTokenNorm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toggleKey(values: string[], key: string): string[] {
  const normalized = values.map(normalizeKey).filter(Boolean);
  return normalized.includes(key) ? normalized.filter((value) => value !== key) : [...normalized, key];
}

function optionId(option: QuestionBankSourceOption): string {
  return `${option.option_kind}:${normalizeKey(option.option_key)}`;
}

function sourceKindLabel(kind: QuestionBankSourceOption["option_kind"]): string {
  if (kind === "exam") return "Prova";
  if (kind === "board") return "Banca";
  return "Instituição";
}

const FINALITY_OPTION_KEYS = new Set(["ACESSO-DIRETO", "REVALIDA", "RPLUS"]);

export default function BancaPicker({
  sources,
  selectedBoardCodes,
  selectedExamCodes,
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
  const selectedExamSet = useMemo(
    () => new Set(selectedExamCodes.map(normalizeKey).filter(Boolean)),
    [selectedExamCodes],
  );
  const selectedInstitutionSet = useMemo(
    () => new Set(selectedInstitutions.map(normalizeKey).filter(Boolean)),
    [selectedInstitutions],
  );
  const selectedCount = selectedBoardSet.size + selectedExamSet.size + selectedInstitutionSet.size;

  const sourceById = useMemo(
    () => new Map(sources.map((source) => [optionId(source), source])),
    [sources],
  );

  const selectedChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; key: string; kind: QuestionBankSourceOption["option_kind"] }> = [];
    const seen = new Set<string>();
    for (const source of sources) {
      const key = normalizeKey(source.option_key);
      const selected = source.option_kind === "board"
        ? selectedBoardSet.has(key)
        : source.option_kind === "exam"
          ? selectedExamSet.has(key)
          : selectedInstitutionSet.has(key);
      if (!selected) continue;
      const id = optionId(source);
      seen.add(id);
      chips.push({ id, label: source.label, key, kind: source.option_kind });
    }
    for (const key of selectedBoardSet) {
      const id = `board:${key}`;
      if (!seen.has(id)) chips.push({ id, label: key, key, kind: "board" });
    }
    for (const key of selectedExamSet) {
      const id = `exam:${key}`;
      if (!seen.has(id)) chips.push({ id, label: key, key, kind: "exam" });
    }
    for (const key of selectedInstitutionSet) {
      const id = `institution:${key}`;
      if (!seen.has(id)) chips.push({ id, label: key, key, kind: "institution" });
    }
    return chips;
  }, [selectedBoardSet, selectedExamSet, selectedInstitutionSet, sources]);

  const dedupedSources = useMemo(() => {
    const byKey = new Map<string, QuestionBankSourceOption>();
    for (const source of sources) {
      const norm = sourceTokenNorm(source.option_key);
      if (!norm) continue;
      const existing = byKey.get(`${source.option_kind}:${norm}`);
      if (!existing) {
        byKey.set(`${source.option_kind}:${norm}`, { ...source, option_key: norm });
        continue;
      }
      const merged: QuestionBankSourceOption = {
        ...existing,
        question_count: existing.question_count + source.question_count,
        first_year: [existing.first_year, source.first_year]
          .filter((year): year is number => year != null)
          .reduce<number | undefined>((min, year) => (min === undefined ? year : Math.min(min, year)), undefined),
        last_year: [existing.last_year, source.last_year]
          .filter((year): year is number => year != null)
          .reduce<number | undefined>((max, year) => (max === undefined ? year : Math.max(max, year)), undefined),
        label: source.question_count > existing.question_count ? source.label : existing.label,
      };
      byKey.set(`${source.option_kind}:${norm}`, merged);
    }
    return Array.from(byKey.values());
  }, [sources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dedupedSources;
    return dedupedSources.filter((source) => (
      source.label.toLowerCase().includes(q)
      || source.option_key.toLowerCase().includes(q)
      || sourceKindLabel(source.option_kind).toLowerCase().includes(q)
    ));
  }, [dedupedSources, query]);

  function isSelected(source: QuestionBankSourceOption): boolean {
    const key = normalizeKey(source.option_key);
    if (source.option_kind === "board") return selectedBoardSet.has(key);
    if (source.option_kind === "exam") return selectedExamSet.has(key);
    return selectedInstitutionSet.has(key);
  }

  function toggle(source: QuestionBankSourceOption) {
    const key = normalizeKey(source.option_key);
    if (!key) return;
    if (source.option_kind === "board") {
      onChange({ boardCodes: toggleKey(selectedBoardCodes, key), examCodes: selectedExamCodes, institutions: selectedInstitutions });
    } else if (source.option_kind === "exam") {
      onChange({ boardCodes: selectedBoardCodes, examCodes: toggleKey(selectedExamCodes, key), institutions: selectedInstitutions });
    } else {
      onChange({ boardCodes: selectedBoardCodes, examCodes: selectedExamCodes, institutions: toggleKey(selectedInstitutions, key) });
    }
  }

  function removeChip(chip: { key: string; kind: QuestionBankSourceOption["option_kind"] }) {
    if (chip.kind === "board") {
      onChange({
        boardCodes: selectedBoardCodes.filter((value) => normalizeKey(value) !== chip.key),
        examCodes: selectedExamCodes,
        institutions: selectedInstitutions,
      });
    } else if (chip.kind === "exam") {
      onChange({
        boardCodes: selectedBoardCodes,
        examCodes: selectedExamCodes.filter((value) => normalizeKey(value) !== chip.key),
        institutions: selectedInstitutions,
      });
    } else {
      onChange({
        boardCodes: selectedBoardCodes,
        examCodes: selectedExamCodes,
        institutions: selectedInstitutions.filter((value) => normalizeKey(value) !== chip.key),
      });
    }
  }

  return (
    <div className="space-y-3 border-t border-edge pt-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="source-search" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Prova / Banca / Instituição
        </label>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ boardCodes: [], examCodes: [], institutions: [] })}
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
        placeholder="Buscar prova, banca ou instituição"
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
            [
              {
                heading: "Finalidade",
                items: filtered.filter(
                  (source) =>
                    source.option_kind === "exam"
                    && FINALITY_OPTION_KEYS.has(normalizeKey(source.option_key)),
                ),
              },
              {
                heading: "Provas",
                items: filtered.filter(
                  (source) =>
                    source.option_kind === "exam"
                    && !FINALITY_OPTION_KEYS.has(normalizeKey(source.option_key)),
                ),
              },
              { heading: "Bancas", items: filtered.filter((source) => source.option_kind === "board") },
              { heading: "Instituições", items: filtered.filter((source) => source.option_kind === "institution") },
            ]
              .filter((section) => section.items.length > 0)
              .map((section, _idx, sections) => (
                <li key={section.heading} role="presentation">
                  {sections.length > 1 ? (
                    <p className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {section.heading}
                    </p>
                  ) : null}
                  <ul className="space-y-1">
                    {section.items.map((source) => {
                      const checked = isSelected(source);
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
                              {source.option_kind !== "institution" && source.label.toUpperCase() !== key ? (
                                <span className="block truncate text-xs text-muted">{key}</span>
                              ) : null}
                            </span>
                            <span className="flex shrink-0 items-center">
                              <span className="text-xs tabular-nums text-muted">{source.question_count}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
          )}
        </ul>
      )}
    </div>
  );
}
