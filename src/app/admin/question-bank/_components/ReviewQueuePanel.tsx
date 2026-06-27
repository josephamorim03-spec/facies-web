import { useState } from "react";

import {
  type QuestionBankReviewQueueItem,
  type QuestionBankReviewResolutionAction,
  type QuestionBankReviewResolutionOptions,
} from "@/lib/api/domains/question-bank-admin";

import { truncateText } from "./adminQuestionBankUtils";

const ANSWER_OPTIONS = ["A", "B", "C", "D", "E"] as const;
const LANE_LABELS: Record<string, string> = {
  low_confidence: "Baixa confianca",
  structure_answer: "Estrutura/gabarito",
  student_report: "Reports de estudantes",
  image_ocr: "Imagem/OCR",
  topic_conflict: "Conflito de topico",
  pipeline_failure: "Falha de pipeline",
  editorial_review: "Revisao editorial",
};

type Props = {
  items: QuestionBankReviewQueueItem[];
  total: number;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onResolve: (
    questionId: string,
    action: QuestionBankReviewResolutionAction,
    options?: QuestionBankReviewResolutionOptions,
  ) => Promise<void>;
};

export default function ReviewQueuePanel({ items, total, onClose, onRefresh, onResolve }: Props) {
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState("");
  const [localError, setLocalError] = useState("");
  const groupedItems = items.reduce<Record<string, QuestionBankReviewQueueItem[]>>((acc, item) => {
    const lane = item.review_lane || "editorial_review";
    acc[lane] = [...(acc[lane] || []), item];
    return acc;
  }, {});
  const laneKeys = Object.keys(groupedItems).sort((a, b) => {
    const order = ["student_report", "structure_answer", "low_confidence", "topic_conflict", "image_ocr", "pipeline_failure", "editorial_review"];
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
  });

  async function submit(questionId: string, action: QuestionBankReviewResolutionAction) {
    const key = `${questionId}:${action}`;
    const reason = reasonDrafts[questionId]?.trim();
    const options: QuestionBankReviewResolutionOptions = {};
    if (reason) options.reason = reason;

    if (action === "override") {
      const answer = String(answerDrafts[questionId] ?? "").trim().toUpperCase();
      if (!ANSWER_OPTIONS.includes(answer as (typeof ANSWER_OPTIONS)[number])) {
        setLocalError("Escolha A, B, C, D ou E.");
        return;
      }
      options.patch = { canonical_answer: answer };
    }

    setBusyKey(key);
    setLocalError("");
    try {
      await onResolve(questionId, action, options);
      setAnswerDrafts((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      setReasonDrafts((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      await onRefresh();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">Revisao humana ({total})</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => void onRefresh()} className="text-xs font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300">
            Atualizar
          </button>
          <button onClick={onClose} className="text-xs font-semibold text-gray-400 hover:text-gray-600">Fechar</button>
        </div>
      </div>

      {localError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {localError}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          Nenhuma questao em revisao.
        </div>
      ) : null}

      {laneKeys.map((lane) => (
        <div key={lane} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              {LANE_LABELS[lane] || lane}
            </span>
            <span className="text-xs text-amber-700/70 dark:text-amber-200/70">
              {groupedItems[lane]?.length ?? 0}
            </span>
          </div>
          {groupedItems[lane]?.map((item) => {
        const blockers = item.publish_blockers ?? [];
        const alternatives = item.alternatives ?? {};
        const hasIssues = Object.keys(item.issues ?? {}).length > 0;
        return (
          <div key={item.question_id} className="rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-800/30 dark:bg-gray-900">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_210px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span>{item.question_id.slice(0, 12)}</span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    {item.status || "human_review_pending"}
                  </span>
                  {item.classification_confidence != null ? <span>conf. {item.classification_confidence.toFixed(2)}</span> : null}
                  {item.has_image ? <span>imagem</span> : null}
                  {item.open_reports ? <span>{item.open_reports} report(s)</span> : null}
                </div>
                {item.suggested_action || item.ai_read_summary?.adaptive_impact ? (
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                    {item.suggested_action ? <div><span className="font-semibold">Acao:</span> {item.suggested_action}</div> : null}
                    {item.ai_read_summary?.adaptive_impact ? <div className="mt-1"><span className="font-semibold">Impacto:</span> {item.ai_read_summary.adaptive_impact}</div> : null}
                  </div>
                ) : null}

                {blockers.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {blockers.map((blocker) => (
                      <span
                        key={`${item.question_id}-${blocker}`}
                        className="rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200"
                      >
                        {blocker}
                      </span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">
                  {truncateText(item.stem, 360) || "Sem enunciado"}
                </p>

                {Object.keys(alternatives).length > 0 ? (
                  <div className="mt-3 grid gap-1.5">
                    {Object.entries(alternatives).map(([letter, text]) => {
                      const isCorrect = String(item.answer || "").toUpperCase() === letter.toUpperCase();
                      return (
                        <div
                          key={`${item.question_id}-${letter}`}
                          className={`flex gap-2 rounded-md px-2 py-1 text-xs ${
                            isCorrect
                              ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          <span className="w-5 font-semibold">{letter}</span>
                          <span className="min-w-0 flex-1">{truncateText(String(text), 180)}</span>
                          {isCorrect ? <span className="font-semibold">gabarito</span> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {hasIssues ? (
                  <details className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <summary className="cursor-pointer font-semibold">Issues</summary>
                    <pre className="mt-2 overflow-auto rounded-lg bg-gray-950 p-3 text-gray-100">
                      {JSON.stringify(item.issues, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>

              <div className="grid content-start gap-2">
                <input
                  value={reasonDrafts[item.question_id] ?? ""}
                  onChange={(event) => setReasonDrafts((prev) => ({ ...prev, [item.question_id]: event.target.value }))}
                  placeholder="Razao"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-950"
                />
                <select
                  value={answerDrafts[item.question_id] ?? ""}
                  onChange={(event) => setAnswerDrafts((prev) => ({ ...prev, [item.question_id]: event.target.value }))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-950"
                >
                  <option value="">Gabarito</option>
                  {ANSWER_OPTIONS.map((answer) => (
                    <option key={answer} value={answer}>{answer}</option>
                  ))}
                </select>

                {([
                  ["override", "Corrigir", "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"],
                  ["approve", "Aprovar", "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"],
                  ["requeue", "Reenfileirar", "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300"],
                  ["discard", "Descartar", "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"],
                ] as const).map(([action, label, classes]) => (
                  <button
                    key={action}
                    disabled={Boolean(busyKey)}
                    onClick={() => void submit(item.question_id, action)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${classes}`}
                  >
                    {busyKey === `${item.question_id}:${action}` ? "..." : label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
          })}
        </div>
      ))}
    </div>
  );
}
