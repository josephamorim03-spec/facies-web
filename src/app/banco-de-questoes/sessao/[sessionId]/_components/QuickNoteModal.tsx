"use client";

import { useState, type FormEvent } from "react";
import {
  createOperationalNote,
  type OperationalAreaCode,
  type OperationalQuestionOutcome,
  type QuestionBankOption,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

const AREAS: OperationalAreaCode[] = ["GO", "PD", "MP", "CG", "CM", "OU"];

function normalizeArea(value: string | null | undefined): OperationalAreaCode {
  return AREAS.includes(value as OperationalAreaCode) ? (value as OperationalAreaCode) : "OU";
}

type QuickNoteModalProps = {
  questionId: string;
  defaultArea: string | null | undefined;
  defaultTheme: string | null | undefined;
  questionOutcome: OperationalQuestionOutcome | null;
  selectedOption?: QuestionBankOption | null;
  correctAnswer?: QuestionBankOption | null;
  errorHypothesis?: string | null;
  onClose: () => void;
};

export default function QuickNoteModal({
  questionId,
  defaultArea,
  defaultTheme,
  questionOutcome,
  selectedOption,
  correctAnswer,
  errorHypothesis,
  onClose,
}: QuickNoteModalProps) {
  const { token } = useAuthToken();
  const trimmedHypothesis = (errorHypothesis ?? "").trim();
  const [area, setArea] = useState<OperationalAreaCode>(() => normalizeArea(defaultArea));
  const [insight, setInsight] = useState(() =>
    trimmedHypothesis && selectedOption
      ? `Que raciocínio me levou à alternativa ${selectedOption}?`
      : "",
  );
  const [body, setBody] = useState(() => {
    if (!trimmedHypothesis) return "";
    const answerLine = correctAnswer ? `Gabarito: ${correctAnswer}.` : "Gabarito: revisar.";
    return `Hipótese do erro: ${trimmedHypothesis}\n${answerLine}\n\nRaciocínio correto: `;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const theme = (defaultTheme ?? "").trim().slice(0, 120) || "Questão do banco";
  const canSubmit = Boolean(token) && insight.trim().length >= 6 && Boolean(body.trim()) && !busy;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Faça login para salvar a nota.");
      return;
    }
    if (insight.trim().length < 6 || !body.trim()) return;

    setBusy(true);
    setError(null);
    try {
      await createOperationalNote(token, {
        area,
        theme,
        source_type: "question",
        question_outcome: questionOutcome,
        insight_question: insight.trim(),
        body: body.trim(),
        weight: 7,
        question_id: questionId,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar nota.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-sm rounded-lg border border-edge bg-paper p-6 text-center shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-sm font-semibold text-ink">Nota salva no caderno.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-ink hover:border-primary"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Nova nota do caderno"
        onSubmit={(event) => void handleSubmit(event)}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-edge bg-paper p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">Nova nota do caderno</p>
            <p className="mt-1 text-xs text-muted">{theme}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-edge px-2 py-1 text-xs text-muted hover:border-primary hover:text-ink"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {AREAS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setArea(item)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                area === item ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary hover:text-ink"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {trimmedHypothesis && (
          <div className="mt-4 rounded-lg border border-warning bg-[var(--amber-tint)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-warning">
              Hipótese do distrator
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink">
              {selectedOption ? `Sua escolha (${selectedOption}): ` : ""}
              {trimmedHypothesis}
            </p>
            {correctAnswer && (
              <p className="mt-1 text-xs text-muted">Gabarito: {correctAnswer}</p>
            )}
          </div>
        )}

        <label className="mt-4 block text-xs font-semibold text-muted" htmlFor="quick-note-insight">
          O que não sabia?
        </label>
        <input
          id="quick-note-insight"
          type="text"
          value={insight}
          onChange={(event) => setInsight(event.target.value)}
          minLength={6}
          maxLength={180}
          required
          placeholder="Min. 6 caracteres"
          className="mt-1 w-full rounded-lg border border-edge bg-paper px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <label className="mt-4 block text-xs font-semibold text-muted" htmlFor="quick-note-body">
          Anotação
        </label>
        <textarea
          id="quick-note-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          placeholder="Escreva o conceito ou raciocínio correto"
          className="mt-1 min-h-24 w-full resize-y rounded-lg border border-edge bg-paper px-3 py-2 text-sm outline-none focus:border-primary"
        />

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk disabled:opacity-50"
        >
          {busy ? "Salvando..." : "Salvar nota"}
        </button>
      </form>
    </div>
  );
}
