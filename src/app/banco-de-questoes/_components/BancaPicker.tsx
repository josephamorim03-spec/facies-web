"use client";

import { useMemo, useState } from "react";
import type { QuestionBankBoard } from "@/lib/api";

type BancaPickerProps = {
  boards: QuestionBankBoard[];
  selected: string[];
  onChange: (codes: string[]) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function BancaPicker({
  boards,
  selected,
  onChange,
  loading = false,
  error = false,
  onRetry,
}: BancaPickerProps) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selected.map((c) => c.toUpperCase())), [selected]);
  const boardByCode = useMemo(
    () => new Map(boards.map((b) => [b.board_code.toUpperCase(), b])),
    [boards],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter(
      (b) =>
        b.board_name.toLowerCase().includes(q) || b.board_code.toLowerCase().includes(q),
    );
  }, [boards, query]);

  function toggle(code: string) {
    const upper = code.toUpperCase();
    if (selectedSet.has(upper)) {
      onChange(selected.filter((c) => c.toUpperCase() !== upper));
    } else {
      onChange([...selected, upper]);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-edge bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="banca-search" className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Banca / Instituição
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink"
          >
            Limpar ({selected.length})
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((code) => {
            const board = boardByCode.get(code.toUpperCase());
            return (
              <span key={code} className="km-chip">
                {board?.board_name ?? code}
                <button
                  type="button"
                  onClick={() => toggle(code)}
                  className="ml-0.5 text-muted hover:text-ink"
                  aria-label={`Remover ${board?.board_name ?? code}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        id="banca-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar banca (ex.: REVALIDA, USP, ENARE)…"
        className="w-full"
        autoComplete="off"
      />

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-surfaceMuted" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/40 bg-paper px-3 py-2 text-xs text-danger">
          <span>Não foi possível carregar as bancas.</span>
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
      ) : boards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-edge px-3 py-4 text-center text-xs text-muted">
          Nenhuma banca disponível.
        </p>
      ) : (
        <ul
          role="group"
          aria-label="Bancas disponíveis"
          className="max-h-64 space-y-1 overflow-y-auto pr-1"
        >
          {filtered.length === 0 ? (
            <li className="px-1 py-3 text-center text-xs text-muted">
              Nenhuma banca corresponde a “{query.trim()}”.
            </li>
          ) : (
            filtered.map((board) => {
              const checked = selectedSet.has(board.board_code.toUpperCase());
              return (
                <li key={board.board_code}>
                  <label
                    className={cx(
                      "flex min-h-[40px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition",
                      checked
                        ? "border-primary bg-[var(--amber-tint)]"
                        : "border-edge bg-paper hover:border-primary/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(board.board_code)}
                      className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">
                      {board.board_name}
                      {board.board_name.toUpperCase() !== board.board_code.toUpperCase() && (
                        <span className="ml-1 text-xs font-normal text-muted">{board.board_code}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">{board.question_count}</span>
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
