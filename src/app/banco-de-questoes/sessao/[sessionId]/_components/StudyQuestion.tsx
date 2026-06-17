/* eslint-disable @next/next/no-img-element */
"use client";

import type { QuestionBankOption, QuestionBankReportType, QuestionBankSessionItem, QuestionBankSessionStatus } from "@/lib/api";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];
const CONFIDENCE_OPTIONS = [1, 2, 3, 4, 5];
const CORRECTION_CONFIDENCE_OPTIONS = [
  ["low", "Entendi pouco"],
  ["medium", "Entendi"],
  ["high", "Entendi bem"],
] as const;

type CorrectionConfidenceLevel = (typeof CORRECTION_CONFIDENCE_OPTIONS)[number][0];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function sourceLabel(source: Record<string, unknown>): string {
  const institution = String(source?.institution ?? "").trim();
  const board = String(source?.board_code ?? "").trim();
  const year = String(source?.year ?? "").trim();
  return [institution || "Instituição", board, year].filter(Boolean).join(" · ");
}

function difficultyChip(d: number | null | undefined): { label: string; className: string } | null {
  if (d == null) return null;
  if (d < 0.35) return { label: "Fácil", className: "text-success border-success/40" };
  if (d < 0.55) return { label: "Médio", className: "text-amber-600 border-amber-300" };
  if (d < 0.75) return { label: "Difícil", className: "text-warning border-warning/40" };
  return { label: "Muito difícil", className: "text-danger border-danger/40" };
}

const CATEGORY_LABELS: Record<string, string> = {
  revisao_vencida: "Revisão vencida",
  fraqueza: "Fraqueza recorrente",
  nova: "Questão nova",
  reforco: "Reforço",
};
// Raw labels the backend prepends to selected_because for the same categories.
const CATEGORY_RAW_LABELS = new Set(Object.values({
  revisao_vencida: "revisao vencida",
  fraqueza: "fraqueza recorrente",
  nova: "questao nova",
  reforco: "reforco",
}));

function selectionReasons(reason: Record<string, unknown>): string[] {
  const chips: string[] = [];
  const category = CATEGORY_LABELS[String(reason?.selection_category ?? "")];
  if (category) chips.push(category);
  const raw = reason?.selected_because;
  if (Array.isArray(raw)) {
    for (const r of raw as string[]) {
      if (chips.length >= 3) break;
      if (CATEGORY_RAW_LABELS.has(r)) continue;
      chips.push(
        r === "melhor equilibrio adaptativo"
          ? "Selecionada pelo motor adaptativo"
          : r.charAt(0).toUpperCase() + r.slice(1),
      );
    }
  }
  return chips.slice(0, 3);
}

type StudyQuestionProps = {
  item: QuestionBankSessionItem;
  position: number;
  total: number;
  sessionStatus: QuestionBankSessionStatus;
  revealed: boolean;
  correctionDraft: string;
  confidenceRating: number | null;
  doubtfulDraft: boolean;
  correctionConfidenceLevel: CorrectionConfidenceLevel;
  busy: boolean;
  reportOpen: boolean;
  reportType: QuestionBankReportType;
  reportReason: string;
  reportDone: boolean;
  onAnswer: (option: QuestionBankOption) => void;
  onReveal: () => void;
  onCorrectionChange: (v: string) => void;
  onConfidenceRatingChange: (v: number | null) => void;
  onToggleDoubtful: () => void;
  onCorrectionConfidenceChange: (v: CorrectionConfidenceLevel) => void;
  onSubmitCorrection: () => void;
  onToggleReport: () => void;
  onReportTypeChange: (v: QuestionBankReportType) => void;
  onReportReasonChange: (v: string) => void;
  onSubmitReport: () => void;
  onCancelReport: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinalize: () => void;
  onQuickNote?: () => void;
  onShowHistory?: () => void;
};

const REPORT_LABELS: Record<QuestionBankReportType, string> = {
  error: "Erro no gabarito",
  unclear: "Enunciado confuso",
  outdated: "Desatualizada",
  other: "Outro",
};

export default function StudyQuestion({
  item,
  position,
  total,
  sessionStatus,
  revealed,
  correctionDraft,
  confidenceRating,
  doubtfulDraft,
  correctionConfidenceLevel,
  busy,
  reportOpen,
  reportType,
  reportReason,
  reportDone,
  onAnswer,
  onReveal,
  onCorrectionChange,
  onConfidenceRatingChange,
  onToggleDoubtful,
  onCorrectionConfidenceChange,
  onSubmitCorrection,
  onToggleReport,
  onReportTypeChange,
  onReportReasonChange,
  onSubmitReport,
  onCancelReport,
  onPrev,
  onNext,
  onFinalize,
  onQuickNote,
  onShowHistory,
}: StudyQuestionProps) {
  const finalized = sessionStatus === "finalized";
  const canReveal = !finalized && item.answered && !revealed;
  const canCaptureAnswerSignals = !finalized && !item.answered;
  const progress = Math.round((position / total) * 100);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Top progress bar */}
      <div className="sticky top-0 z-10 border-b border-edge bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
              <span className="font-semibold">{position}/{total}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.knowledge_nodes.filter((n) => n.is_primary).slice(0, 2).map((n) => (
              <span key={n.knowledge_node_id} className="km-chip text-xs">
                {n.node_name ?? "—"}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        <div className="lg:grid lg:grid-cols-[1fr_20rem] lg:gap-8">

          {/* Left: question */}
          <div className="space-y-6">
            {/* Source + adaptive meta */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted">{sourceLabel(item.source)}</p>
              {(() => {
                const diff = difficultyChip(item.difficulty_estimate);
                const reasons = selectionReasons(item.selection_reason);
                const stats = item.attempt_stats;
                const hasHistory = Boolean(onShowHistory && stats && stats.attempt_count > 0);
                if (!diff && reasons.length === 0 && !hasHistory) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {diff && (
                      <span className={cx("rounded border px-1.5 py-0.5 text-[10px] font-semibold", diff.className)}>
                        {diff.label}
                      </span>
                    )}
                    {hasHistory && stats && (
                      <button
                        type="button"
                        onClick={onShowHistory}
                        className="rounded border border-edge px-1.5 py-0.5 text-[10px] font-semibold text-muted transition hover:border-primary hover:text-ink"
                      >
                        Histórico · {stats.correct_count}/{stats.attempt_count} acertos
                      </button>
                    )}
                    {reasons.map((r) => (
                      <span key={r} className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-muted">
                        {r}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Stem */}
            <p className="max-w-[65ch] whitespace-pre-wrap text-base leading-8 text-ink">
              {item.stem}
            </p>

            {/* Images */}
            {item.image_refs.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {item.image_refs.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt="Imagem da questão"
                    className="rounded-xl border border-edge bg-surface"
                    onError={(event) => {
                      // Sessões antigas podem ter URLs assinadas já expiradas.
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ))}
              </div>
            )}

            {canCaptureAnswerSignals && (
              <div className="rounded-xl border border-edge bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Confianca</span>
                  <div className="flex gap-1">
                    {CONFIDENCE_OPTIONS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onConfidenceRatingChange(confidenceRating === value ? null : value)}
                        className={cx(
                          "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition",
                          confidenceRating === value
                            ? "border-primary bg-primary text-primaryInk"
                            : "border-edge bg-paper text-muted hover:border-primary hover:text-ink",
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onToggleDoubtful}
                    className={cx(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                      doubtfulDraft
                        ? "border-warning bg-[var(--amber-tint)] text-ink"
                        : "border-edge bg-paper text-muted hover:border-warning hover:text-warning",
                    )}
                  >
                    Em duvida
                  </button>
                </div>
              </div>
            )}

            {/* Alternatives */}
            <div className="grid gap-2">
              {OPTIONS.map((option) => {
                if (!item.alternatives[option]) return null;
                const selected = item.selected_option === option;
                const isCorrect = revealed && item.correct_answer === option;
                const isWrong = revealed && selected && item.correct_answer !== option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onAnswer(option)}
                    disabled={busy || finalized || item.answered}
                    className={cx(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed",
                      isCorrect
                        ? "border-success bg-surface text-success"
                        : isWrong
                          ? "border-danger bg-surface text-danger"
                          : selected
                            ? "border-primary bg-[var(--amber-tint)]"
                            : "border-edge bg-surface hover:border-primary disabled:opacity-70",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge bg-paper text-xs font-semibold text-ink">
                      {option}
                    </span>
                    <span className="min-w-0 flex-1 leading-relaxed">{item.alternatives[option]}</span>
                  </button>
                );
              })}
            </div>

            {/* Reveal button (training mode) */}
            {canReveal && (
              <button
                type="button"
                onClick={onReveal}
                className="rounded-xl border border-primary bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted"
              >
                Ver gabarito
              </button>
            )}

            {/* Answer badge */}
            {revealed && item.correct_answer && (
              <div className={cx(
                "rounded-xl border p-4",
                item.is_correct ? "border-success bg-surface" : "border-danger bg-surface",
              )}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={cx("text-sm font-semibold", item.is_correct ? "text-success" : "text-danger")}>
                    {item.is_correct ? "Correto" : "Incorreto"} · Gabarito {item.correct_answer}
                  </p>
                  {onQuickNote && (
                    <button
                      type="button"
                      onClick={onQuickNote}
                      className="rounded-lg border border-edge px-3 py-1.5 text-xs font-semibold text-muted hover:border-primary hover:text-ink"
                    >
                      Anotar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Diagnóstico de erro por distrator (só após revelar o gabarito) */}
            {revealed && item.distractor_diagnosis && Object.keys(item.distractor_diagnosis).length > 0 && (
              <div className="rounded-xl border border-edge bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Diagnóstico de erro
                </p>
                {item.selected_option && item.distractor_diagnosis[item.selected_option] && (
                  <p className="mt-2 text-sm text-ink">
                    <span className="font-semibold">Sua escolha ({item.selected_option}):</span>{" "}
                    {item.distractor_diagnosis[item.selected_option]}
                  </p>
                )}
                <ul className="mt-2 space-y-1">
                  {Object.entries(item.distractor_diagnosis)
                    .filter(([letter]) => letter !== item.selected_option)
                    .map(([letter, text]) => (
                      <li key={letter} className="text-sm text-muted">
                        <span className="font-semibold text-ink">{letter}:</span> {text}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Guided correction */}
            {revealed && item.needs_correction && (
              <div className="rounded-2xl border border-warning bg-[var(--amber-tint)] p-4">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">
                  Correção guiada
                </label>
                <textarea
                  value={correctionDraft}
                  onChange={(e) => onCorrectionChange(e.target.value)}
                  placeholder="Explique o raciocínio correto e o motivo do erro."
                  className="mt-2 min-h-24 w-full resize-y"
                />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {CORRECTION_CONFIDENCE_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onCorrectionConfidenceChange(value)}
                      className={cx(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                        correctionConfidenceLevel === value
                          ? "border-primary bg-primary text-primaryInk"
                          : "border-edge bg-paper text-muted hover:border-primary hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onSubmitCorrection}
                  disabled={busy || !correctionDraft.trim()}
                  className="mt-3 rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk disabled:opacity-50"
                >
                  Salvar correção
                </button>
              </div>
            )}

            {/* Report */}
            <div className="flex justify-end">
              {reportDone ? (
                <span className="text-xs text-muted">Problema reportado</span>
              ) : (
                <button
                  type="button"
                  onClick={onToggleReport}
                  className="text-xs text-muted transition hover:text-ink"
                >
                  Informar problema
                </button>
              )}
            </div>
            {reportOpen && !reportDone && (
              <div className="rounded-xl border border-edge bg-surface p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Qual o problema?</p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {(Object.keys(REPORT_LABELS) as QuestionBankReportType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onReportTypeChange(type)}
                      className={cx("km-chip", reportType === type && "km-chip-active")}
                    >
                      {REPORT_LABELS[type]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportReason}
                  onChange={(e) => onReportReasonChange(e.target.value)}
                  placeholder="Descreva o problema (opcional)"
                  className="min-h-16 w-full resize-none"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={onSubmitReport}
                    className="rounded-xl border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primaryInk"
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    onClick={onCancelReport}
                    className="rounded-xl border border-edge px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: explanation placeholder (shown when revealed) */}
          {revealed && (
            <aside className="mt-6 hidden space-y-4 lg:mt-0 lg:block">
              <div className="rounded-2xl border border-edge bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Resposta correta</p>
                <p className="mt-1 text-2xl font-bold text-ink">{item.correct_answer}</p>
              </div>
              <div className="rounded-2xl border border-edge bg-surface p-4 text-sm text-muted">
                <p className="font-semibold text-ink">Explicação</p>
                <p className="mt-2 leading-relaxed">
                  Use o botão &ldquo;Me explique de outro jeito&rdquo; abaixo para pedir uma explicação personalizada.
                </p>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="sticky bottom-0 border-t border-edge bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={position <= 1}
              onClick={onPrev}
              className="rounded-xl border border-edge px-4 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-ink disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              disabled={position >= total}
              onClick={onNext}
              className="rounded-xl border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
          {!finalized && position === total && (
            <button
              type="button"
              onClick={onFinalize}
              disabled={busy}
              className="rounded-xl border border-success bg-success px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            >
              Finalizar sessão
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
