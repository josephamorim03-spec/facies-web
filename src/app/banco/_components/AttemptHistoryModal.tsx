"use client";

import { useEffect, useState } from "react";
import {
  getQuestionAttemptHistory,
  type QuestionBankQuestionHistory,
} from "@/lib/api/domains/question-bank";
import { useAuthToken } from "@/lib/useAuthToken";
import { formatDurationMs } from "@/lib/formatDuration";

type AttemptHistoryModalProps = {
  questionId: string;
  onClose: () => void;
};

function formatAnsweredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} ${time}`;
}

function accuracyTone(ratio: number): string {
  if (ratio >= 0.7) return "text-success";
  if (ratio >= 0.5) return "text-warning";
  return "text-danger";
}

export default function AttemptHistoryModal({ questionId, onClose }: AttemptHistoryModalProps) {
  const { token } = useAuthToken();
  const [history, setHistory] = useState<QuestionBankQuestionHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getQuestionAttemptHistory(token, questionId)
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar histórico.");
      });
    return () => {
      active = false;
    };
  }, [token, questionId]);

  const stats = history?.stats;
  const ratio = stats && stats.attempt_count > 0 ? stats.correct_count / stats.attempt_count : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Histórico de respostas"
        className="flex max-h-[80vh] w-full max-w-md flex-col border border-edge bg-paper p-5 shadow-overlay"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Histórico de respostas</p>
            {stats && stats.attempt_count > 0 && ratio !== null ? (
              <p className="mt-1 text-xs text-muted">
                <span className={`font-semibold ${accuracyTone(ratio)}`}>
                  {stats.correct_count}/{stats.attempt_count} acertos ({Math.round(ratio * 100)}%)
                </span>
                {stats.doubtful_count > 0 ? ` · ${stats.doubtful_count}x em dúvida` : null}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">Um registro por sessão de estudo.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-edge px-2 py-1 text-xs text-muted hover:border-primary hover:text-ink"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {error ? (
            <p className="text-xs text-danger">{error}</p>
          ) : !history ? (
            <p className="text-xs text-muted">Carregando histórico...</p>
          ) : history.attempts.length === 0 ? (
            <p className="text-xs text-muted">Você ainda não respondeu esta questão.</p>
          ) : (
            <ul className="space-y-2">
              {history.attempts.map((attempt) => {
                const duration = formatDurationMs(attempt.time_ms);
                return (
                  <li
                    key={attempt.attempt_id}
                    className="flex items-center justify-between gap-3 border border-edge px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink">{formatAnsweredAt(attempt.answered_at)}</p>
                      <p className="mt-0.5 text-micro text-muted">
                        {attempt.selected_option ? `Marcou ${attempt.selected_option}` : "Sem alternativa"}
                        {duration ? ` · ${duration}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {attempt.doubtful && (
                        <span className="border border-warning/40 px-2 py-0.5 text-micro font-semibold text-warning">
                          Em dúvida
                        </span>
                      )}
                      <span
                        className={`border px-2 py-0.5 text-micro font-semibold ${
                          attempt.is_correct
                            ? "border-success/40 text-success"
                            : "border-danger/40 text-danger"
                        }`}
                      >
                        {attempt.is_correct ? "Correta" : "Errada"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full border border-edge px-4 py-2 text-sm font-semibold text-ink hover:border-primary"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
