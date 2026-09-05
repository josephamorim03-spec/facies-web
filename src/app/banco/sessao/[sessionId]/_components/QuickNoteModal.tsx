"use client";

import { useState, type FormEvent } from "react";
import {
  createOperationalNote,
  type OperationalAreaCode,
  type OperationalQuestionOutcome,
  type QuestionBankOption,
  type QuestionTextHighlight,
} from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";

const AREAS: OperationalAreaCode[] = ["GO", "PD", "MP", "CG", "CM", "OU"];

function normalizeArea(value: string | null | undefined): OperationalAreaCode {
  return AREAS.includes(value as OperationalAreaCode) ? (value as OperationalAreaCode) : "OU";
}

function compactText(value: string | null | undefined, max = 120): string {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trim()}...` : cleaned;
}

type QuickNoteModalProps = {
  questionId: string;
  defaultArea: string | null | undefined;
  defaultTheme: string | null | undefined;
  questionOutcome: OperationalQuestionOutcome | null;
  noteIntent?: "rule" | "card";
  selectedOption?: QuestionBankOption | null;
  correctAnswer?: QuestionBankOption | null;
  errorHypothesis: string | null;
  highlightContext?: QuestionTextHighlight[];
  onClose: () => void;
};

export default function QuickNoteModal({
  questionId,
  defaultArea,
  defaultTheme,
  questionOutcome,
  noteIntent,
  selectedOption,
  correctAnswer,
  errorHypothesis,
  highlightContext = [],
  onClose,
}: QuickNoteModalProps) {
  const { token } = useAuthToken();
  const trimmedHypothesis = (errorHypothesis ?? "").trim();
  const theme = (defaultTheme ?? "").trim().slice(0, 120) || "Questão do banco";
  const isError = questionOutcome === "incorrect";
  const isCardIntent = noteIntent === "card" || (!isError && noteIntent !== "rule");
  const primaryLabel = isCardIntent ? "Criar card" : "Salvar regra";
  const insightLabel = isCardIntent ? "Pergunta curta para revisar depois" : "Regra curta para não errar de novo";
  const trapHighlight = highlightContext.find((highlight) => highlight.kind === "pegadinha");
  const keyHighlight = highlightContext.find((highlight) => highlight.kind === "ponto_chave");
  const trapText = compactText(trapHighlight?.selected_text);
  const keyText = compactText(keyHighlight?.selected_text);
  const defaultInsight = isCardIntent
    ? keyText
      ? `Qual regra explica este ponto-chave: ${keyText}?`
      : `Qual o ponto-chave de ${theme} que define a resposta correta?`
    : isError
    ? trapText
      ? `Evitar a pegadinha: ${trapText}`
      : selectedOption
        ? `Em ${theme}, qual regra evita cair na alternativa ${selectedOption}?`
        : `Qual regra evita errar ${theme}?`
    : `Qual regra vale salvar sobre ${theme}?`;

  const [area, setArea] = useState<OperationalAreaCode>(() => normalizeArea(defaultArea));
  const [insight, setInsight] = useState(defaultInsight);
  const [body, setBody] = useState(() => {
    const answerLine = correctAnswer ? `Resposta correta: ${correctAnswer}.` : "Resposta correta: revisar.";
    const highlightLine = trapText
      ? `Pegadinha grifada: ${trapText}`
      : keyText
        ? `Ponto-chave grifado: ${keyText}`
        : "";
    const contextLines = [
      answerLine,
      trimmedHypothesis && selectedOption ? `Armadilha em ${selectedOption}: ${trimmedHypothesis}` : "",
      highlightLine,
    ].filter(Boolean);
    return `${contextLines.join("\n")}\n\n${isCardIntent ? "Ponto-chave" : "Regra curta"}: `;
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = Boolean(token) && insight.trim().length >= 6 && Boolean(body.trim()) && !busy;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // ⚠️ ISTO DIZIA "Faca login para salvar a nota" A TODA GENTE.
    // `token` e' sempre "" (`lib/auth.ts:29`, por desenho: a sessao vai por
    // cookie httpOnly). O modal de "Salvar regra"/"Criar card" recusava a nota
    // de quem estava logado ha' horas.
    const trimmedInsight = insight.trim();
    const trimmedBody = body.trim();
    if (trimmedInsight.length < 6 || !trimmedBody) return;
    const bodyWithInsight = trimmedBody.includes(trimmedInsight)
      ? trimmedBody
      : `${trimmedBody}\n${isCardIntent ? "Ponto-chave" : "Regra curta"}: ${trimmedInsight}`;

    setBusy(true);
    setError(null);
    try {
      await createOperationalNote(token, {
        area,
        theme,
        source_type: "question",
        question_outcome: questionOutcome,
        insight_question: trimmedInsight,
        body: bodyWithInsight,
        weight: isError ? 9 : 7,
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
          className="w-full max-w-sm rounded-surface border border-edge bg-paper p-6 text-center shadow-overlay"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-sm font-semibold text-ink">
            {isCardIntent ? "Flashcard salvo no caderno." : "Regra salva no caderno."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 border border-edge px-4 py-2 text-sm font-semibold text-ink hover:border-primary"
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
        aria-label={primaryLabel}
        onSubmit={(event) => void handleSubmit(event)}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-surface border border-edge bg-paper p-5 shadow-overlay"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink">{primaryLabel}</p>
            <p className="mt-1 text-xs text-muted">{theme}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-edge px-2 py-1 text-xs text-muted hover:border-primary hover:text-ink"
            aria-label="Fechar"
          >
            x
          </button>
        </div>

        {trimmedHypothesis && (
          <div className="mt-4 border border-warning bg-[var(--wash-atencao)] p-3">
            <p className="paper-eyebrow text-warning">
              Hipotese do distrator
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
          {insightLabel}
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
          className="mt-1 w-full rounded-control border border-edge bg-paper px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className="mt-4 border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          {advancedOpen ? "Ocultar detalhes" : "Editar card"}
        </button>

        {advancedOpen && (
          <div className="mt-3 rounded-control border border-edge bg-surface p-3">
            <p className="paper-eyebrow mb-2">Area</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {AREAS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setArea(item)}
                  className={`border px-2.5 py-1 text-xs font-semibold ${
                    area === item ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted hover:border-primary hover:text-ink"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="block text-xs font-semibold text-muted" htmlFor="quick-note-body">
              Verso / resposta
            </label>
            <textarea
              id="quick-note-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              placeholder="Escreva o conceito ou raciocinio correto"
              className="mt-1 min-h-24 w-full resize-y rounded-control border border-edge bg-paper px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        )}

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-4 w-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk disabled:opacity-50"
        >
          {busy ? "Salvando..." : primaryLabel}
        </button>
      </form>
    </div>
  );
}
