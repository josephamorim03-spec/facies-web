"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import {
  getMyObjectives,
  replaceMyObjectives,
  type ObjectiveDateStatus,
  type QuestionBankBoard,
  type StudentObjectiveInput,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";

/** Espelha `MAX_STUDENT_OBJECTIVES` no backend. */
const MAX_OBJECTIVES = 3;

const CONTROL =
  "paper-control min-h-11 w-full border border-edge bg-surface px-3 text-sm text-ink";

type Draft = {
  board_code: string;
  exam_name: string;
  exam_date: string;
  date_status: ObjectiveDateStatus;
};

type Props = {
  token: string;
  boards: QuestionBankBoard[];
};

/**
 * Objetivos do aluno: quais provas ele quer prestar, em que ordem e quando.
 *
 * É a única superfície de edição fora do onboarding — antes desta tela o aluno
 * não conseguia trocar a prova-alvo sem refazer o questionário inicial.
 *
 * A ordem da lista É a prioridade (1..3). Objetivos orientam horizonte e plano;
 * eles não alteram `priority_boards`, que continua sendo uma preferência
 * operacional independente do Banco de Questões (KROS-002).
 */
export function ObjectivesEditor({ token, boards }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMyObjectives(token);
      setDrafts(
        [...result.items]
          .sort((a, b) => a.priority - b.priority)
          .map((item) => ({
            board_code: item.board_code,
            exam_name: item.exam_name ?? "",
            exam_date: item.exam_date ?? "",
            date_status: item.date_status,
          })),
      );
      setRevision(result.selection_revision);
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível carregar seus objetivos."));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const boardName = useCallback(
    (code: string) => boards.find((b) => b.board_code === code)?.board_name ?? code,
    [boards],
  );

  const availableBoards = useMemo(() => {
    const taken = new Set(drafts.map((d) => d.board_code).filter(Boolean));
    return boards.filter((b) => !taken.has(b.board_code));
  }, [boards, drafts]);

  function mutate(next: Draft[]) {
    setDrafts(next);
    setSaved(false);
    setConflict(false);
  }

  function patch(index: number, patchValue: Partial<Draft>) {
    mutate(drafts.map((d, i) => (i === index ? { ...d, ...patchValue } : d)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= drafts.length) return;
    const next = [...drafts];
    [next[index], next[target]] = [next[target], next[index]];
    mutate(next);
  }

  function add() {
    if (drafts.length >= MAX_OBJECTIVES) return;
    mutate([
      ...drafts,
      { board_code: "", exam_name: "", exam_date: "", date_status: "estimated" },
    ]);
  }

  async function save() {
    if (saving) return;
    const items: StudentObjectiveInput[] = drafts
      .filter((d) => d.board_code.trim())
      .map((d) => ({
        board_code: d.board_code.trim().toUpperCase(),
        exam_name: d.exam_name.trim() || null,
        exam_date: d.exam_date || null,
        // Sem data não existe proximidade a declarar: o backend trata como
        // estimada e o peso do objetivo não recebe o fator de proximidade.
        date_status: d.exam_date ? d.date_status : "estimated",
      }));
    if (items.length === 0) {
      setError("Informe pelo menos uma prova-alvo.");
      return;
    }
    setSaving(true);
    setError(null);
    setConflict(false);
    try {
      const result = await replaceMyObjectives(token, items, revision);
      setRevision(result.selection_revision);
      setSaved(true);
    } catch (cause) {
      const message = getErrorMessage(cause, "Não foi possível salvar seus objetivos.");
      if (/409|conflit/i.test(message)) {
        setConflict(true);
        await load();
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-4 text-sm text-muted" role="status">
        Carregando seus objetivos…
      </p>
    );
  }

  return (
    <div className="mt-4">
      {conflict ? (
        <Alert variant="warning" onDismiss={() => setConflict(false)}>
          Seus objetivos mudaram em outro dispositivo. Recarregamos a lista — confira
          antes de salvar de novo.
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="danger" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {drafts.length === 0 ? (
        <p className="text-sm text-muted">
          Você ainda não definiu uma prova-alvo. Adicione a primeira para o cronograma
          saber o que priorizar.
        </p>
      ) : (
        <ol className="divide-y divide-edge" aria-label="Provas-alvo em ordem de prioridade">
          {drafts.map((draft, index) => (
            <li key={index} className="grid gap-3 py-4">
              <div className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-sm font-semibold text-muted">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {draft.board_code ? boardName(draft.board_code) : "Nova prova-alvo"}
                </span>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="p-2 text-muted hover:text-ink disabled:opacity-25"
                  aria-label={`Subir prioridade de ${draft.board_code || "nova prova"}`}
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === drafts.length - 1}
                  className="p-2 text-muted hover:text-ink disabled:opacity-25"
                  aria-label={`Descer prioridade de ${draft.board_code || "nova prova"}`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => mutate(drafts.filter((_, i) => i !== index))}
                  className="p-2 text-muted hover:text-danger"
                  aria-label={`Remover ${draft.board_code || "nova prova"}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-3 pl-9 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Instituição ou banca
                  </span>
                  <select
                    value={draft.board_code}
                    onChange={(event) => patch(index, { board_code: event.target.value })}
                    className={CONTROL}
                  >
                    <option value="">Selecione</option>
                    {draft.board_code ? (
                      <option value={draft.board_code}>{boardName(draft.board_code)}</option>
                    ) : null}
                    {availableBoards.map((board) => (
                      <option key={board.board_code} value={board.board_code}>
                        {board.board_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Nome da prova (opcional)
                  </span>
                  <input
                    type="text"
                    value={draft.exam_name}
                    onChange={(event) => patch(index, { exam_name: event.target.value })}
                    placeholder="ENARE 2026/2027"
                    className={CONTROL}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">
                    Data da prova
                  </span>
                  <input
                    type="date"
                    value={draft.exam_date}
                    onChange={(event) => patch(index, { exam_date: event.target.value })}
                    className={CONTROL}
                  />
                </label>

                {draft.exam_date ? (
                  <div className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">
                      Essa data já é oficial?
                    </span>
                    <SegmentedToggle
                      value={draft.date_status}
                      onChange={(value) => patch(index, { date_status: value })}
                      options={[
                        { value: "estimated", label: "Estimada" },
                        { value: "confirmed", label: "Confirmada" },
                      ]}
                      ariaLabel="Confiança na data da prova"
                      size="md"
                    />
                    <p className="mt-1 text-xs text-muted">
                      Data confirmada aproxima mais o cronograma da prova.
                    </p>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {drafts.length < MAX_OBJECTIVES ? (
          <Button variant="outline" size="sm" onClick={add} leftIcon={<Plus className="h-4 w-4" />}>
            Adicionar prova-alvo
          </Button>
        ) : (
          <p className="text-xs text-muted">Você pode acompanhar até {MAX_OBJECTIVES} provas.</p>
        )}
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Salvando…" : "Salvar objetivos"}
        </Button>
        {saved ? (
          <span className="text-xs text-positive" role="status">
            Objetivos salvos.
          </span>
        ) : null}
      </div>

    </div>
  );
}
