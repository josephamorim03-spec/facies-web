"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/Skeleton";
import { getAPIErrorDetail } from "@/lib/api";
import { listQuestionBankBoards } from "@/lib/api/domains/question-bank";
import type { QuestionBankBoard } from "@/lib/api/domains/question-bank/types";
import {
  getMyTargetExam,
  replaceMyTargetExam,
  type StudentTargetExamInput,
} from "@/lib/api/domains/study-plan";
import { getErrorMessage } from "@/lib/error-utils";

const MAX_TARGET_EXAMS = 3;
const VISIBLE_BOARDS = 40;

type Selected = StudentTargetExamInput & { board_name: string | null };

type Props = {
  token: string;
  mode: "preferences" | "onboarding";
  onSaved?: () => void;
};

function formatCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

function yearRange(board: QuestionBankBoard): string | null {
  const first = board.first_year;
  const last = board.last_year;
  if (!first && !last) return null;
  if (first && last && first !== last) return `${first}–${last}`;
  return String(last ?? first);
}

export function TargetExamSelector({ token, mode, onSaved }: Props) {
  const [selected, setSelected] = useState<Selected[]>([]);
  const [boards, setBoards] = useState<QuestionBankBoard[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Em paralelo: a lista de bancas não depende da seleção atual, e
      // encadear as duas dobraria o tempo de tela em branco.
      const [current, available] = await Promise.all([
        getMyTargetExam(token),
        listQuestionBankBoards(token),
      ]);
      const byCode = new Map(available.map((board) => [board.board_code, board]));
      setSelected(
        [...current.items]
          .sort((a, b) => a.priority - b.priority)
          .map((item) => ({
            board_code: item.board_code,
            exam_name: item.exam_name,
            exam_date: item.exam_date,
            board_name: byCode.get(item.board_code)?.board_name ?? null,
          })),
      );
      setRevision(current.selection_revision);
      setBoards(available);
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível carregar sua prova alvo."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCodes = useMemo(
    () => new Set(selected.map((item) => item.board_code)),
    [selected],
  );

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return boards
      .filter((board) => !selectedCodes.has(board.board_code))
      .filter(
        (board) =>
          !term ||
          board.board_name.toLowerCase().includes(term) ||
          board.board_code.toLowerCase().includes(term),
      )
      .slice(0, VISIBLE_BOARDS);
  }, [boards, query, selectedCodes]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function add(board: QuestionBankBoard) {
    if (selected.length >= MAX_TARGET_EXAMS) return;
    setSaved(false);
    setSelected([
      ...selected,
      { board_code: board.board_code, exam_name: null, exam_date: null, board_name: board.board_name },
    ]);
    setQuery("");
  }

  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    setSaved(false);
    setSelected(next);
  }

  function patch(index: number, changes: Partial<Selected>) {
    setSaved(false);
    setSelected(selected.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setConflict(false);
    try {
      const result = await replaceMyTargetExam(
        token,
        selected.map((item) => ({
          board_code: item.board_code,
          exam_name: item.exam_name?.trim() || null,
          exam_date: item.exam_date || null,
        })),
        revision,
      );
      setRevision(result.selection_revision);
      setSaved(true);
      onSaved?.();
    } catch (cause) {
      const detail = getAPIErrorDetail(cause);
      if (detail?.code === "objective_selection_revision_conflict") {
        setConflict(true);
        await load();
      } else {
        setError(getErrorMessage(cause, "Não foi possível salvar sua prova alvo."));
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 space-y-3" aria-busy="true">
        <Skeleton className="h-4 w-56 rounded-control" />
        <Skeleton className="h-14 w-full rounded-surface" />
        <Skeleton className="h-14 w-full rounded-surface" />
        <Skeleton className="h-11 w-40 rounded-surface" />
      </div>
    );
  }

  // Banco sem banca publicada é o único estado em que esta tela não tem o que
  // oferecer. Dizer isso é melhor do que mostrar uma busca que nunca acha nada.
  if (!boards.length && !selected.length) {
    return (
      <Alert variant="info" className="mt-4">
        O banco de questões ainda não tem provas publicadas para escolher como alvo.
      </Alert>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      {!online ? (
        <Alert variant="warning">Você está offline. A prova alvo fica somente para leitura.</Alert>
      ) : null}
      {conflict ? (
        <Alert variant="warning" onDismiss={() => setConflict(false)}>
          Outra aba alterou sua prova alvo. Recarregamos a versão mais recente; confira antes de salvar.
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="danger" onDismiss={() => setError(null)}>{error}</Alert>
      ) : null}

      {selected.length ? (
        <ol className="divide-y divide-edge" aria-label="Provas alvo em ordem de prioridade">
          {selected.map((item, index) => (
            <li key={item.board_code} className="space-y-3 py-4">
              <div className="flex items-start gap-3">
                <span className="w-6 shrink-0 pt-0.5 text-sm font-semibold text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{item.board_name ?? item.board_code}</p>
                  <p className="mt-1 text-xs text-muted">{item.board_code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || !online}
                  className="p-2 text-muted disabled:opacity-25"
                  aria-label={`Subir ${item.board_name ?? item.board_code}`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === selected.length - 1 || !online}
                  className="p-2 text-muted disabled:opacity-25"
                  aria-label={`Descer ${item.board_name ?? item.board_code}`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaved(false);
                    setSelected(selected.filter((_, i) => i !== index));
                  }}
                  disabled={!online}
                  className="p-2 text-muted hover:text-danger disabled:opacity-25"
                  aria-label={`Remover ${item.board_name ?? item.board_code}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="ml-9 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-muted">
                  Nome da prova (opcional)
                  <input
                    type="text"
                    value={item.exam_name ?? ""}
                    onChange={(event) => patch(index, { exam_name: event.target.value })}
                    disabled={!online}
                    maxLength={160}
                    placeholder="ex.: acesso direto 2027"
                    className="paper-control mt-1 min-h-10 w-full border border-edge bg-surface px-3 text-sm text-ink"
                  />
                </label>
                <label className="text-xs text-muted">
                  Data da prova (opcional)
                  <input
                    type="date"
                    value={item.exam_date ?? ""}
                    min={today}
                    onChange={(event) => patch(index, { exam_date: event.target.value })}
                    disabled={!online}
                    className="paper-control mt-1 min-h-10 w-full border border-edge bg-surface px-3 text-sm text-ink"
                  />
                </label>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">
          Nenhuma prova alvo definida. Sem ela, suas sessões distribuem as questões pela
          incidência histórica do banco.
        </p>
      )}

      {selected.length < MAX_TARGET_EXAMS ? (
        <div className="space-y-3 border-t border-edge pt-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque a prova ou instituição"
            aria-label="Buscar prova alvo"
            className="paper-control min-h-11 w-full border border-edge bg-surface px-3 text-sm text-ink"
          />
          {matches.length ? (
            <ul className="divide-y divide-edge border-y border-edge">
              {matches.map((board) => {
                const years = yearRange(board);
                return (
                  <li key={board.board_code} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{board.board_name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatCount(board.question_count)} questões
                        {years ? ` · ${years}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!online}
                      onClick={() => add(board)}
                    >
                      Adicionar
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              {query.trim()
                ? "Nenhuma prova encontrada para esta busca."
                : "Todas as provas disponíveis já estão na sua lista."}
            </p>
          )}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          onClick={() => void save()}
          loading={saving}
          disabled={!online || selected.length === 0}
        >
          {mode === "onboarding" ? "Salvar e continuar" : "Salvar prova alvo"}
        </Button>
        {saved ? (
          <span className="text-xs text-positive" role="status">
            Prova alvo salva.
          </span>
        ) : null}
      </div>
    </div>
  );
}
