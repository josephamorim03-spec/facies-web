"use client";

import { useMemo, useState } from "react";
import {
  analyzeSimulationErrors,
  createOperationalNote,
  getSimulationAnalysisResults,
  me,
  type AnalyzeSimulationErrorsResponse,
  type OperationalAreaCode,
  type QuestionAnalysisResult,
  type QuestionBankSession,
  type QuestionBankSessionItem,
} from "@/lib/api";
import { Alert } from "@/components/ui/Alert";

// Bound LLM cost/latency: only the most impactful misses are analyzed per run.
const MAX_WRONG = 8;
const AREAS: OperationalAreaCode[] = ["GO", "PD", "MP", "CG", "CM", "OU"];

function normalizeArea(value: string): OperationalAreaCode {
  return AREAS.includes(value as OperationalAreaCode) ? (value as OperationalAreaCode) : "OU";
}

function primaryTheme(item: QuestionBankSessionItem): string | null {
  const node = item.knowledge_nodes.find((n) => n.is_primary) ?? item.knowledge_nodes[0];
  return node?.node_name ?? null;
}

type Props = {
  token: string;
  session: QuestionBankSession;
  wrongItems: QuestionBankSessionItem[];
};

/**
 * Post-exam, opt-in: turns the student's errors into spaced-repetition flashcards using
 * the existing question-analysis algorithm (template + LLM). Cached-first to avoid
 * re-billing, capped to the top misses, and saved through the normal caderno/turbo path.
 * LLM runs only on an explicit click — never during the timed exam.
 */
export default function ErrorFlashcardsPanel({ token, session, wrongItems }: Props) {
  const [response, setResponse] = useState<AnalyzeSimulationErrorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const positionByQuestionId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of wrongItems) map.set(item.question_id, item.position);
    return map;
  }, [wrongItems]);

  const draftKey = (questionId: string, index: number) => `${questionId}_${index}`;
  const selectedCount = selected.size;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      // Cached-first: if this session was already analyzed, reuse it (no new LLM cost).
      const cached = await getSimulationAnalysisResults(token, session.session_id).catch(() => null);
      if (cached && cached.results.some((r) => r.caderno_drafts.length > 0)) {
        setResponse(cached);
        return;
      }
      const meData = await me(token);
      const wrong_questions = wrongItems
        .slice(0, MAX_WRONG)
        .filter((item) => item.selected_option && item.correct_answer)
        .map((item) => ({
          question_id: item.question_id,
          stem: item.stem,
          options: item.alternatives,
          marked_option: item.selected_option as string,
          correct_option: item.correct_answer as string,
          specialty: session.area ?? null,
          theme: primaryTheme(item) ?? session.theme ?? null,
          image_attachment_refs: item.image_refs ?? null,
        }));
      if (wrong_questions.length === 0) {
        setError("Sem questões elegíveis para análise.");
        return;
      }
      const out = await analyzeSimulationErrors(token, {
        user_id: meData.user_id,
        simulation_id: session.session_id,
        wrong_questions,
      });
      setResponse(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar os flashcards agora.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(key: string) {
    if (saved.has(key)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveForQuestion(result: QuestionAnalysisResult) {
    if (savingQuestion) return;
    const picks = result.caderno_drafts.filter((d) => selected.has(draftKey(result.question_id, d.flashcard_index)));
    if (picks.length === 0) return;
    setSavingQuestion(result.question_id);
    let ok = 0;
    let fail = 0;
    for (const draft of picks) {
      const key = draftKey(result.question_id, draft.flashcard_index);
      try {
        await createOperationalNote(
          token,
          {
            area: normalizeArea(draft.note_payload.area),
            theme: draft.note_payload.theme,
            source_type: draft.note_payload.source_type,
            question_outcome: draft.note_payload.question_outcome,
            insight_question: draft.note_payload.insight_question,
            body: draft.note_payload.body,
            weight: draft.note_payload.weight,
            question_id: draft.note_payload.question_id,
            external_links: draft.note_payload.external_links,
            attachment_refs: draft.note_payload.attachment_refs,
          },
          { idempotencyKey: `qb-draft-${result.question_id}-${draft.flashcard_index}` },
        );
        ok += 1;
        setSaved((prev) => new Set(prev).add(key));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } catch {
        fail += 1;
      }
    }
    setSavingQuestion(null);
    setFeedback((prev) => ({
      ...prev,
      [result.question_id]: fail === 0 ? `${ok} flashcard${ok === 1 ? "" : "s"} salvo${ok === 1 ? "" : "s"}.` : `${ok} salvos · ${fail} falharam.`,
    }));
  }

  const resultsWithDrafts = (response?.results ?? []).filter((r) => r.caderno_drafts.length > 0);

  return (
    <section className="rounded-lg border border-edge bg-surface p-4 shadow-[var(--soft-shadow)] md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">De erro para revisão ativa</p>
          <h3 className="mt-1 font-serif text-xl font-semibold leading-tight">Flashcards dos seus erros</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">A IA transforma os erros em perguntas de recall. Você escolhe o que realmente merece voltar no caderno.</p>
        </div>
        {!response && (
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105 disabled:opacity-50"
          >
            {loading ? "Analisando seus erros..." : "Gerar cards dos erros"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="danger" onDismiss={() => setError(null)}>{error}</Alert>
        </div>
      )}

      {response && resultsWithDrafts.length === 0 && (
        <p className="mt-3 text-sm text-muted">Nenhum flashcard sugerido para estes erros.</p>
      )}

      {resultsWithDrafts.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-edge bg-paper px-3 py-2">
            <p className="text-xs font-semibold text-ink">
              {selectedCount === 0 ? "Selecione os cards que valem revisar." : `${selectedCount} card${selectedCount === 1 ? "" : "s"} selecionado${selectedCount === 1 ? "" : "s"}.`}
            </p>
            <p className="text-xs text-muted">Salve só o que fecha uma lacuna real.</p>
          </div>
          {resultsWithDrafts.map((result) => {
            const position = positionByQuestionId.get(result.question_id);
            const selectedForQuestion = result.caderno_drafts.filter((d) => selected.has(draftKey(result.question_id, d.flashcard_index)));
            return (
              <div key={result.question_id} className="rounded-lg border border-edge bg-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  {position ? `Questão ${position}` : "Questão"}
                </p>
                <div className="mt-2 space-y-2">
                  {result.caderno_drafts.map((draft) => {
                    const key = draftKey(result.question_id, draft.flashcard_index);
                    const isSelected = selected.has(key);
                    const isSaved = saved.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        disabled={isSaved}
                        aria-pressed={isSelected}
                        className={`flex w-full gap-3 rounded-lg border p-3 text-left transition-colors ${
                          isSaved
                            ? "border-success/40 bg-surface opacity-70"
                            : isSelected
                              ? "border-primary bg-[var(--amber-tint)]"
                              : "border-edge bg-surface hover:border-primary"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                            isSaved
                              ? "border-success bg-success text-white"
                              : isSelected
                                ? "border-primary bg-primary text-primaryInk"
                                : "border-edge bg-paper text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">{draft.note_payload.insight_question}</span>
                          <span className="mt-1 block line-clamp-3 whitespace-pre-wrap text-xs text-muted">{draft.note_payload.body}</span>
                          {isSaved && <span className="mt-1 block text-xs font-semibold text-success">Salvo no caderno</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted">{feedback[result.question_id] ?? ""}</span>
                  <button
                    type="button"
                    onClick={() => void saveForQuestion(result)}
                    disabled={savingQuestion === result.question_id || selectedForQuestion.length === 0}
                    className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-surfaceMuted disabled:opacity-50"
                  >
                    {savingQuestion === result.question_id ? "Salvando..." : selectedForQuestion.length > 0 ? `Salvar ${selectedForQuestion.length}` : "Salvar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
