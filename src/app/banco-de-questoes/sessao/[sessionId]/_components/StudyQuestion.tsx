/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";

import { GuidanceNote } from "@/components/GuidanceNote";
import type {
  QuestionBankGuidedReview,
  QuestionBankGuidedReviewValue,
  QuestionBankOption,
  QuestionBankReportType,
  QuestionBankSessionItem,
  QuestionBankSessionStatus,
} from "@/lib/api";
import { cognitiveAutopsyCopy } from "@/lib/guidanceCopy";
import { formatSourceLabel } from "@/lib/formatSource";
import FontScaleControl from "./FontScaleControl";
import { useQuestionFontScale } from "./useQuestionFontScale";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];
const CONFIDENCE_OPTIONS = [
  { value: 1, label: "Chute" },
  { value: 2, label: "Baixa" },
  { value: 3, label: "Média" },
  { value: 4, label: "Alta" },
  { value: 5, label: "Muito alta" },
] as const;
const CORRECTION_CONFIDENCE_OPTIONS = [
  ["low", "Entendi pouco"],
  ["medium", "Entendi"],
  ["high", "Entendi bem"],
] as const;
const GUIDED_REVIEW_OPTIONS: Array<[QuestionBankGuidedReviewValue, string]> = [
  ["yes", "Sim"],
  ["partial", "Parcial"],
  ["no", "Não"],
  ["unsure", "Não sei"],
];

type CorrectionConfidenceLevel = (typeof CORRECTION_CONFIDENCE_OPTIONS)[number][0];
type Tone = "primary" | "success" | "warning" | "danger" | "muted";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function difficultyChip(d: number | null | undefined): { label: string; className: string } | null {
  if (d == null) return null;
  if (d < 0.35) return { label: "Fácil", className: "text-success border-success/40" };
  if (d < 0.55) return { label: "Médio", className: "text-muted border-edge" };
  if (d < 0.75) return { label: "Difícil", className: "text-warning border-warning/40" };
  return { label: "Muito difícil", className: "text-danger border-danger/40" };
}

function toneClasses(tone: Tone) {
  return {
    primary: "border-primary bg-[var(--amber-tint)] text-primary",
    success: "border-success/50 bg-surface text-success",
    warning: "border-warning/50 bg-[var(--amber-tint)] text-warning",
    danger: "border-danger/50 bg-surface text-danger",
    muted: "border-edge bg-paper text-muted",
  }[tone];
}

function toneText(tone: Tone) {
  return {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    muted: "text-muted",
  }[tone];
}

const CATEGORY_LABELS: Record<string, string> = {
  revisao_vencida: "Revisão vencida",
  fraqueza: "Fraqueza recorrente",
  nova: "Questão nova",
  reforco: "Reforço",
};

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
  guidedReview: QuestionBankGuidedReview | null;
  guidedReviewError?: boolean;
  onRetryGuidedReview?: () => void;
  guidedResponses: Record<string, QuestionBankGuidedReviewValue>;
  confidenceRating: number | null;
  doubtfulDraft: boolean;
  correctionConfidenceLevel: CorrectionConfidenceLevel;
  eliminated: QuestionBankOption[];
  onToggleEliminate: (option: QuestionBankOption) => void;
  busy: boolean;
  reportOpen: boolean;
  reportType: QuestionBankReportType;
  reportReason: string;
  reportDone: boolean;
  onAnswer: (option: QuestionBankOption) => void;
  onReveal: () => void;
  onCorrectionChange: (v: string) => void;
  onGuidedResponseChange: (checkpointKey: string, value: QuestionBankGuidedReviewValue) => void;
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
  fixacaoCount?: number;
  onFixar?: () => void;
  onQuickNote?: () => void;
  onShowHistory?: () => void;
  onRequestAiCorrection?: () => void;
  aiCorrectionRequesting?: boolean;
  aiCorrectionRequested?: boolean;
};

const REPORT_LABELS: Record<QuestionBankReportType, string> = {
  error: "Erro no gabarito",
  unclear: "Enunciado confuso",
  outdated: "Desatualizada",
  other: "Outro",
};

function IconCheck({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

function IconBook({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 4.5h7.5A2.5 2.5 0 0 1 15 7v8.5H6.5A2.5 2.5 0 0 1 4 13V5.5a1 1 0 0 1 1-1Z" />
      <path d="M6.5 15.5A2.5 2.5 0 0 1 4 13" />
      <path d="M7 8h5" />
    </svg>
  );
}

function IconMinus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 10h12" />
    </svg>
  );
}

function ClinicalCyclePanel({
  answered,
  revealed,
  needsCorrection,
  isCorrect,
}: {
  answered: boolean;
  revealed: boolean;
  needsCorrection: boolean;
  isCorrect: boolean | null;
}) {
  const activeIndex = !answered ? 0 : !revealed ? 1 : revealed && needsCorrection ? 2 : 3;
  const steps = [
    { label: "Calibrar", detail: "declare confiança antes da resposta" },
    { label: "Decidir", detail: "marque, risque e siga o dado-chave" },
    { label: "Diagnosticar", detail: isCorrect ? "confirme por que acertou" : "isole a armadilha" },
    { label: "Consolidar", detail: "salve o reparo ou avance" },
  ];

  return (
    <div className="rounded-lg border border-edge bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Ciclo de aprendizagem</p>
        <span className="text-xs text-muted">{Math.min(activeIndex + 1, steps.length)}/{steps.length}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <div
              key={step.label}
              className={cx(
                "min-h-[4.7rem] rounded-lg border px-2.5 py-2 transition-colors",
                active
                  ? "border-primary bg-[var(--amber-tint)]"
                  : done
                    ? "border-success/40 bg-surface"
                    : "border-edge bg-paper",
              )}
            >
              <p className={cx("text-xs font-semibold", active ? "text-primary" : done ? "text-success" : "text-muted")}>
                {done ? <IconCheck className="mr-1 inline h-3 w-3" /> : null}
                {index + 1}. {step.label}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted">{step.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function phaseState(item: QuestionBankSessionItem, revealed: boolean): { label: string; detail: string; tone: Tone } {
  if (!item.answered) {
    return {
      label: "Antes da resposta",
      detail: "Calibre confiança, elimine distrações e escolha com intenção.",
      tone: "primary",
    };
  }
  if (!revealed) {
    return {
      label: "Resposta registrada",
      detail: "O próximo ganho vem ao comparar seu raciocínio com o gabarito.",
      tone: "warning",
    };
  }
  if (item.needs_correction) {
    return {
      label: "Reparo ativo",
      detail: "Transforme o erro em uma frase de raciocínio reutilizável.",
      tone: "danger",
    };
  }
  return {
    label: "Aprendizado capturado",
    detail: "Nomeie o dado decisivo antes de seguir para a próxima.",
    tone: "success",
  };
}

function isMicroNode(node: QuestionBankSessionItem["knowledge_nodes"][number]): boolean {
  return String(node.node_type ?? "").toLowerCase().includes("micro")
    || String(node.role ?? "").toLowerCase().includes("micro");
}

function hasCanonicalCorrection(item: QuestionBankSessionItem): boolean {
  const diagnosis = item.distractor_diagnosis ?? {};
  if (Object.keys(diagnosis).length > 0) return true;
  const profile = item.pedagogical_profile;
  if (!profile || typeof profile !== "object") return false;
  const checkpoints = (profile as Record<string, unknown>).checkpoints;
  return Array.isArray(checkpoints) && checkpoints.length > 0;
}

export default function StudyQuestion({
  item,
  position,
  total,
  sessionStatus,
  revealed,
  correctionDraft,
  guidedReview,
  guidedReviewError = false,
  onRetryGuidedReview,
  guidedResponses,
  confidenceRating,
  doubtfulDraft,
  correctionConfidenceLevel,
  eliminated,
  onToggleEliminate,
  busy,
  reportOpen,
  reportType,
  reportReason,
  reportDone,
  onAnswer,
  onReveal,
  onCorrectionChange,
  onGuidedResponseChange,
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
  fixacaoCount = 0,
  onFixar,
  onQuickNote,
  onShowHistory,
  onRequestAiCorrection,
  aiCorrectionRequesting = false,
  aiCorrectionRequested = false,
}: StudyQuestionProps) {
  const finalized = sessionStatus === "finalized";
  const canReveal = !finalized && item.answered && !revealed;
  const canCaptureAnswerSignals = !finalized && !item.answered;
  const progress = Math.round((position / total) * 100);
  const phase = phaseState(item, revealed);
  const primaryNode = item.knowledge_nodes.find((n) => n.is_primary) ?? item.knowledge_nodes[0];
  const microNodes = item.knowledge_nodes.filter(isMicroNode);
  const correctionAvailable = hasCanonicalCorrection(item);
  const selectedDiagnosis = item.selected_option ? item.distractor_diagnosis?.[item.selected_option]?.trim() : "";
  const cognitiveCopy = cognitiveAutopsyCopy(item.cognitive_signal?.primary_tag);
  const hasGuidedResponses = Object.keys(guidedResponses).length > 0;
  const fontScale = useQuestionFontScale();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;

      if (event.key === "ArrowRight") {
        if (position < total) {
          event.preventDefault();
          onNext();
        }
        return;
      }
      if (event.key === "ArrowLeft") {
        if (position > 1) {
          event.preventDefault();
          onPrev();
        }
        return;
      }
      if (event.key === "Enter") {
        if (tag === "BUTTON") return;
        if (canReveal) {
          event.preventDefault();
          onReveal();
        } else if (position < total) {
          event.preventDefault();
          onNext();
        }
        return;
      }
      if (canCaptureAnswerSignals && !busy) {
        const key = event.key.toUpperCase();
        const option = OPTIONS.includes(key as QuestionBankOption)
          ? (key as QuestionBankOption)
          : key >= "1" && key <= "5"
            ? OPTIONS[Number(key) - 1]
            : undefined;
        if (option && item.alternatives[option]) {
          event.preventDefault();
          onAnswer(option);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [position, total, canReveal, canCaptureAnswerSignals, busy, item.alternatives, onAnswer, onNext, onPrev, onReveal]);

  const calibrationNote: { tone: Tone; text: string } | null = (() => {
    if (!revealed || item.is_correct === null) return null;
    const conf = item.confidence_self_rating;
    if (!item.is_correct && conf != null && conf >= 4) {
      return { tone: "danger", text: "Excesso de confiança: a resposta parecia óbvia, mas havia uma armadilha. Esse é um ótimo ponto para virar flashcard." };
    }
    if (item.is_correct && item.doubtful) {
      return { tone: "success", text: "Bom instinto: você acertou mesmo em dúvida. Reforce o dado que sustentou sua escolha." };
    }
    if (!item.is_correct && item.doubtful) {
      return { tone: "warning", text: "Você hesitou e errou. A dúvida já apontava a lacuna certa para reparar agora." };
    }
    return null;
  })();

  const learningMomentCopy = item.is_correct
    ? "Você confirmou o caminho. Para transformar acerto em domínio, diga para si qual dado do enunciado tornou as outras alternativas menos prováveis."
    : selectedDiagnosis
      ? "O ganho está em reconhecer a sedução da alternativa escolhida. Compare a armadilha abaixo com o dado que fechava o gabarito."
      : "O ganho está em reconstruir o primeiro desvio do raciocínio. Escreva uma correção curta antes de avançar.";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="sticky top-0 z-10 border-b border-edge bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses(phase.tone))}>
                {phase.label}
              </span>
              <span className="text-xs font-semibold text-muted">Questão {position} de {total}</span>
              {primaryNode?.node_name && (
                <span className="max-w-full truncate rounded-full border border-edge bg-paper px-2.5 py-1 text-xs text-muted md:max-w-xs">
                  {primaryNode.node_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surfaceMuted">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-semibold tabular-nums text-muted">{progress}%</span>
            </div>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-muted">{phase.detail}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 md:px-6 md:py-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="space-y-5">
            <section className="rounded-lg border border-edge bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs text-muted">{formatSourceLabel(item.source)}</p>
                  {(() => {
                    const diff = difficultyChip(item.difficulty_estimate);
                    const adaptive = item.adaptive_explanation;
                    const reasons = adaptive?.reasons?.length
                      ? adaptive.reasons.slice(0, 3)
                      : selectionReasons(item.selection_reason);
                    const stats = item.attempt_stats;
                    const editorial = item.editorial_quality;
                    const hasHistory = Boolean(onShowHistory && stats && stats.attempt_count > 0);
                    if (!diff && reasons.length === 0 && !hasHistory && !editorial && !adaptive?.title) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {diff && (
                          <span className={cx("rounded border px-1.5 py-0.5 text-[10px] font-semibold", diff.className)}>
                            {diff.label}
                          </span>
                        )}
                        {adaptive?.title && (
                          <span className="rounded border border-primary/30 bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {adaptive.title}
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
                        {editorial && (
                          <span className="rounded border border-edge px-1.5 py-0.5 text-[10px] text-muted" title={editorial.message ?? undefined}>
                            {editorial.badge}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <FontScaleControl
                    increase={fontScale.increase}
                    decrease={fontScale.decrease}
                    canIncrease={fontScale.canIncrease}
                    canDecrease={fontScale.canDecrease}
                  />
                  {canReveal && (
                    <button
                      type="button"
                      onClick={onReveal}
                      aria-label="Ver gabarito"
                      className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm transition hover:brightness-105"
                    >
                      Ver gabarito
                    </button>
                  )}
                </div>
              </div>

              <ClinicalCyclePanel
                answered={item.answered}
                revealed={revealed}
                needsCorrection={item.needs_correction}
                isCorrect={item.is_correct}
              />

              <p className={cx("mt-5 max-w-[72ch] whitespace-pre-wrap text-justify hyphens-auto text-ink", fontScale.stemClass)}>
                {item.stem}
              </p>

              {item.image_refs.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {item.image_refs.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt="Imagem da questão"
                      loading="lazy"
                      decoding="async"
                      className="rounded-lg border border-edge bg-surface"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            {canCaptureAnswerSignals && (
              <section className="rounded-lg border border-edge bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Antes de marcar</p>
                    <h2 className="mt-1 font-serif text-xl font-semibold leading-tight text-ink">Calibre sua aposta</h2>
                    <p className="mt-1 text-sm text-muted">Isso ajuda o KrosMed a separar falta de conteúdo de excesso de confiança.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleDoubtful}
                    className={cx(
                      "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                      doubtfulDraft
                        ? "border-warning bg-[var(--amber-tint)] text-ink"
                        : "border-edge bg-paper text-muted hover:border-warning hover:text-warning",
                    )}
                  >
                    {doubtfulDraft ? "Dúvida marcada" : "Estou em dúvida"}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {CONFIDENCE_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onConfidenceRatingChange(confidenceRating === value ? null : value)}
                      className={cx(
                        "min-h-[3.75rem] rounded-lg border px-2 py-2 text-center transition",
                        confidenceRating === value
                          ? "border-primary bg-primary text-primaryInk"
                          : "border-edge bg-paper text-muted hover:border-primary hover:text-ink",
                      )}
                    >
                      <span className="block text-sm font-semibold">{value}</span>
                      <span className="mt-0.5 block text-[10px] leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Alternativas
                </p>
                {!item.answered && (
                  <p className="text-xs text-muted">Use o traço para riscar opções que você descartou.</p>
                )}
              </div>
              <div className="grid gap-2.5">
                {OPTIONS.map((option) => {
                  if (!item.alternatives[option]) return null;
                  const selected = item.selected_option === option;
                  const isCorrect = revealed && item.correct_answer === option;
                  const isWrong = revealed && selected && item.correct_answer !== option;
                  const isEliminated = eliminated.includes(option);
                  const canEliminate = !finalized && !item.answered;
                  const stateLabel = isCorrect ? "Gabarito" : isWrong ? "Sua escolha" : selected ? "Selecionada" : null;
                  return (
                    <div
                      key={option}
                      className={cx(
                        "flex items-stretch overflow-hidden rounded-lg border transition-colors",
                        fontScale.alternativeClass,
                        isCorrect
                          ? "border-success bg-surface text-success"
                          : isWrong
                            ? "border-danger bg-surface text-danger"
                            : selected
                              ? "border-primary bg-[var(--amber-tint)] text-ink"
                              : isEliminated
                                ? "border-edge bg-surface opacity-60"
                                : "border-edge bg-surface hover:border-primary",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isEliminated) onToggleEliminate(option);
                          onAnswer(option);
                        }}
                        disabled={busy || finalized || item.answered}
                        className="flex min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left disabled:cursor-not-allowed"
                      >
                        <span
                          className={cx(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                            selected || isCorrect ? "border-current bg-paper" : "border-edge bg-paper text-ink",
                          )}
                        >
                          {option}
                        </span>
                        <span className={cx("min-w-0 flex-1 leading-relaxed", isEliminated && !selected && "text-muted line-through")}>
                          {item.alternatives[option]}
                        </span>
                        {stateLabel && (
                          <span className="ml-2 hidden shrink-0 rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold sm:inline">
                            {stateLabel}
                          </span>
                        )}
                      </button>
                      {canEliminate && (
                        <button
                          type="button"
                          onClick={() => onToggleEliminate(option)}
                          disabled={busy}
                          aria-pressed={isEliminated}
                          aria-label={isEliminated ? `Restaurar alternativa ${option}` : `Riscar alternativa ${option}`}
                          title={isEliminated ? "Restaurar" : "Riscar"}
                          className={cx(
                            "flex w-11 shrink-0 items-center justify-center border-l border-edge transition-colors",
                            isEliminated ? "text-danger" : "text-muted hover:text-danger",
                          )}
                        >
                          <IconMinus />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {revealed && item.correct_answer && (
              <section className={cx("rounded-lg border p-4", item.is_correct ? "border-success/50 bg-surface" : "border-danger/50 bg-surface")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cx("text-xs font-semibold uppercase tracking-[0.14em]", item.is_correct ? "text-success" : "text-danger")}>
                      Momento de aprendizagem
                    </p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">
                      {item.is_correct ? "Acerto que vira domínio" : "Erro que vira mapa"}
                    </h2>
                    <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted">{learningMomentCopy}</p>
                  </div>
                  <div className="rounded-lg border border-edge bg-paper px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Gabarito {item.correct_answer}</p>
                    <p className="text-2xl font-bold text-ink">{item.correct_answer}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.selected_option && (
                    <span className="rounded-full border border-edge bg-paper px-2.5 py-1 text-xs text-muted">
                      Sua resposta: {item.selected_option}
                    </span>
                  )}
                  <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", item.is_correct ? "border-success/40 text-success" : "border-danger/40 text-danger")}>
                    {item.is_correct ? "Correto" : "Incorreto"}
                  </span>
                  {calibrationNote && (
                    <span className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold", toneClasses(calibrationNote.tone))}>
                      {calibrationNote.text}
                    </span>
                  )}
                </div>
                {microNodes.length > 0 && (
                  <div className="mt-4 rounded-lg border border-edge bg-paper p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Microcompetencias testadas</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {microNodes.slice(0, 4).map((node) => (
                        <span key={node.knowledge_node_id} className="rounded-full border border-primary/30 bg-surface px-2.5 py-1 text-xs font-semibold text-primary">
                          {node.node_name || "Microcompetencia"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!correctionAvailable && onRequestAiCorrection && (
                  <div className="mt-4 rounded-lg border border-warning/50 bg-[var(--amber-tint)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="max-w-[56ch] text-sm leading-relaxed text-muted">
                        Esta questao ainda nao tem correcao canonica da IA. Voce pode solicitar o enriquecimento agora; quando o worker finalizar, ela entra como questao com correcao.
                      </p>
                      <button
                        type="button"
                        onClick={onRequestAiCorrection}
                        disabled={aiCorrectionRequesting || aiCorrectionRequested}
                        className="rounded-lg border border-primary bg-primary px-3 py-2 text-xs font-semibold text-primaryInk transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {aiCorrectionRequesting ? "Solicitando..." : aiCorrectionRequested ? "IA solicitada" : "Rodar IA canonica"}
                      </button>
                    </div>
                  </div>
                )}
                {onQuickNote && (
                  <button
                    type="button"
                    onClick={onQuickNote}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-surfaceMuted"
                  >
                    <IconBook className="h-3.5 w-3.5" />
                    Criar flashcard deste aprendizado
                  </button>
                )}
              </section>
            )}

            {revealed && ((item.distractor_diagnosis && Object.keys(item.distractor_diagnosis).length > 0) || cognitiveCopy) && (
              <section className="rounded-lg border border-edge bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Diagnóstico do raciocínio
                </p>
                {cognitiveCopy && (
                  <GuidanceNote
                    eyebrow="Autopsia do raciocinio"
                    tone={cognitiveCopy.tone}
                    className="mt-3"
                  >
                    <span className="block font-semibold">{cognitiveCopy.label}</span>
                    <span className="mt-1 block">{cognitiveCopy.phrase}</span>
                    <span className="mt-2 block text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                      Pergunta de forca
                    </span>
                    <span className="block">{cognitiveCopy.forcingQuestion}</span>
                    <span className="mt-2 block text-xs text-muted">{cognitiveCopy.rule}</span>
                  </GuidanceNote>
                )}
                {item.selected_option && item.distractor_diagnosis?.[item.selected_option] && (
                  <div className="mt-3 rounded-lg border border-warning/50 bg-[var(--amber-tint)] p-3">
                    <p className="text-xs font-semibold text-warning">Por que sua alternativa parecia boa</p>
                    <p className="mt-1 font-serif text-sm leading-relaxed text-ink">
                      <span className="font-semibold">Escolha {item.selected_option}:</span>{" "}
                      {selectedDiagnosis}
                    </p>
                  </div>
                )}
                <div className="mt-3 grid gap-2">
                  {Object.entries(item.distractor_diagnosis ?? {})
                    .filter(([letter]) => letter !== item.selected_option)
                    .map(([letter, text]) => (
                      <div key={letter} className="rounded-lg border border-edge bg-paper px-3 py-2 text-sm text-muted">
                        <span className="font-semibold text-ink">{letter}:</span> {text}
                      </div>
                    ))}
                </div>
              </section>
            )}

            {revealed && item.needs_correction && (
              <section className="rounded-lg border border-warning/60 bg-[var(--amber-tint)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">
                      Reparo do raciocínio
                    </p>
                    <h2 className="mt-1 font-serif text-xl font-semibold leading-tight text-ink">Feche a lacuna em 60 segundos</h2>
                    <p className="mt-1 text-sm text-muted">Nomeie o dado-chave, explique a armadilha e escreva uma regra curta para a próxima vez.</p>
                  </div>
                  <span className="rounded-full border border-warning/40 bg-surface px-2.5 py-1 text-xs font-semibold text-warning">
                    Alto valor pedagógico
                  </span>
                </div>
                {guidedReviewError && !guidedReview && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-surface px-3 py-2 text-xs text-muted">
                    <span>Não foi possível carregar a revisão guiada.</span>
                    {onRetryGuidedReview && (
                      <button
                        type="button"
                        onClick={onRetryGuidedReview}
                        className="font-semibold text-warning underline underline-offset-2 hover:opacity-80"
                      >
                        Tentar novamente
                      </button>
                    )}
                    <span className="text-muted">Você ainda pode escrever sua correção abaixo.</span>
                  </div>
                )}
                {guidedReview?.eligible && guidedReview.checkpoints.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {guidedReview.checkpoints.map((checkpoint, index) => (
                      <div key={checkpoint.checkpoint_key} className="rounded-lg border border-warning/30 bg-surface p-3">
                        <div className="flex gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-warning/40 bg-[var(--amber-tint)] text-xs font-semibold text-warning">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-relaxed text-ink">{checkpoint.prompt}</p>
                            {checkpoint.knowledge_node_name && (
                              <span className="mt-1 inline-flex rounded-full border border-primary/30 bg-paper px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {checkpoint.knowledge_node_name}
                              </span>
                            )}
                            {checkpoint.micro_question && (
                              <p className="mt-1 text-xs leading-relaxed text-muted">{checkpoint.micro_question}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {GUIDED_REVIEW_OPTIONS.map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => onGuidedResponseChange(checkpoint.checkpoint_key, value)}
                                  className={cx(
                                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                                    guidedResponses[checkpoint.checkpoint_key] === value
                                      ? "border-primary bg-primary text-primaryInk"
                                      : "border-edge bg-paper text-muted hover:border-primary hover:text-ink",
                                  )}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <label className="mt-3 block text-xs font-semibold text-muted" htmlFor="question-correction">
                  Minha regra para não errar de novo
                </label>
                <textarea
                  id="question-correction"
                  value={correctionDraft}
                  onChange={(e) => onCorrectionChange(e.target.value)}
                  placeholder={guidedReview?.eligible ? "Observação opcional: escreva a regra que você quer lembrar." : "Em poucas linhas: qual era o raciocínio certo e onde o seu desviou?"}
                  className="mt-1 min-h-24 w-full resize-y"
                />
                {!guidedReview?.eligible && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted">Quanto reparou?</span>
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
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">Um reparo curto vale mais que uma explicação bonita e esquecível.</p>
                  <button
                    type="button"
                    onClick={onSubmitCorrection}
                    disabled={busy || (!correctionDraft.trim() && !hasGuidedResponses)}
                    className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm disabled:opacity-50"
                  >
                    Salvar reparo
                  </button>
                </div>
              </section>
            )}

            <div className="flex justify-end">
              {reportDone ? (
                <span className="text-xs text-muted">Enviado para revisão editorial</span>
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
              <section className="rounded-lg border border-edge bg-surface p-3">
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
                    className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primaryInk"
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    onClick={onCancelReport}
                    className="rounded-lg border border-edge px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="rounded-lg border border-edge bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Agora</p>
              <h2 className="mt-1 font-serif text-xl font-semibold leading-tight text-ink">{phase.label}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{phase.detail}</p>
              <div className="mt-4 space-y-2 text-xs text-muted">
                {!item.answered && (
                  <>
                    <p><span className="font-semibold text-ink">1.</span> Marque confiança antes de responder.</p>
                    <p><span className="font-semibold text-ink">2.</span> Risque pelo menos uma opção fraca se houver dúvida.</p>
                    <p><span className="font-semibold text-ink">3.</span> Escolha a alternativa que melhor explica o dado-chave.</p>
                  </>
                )}
                {item.answered && !revealed && (
                  <p>Você já decidiu. Revele o gabarito para transformar a resposta em diagnóstico.</p>
                )}
                {revealed && item.needs_correction && (
                  <p>Repare o raciocínio antes de avançar. O objetivo é sair com uma regra menor e mais útil.</p>
                )}
                {revealed && !item.needs_correction && (
                  <p>Acerto consolidado. Siga mantendo o mesmo ritual de calibração.</p>
                )}
              </div>
            </section>
            {revealed && (
              <section className="rounded-lg border border-edge bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Ganho real</p>
                <p className={cx("mt-2 font-serif text-lg font-semibold leading-tight", toneText(phase.tone))}>
                  {item.is_correct ? "Você validou um caminho clínico." : "Você encontrou uma armadilha reutilizável."}
                </p>
                {fixacaoCount > 0 && (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {fixacaoCount} item(ns) podem entrar na fixação antes de finalizar.
                  </p>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-edge bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={position <= 1}
              onClick={onPrev}
              className="rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-muted hover:border-primary hover:text-ink disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={position >= total}
              onClick={onNext}
              className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk shadow-sm disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
          {!finalized && position === total && (
            <div className="flex flex-wrap items-center gap-2">
              {onFixar && fixacaoCount > 0 && (
                <button
                  type="button"
                  onClick={onFixar}
                  className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-surfaceMuted"
                >
                  Fixar erros ({fixacaoCount})
                </button>
              )}
              <button
                type="button"
                onClick={onFinalize}
                disabled={busy}
                className="rounded-lg border border-success bg-success px-5 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              >
                Finalizar sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
