"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  analyzeSimulationErrors,
  createOperationalNote,
  getSimulationAnalysisResults,
  me,
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
  sessionId: string;
  /** A IA precisa dos dois, e o modal nao os recebia. */
  stem?: string | null;
  alternatives?: Record<string, string> | null;
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
  sessionId,
  stem,
  alternatives,
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
  const { token, tokenResolved } = useAuthToken();
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
  const [iaBuscando, setIaBuscando] = useState(false);
  const [iaAplicada, setIaAplicada] = useState(false);
  // Nunca e' renderizado: so' lido dentro do efeito e escrito no `onChange`.
  // Ref, e nao estado, porque ler estado dentro de um atualizador exigiria
  // efeito colateral num lugar que o React exige puro.
  const tocouNoTexto = useRef(false);

  /**
   * Traz a sugestao da IA para dentro do "Criar card".
   *
   * ⚠️ O endpoint `POST /simulations/analyze-errors` ja' estava VIVO, sem flag
   * nenhuma, e sem um unico chamador: o `ErrorFlashcardsPanel` era o unico, e
   * ele esta' escondido por `FLASHCARDS_LIGADOS`. O que sobrava na tela era
   * este modal, que se rotula "Criar card", diz "Flashcard salvo no caderno" e
   * preenche o texto por interpolacao de template -- isto e', pede que o ALUNO
   * escreva o conteudo. Era o "so' permite o usuario criar" relatado.
   *
   * Tres cuidados:
   *
   * 1. CACHE PRIMEIRO. Mesmo caminho do `ErrorFlashcardsPanel`: se a sessao ja'
   *    foi analisada, reusa em vez de pagar de novo. A cota e' de 120 analises
   *    por dia e 6 por minuto.
   * 2. NAO SOBRESCREVE O QUE O ALUNO DIGITOU. O template continua sendo o valor
   *    inicial, entao o modal e' utilizavel no primeiro instante; a IA so'
   *    substitui se o campo ainda estiver intocado.
   * 3. FALHA EM SILENCIO PARA O TEMPLATE. Cota estourada, rede caida ou provedor
   *    fora do ar deixam o modal exatamente como era antes -- degradar aqui e'
   *    melhor que bloquear a criacao do card.
   *
   * So' vale para ERRO: o endpoint recebe `marked_option` e `correct_option` e
   * devolve `question_outcome: "incorrect"`. Acerto continua no template.
   */
  useEffect(() => {
    // ⚠️ AQUI EU ESCREVI `!token`, E ISSO MATA O EFEITO INTEIRO.
    // `getAuthToken()` devolve "" POR DESENHO -- a sessao vai por cookie
    // httpOnly e o BFF injeta o `Authorization`. A condicao e' sempre
    // verdadeira, entao a IA nunca era chamada e o modal abria manual como
    // antes: verde no lint, verde na CI, recurso morto.
    // O certo e' `tokenResolved`, como as tres chamadas de `page.tsx`.
    if (!tokenResolved || !isError || !stem || !alternatives) return;
    if (!selectedOption || !correctAnswer) return;
    let cancelado = false;

    async function sugerir() {
      setIaBuscando(true);
      try {
        const cache = await getSimulationAnalysisResults(token, sessionId).catch(() => null);
        const doCache = cache?.results.find(
          (resultado) => resultado.question_id === questionId && resultado.caderno_drafts.length > 0,
        );
        let rascunho = doCache?.caderno_drafts[0];

        if (!rascunho) {
          const meus = await me(token);
          const saida = await analyzeSimulationErrors(token, {
            user_id: meus.user_id,
            simulation_id: sessionId,
            wrong_questions: [
              {
                question_id: questionId,
                stem: stem as string,
                options: alternatives as Record<string, string>,
                marked_option: selectedOption as string,
                correct_option: correctAnswer as string,
                specialty: null,
                theme: theme ?? null,
                image_attachment_refs: null,
              },
            ],
          });
          rascunho = saida.results.find(
            (resultado) => resultado.question_id === questionId,
          )?.caderno_drafts[0];
        }

        if (cancelado || !rascunho) return;
        const payload = rascunho.note_payload;
        if (tocouNoTexto.current) return;
        if (payload.insight_question.trim()) setInsight(payload.insight_question);
        if (payload.body.trim()) setBody(payload.body);
        setIaAplicada(true);
      } catch {
        // Silencio proposital: ver o cuidado 3 acima.
      } finally {
        if (!cancelado) setIaBuscando(false);
      }
    }

    void sugerir();
    return () => {
      cancelado = true;
    };
    // `tokenResolved` e' a UNICA dependencia: ele nasce falso e vira verdadeiro
    // no efeito de montagem do `useAuthToken`. Com `[]` o efeito corria uma vez
    // so', com ele ainda falso, e voltava sem fazer nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenResolved]);

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
          <p className="text-sm font-medium text-ink">
            {isCardIntent ? "Flashcard salvo no caderno." : "Regra salva no caderno."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 border border-edge px-4 py-2 text-sm font-medium text-ink hover:border-primary"
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
            <p className="text-sm font-medium text-ink">{primaryLabel}</p>
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

        <label className="mt-4 block text-xs text-muted" htmlFor="quick-note-insight">
          {insightLabel}
        </label>
        {iaBuscando && (
          <p className="mt-1 text-xs text-muted">Preparando uma sugestão com IA...</p>
        )}
        {iaAplicada && !iaBuscando && (
          <p className="mt-1 text-xs text-muted">
            Sugestão preparada com IA. Revise antes de salvar.
          </p>
        )}
        <input
          id="quick-note-insight"
          type="text"
          value={insight}
          onChange={(event) => {
            tocouNoTexto.current = true;
            setInsight(event.target.value);
          }}
          minLength={6}
          maxLength={180}
          required
          placeholder="Min. 6 caracteres"
          className="mt-1 w-full rounded-control border border-edge bg-paper px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className="mt-4 border border-edge px-3 py-1.5 text-xs text-muted hover:text-ink"
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
                  className={`border px-2.5 py-1 text-xs ${
                    area === item ? "border-primary bg-washSelecao text-ink" : "border-edge text-muted hover:border-primary hover:text-ink"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="block text-xs text-muted" htmlFor="quick-note-body">
              Verso / resposta
            </label>
            <textarea
              id="quick-note-body"
              value={body}
              onChange={(event) => {
                tocouNoTexto.current = true;
                setBody(event.target.value);
              }}
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
          className="mt-4 w-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk disabled:opacity-50"
        >
          {busy ? "Salvando..." : primaryLabel}
        </button>
      </form>
    </div>
  );
}
