"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type {
  QuestionBankGuidedReview,
  QuestionBankGuidedReviewValue,
  QuestionBankFeedbackRevealPolicy,
  QuestionBankOption,
  QuestionPostAnswerReflection,
  QuestionBankReportType,
  QuestionBankSessionItem,
  QuestionBankSessionStatus,
  QuestionTextHighlight,
  QuestionTextHighlightKind,
  QuestionTextHighlightTarget,
} from "@/lib/api";
import { formatClock } from "@/lib/formatDuration";
import { formatSourceLabel } from "@/lib/formatSource";
import { QuestionImageRefs } from "@/app/banco/_components/QuestionImageRefs";
import { Sheet } from "@/components/ui/Sheet";
import { useEdgeSwipeSuppression } from "@/hooks/useEdgeSwipeSuppression";
import { ESTILO_DO_DESLIZE, useDeslizeLateral } from "@/hooks/useDeslizeLateral";
import FontScaleControl from "./FontScaleControl";
import { SessionExitButton } from "./SessionExitButton";
import { useQuestionFontScale } from "./useQuestionFontScale";
import { buildTextHighlightAnchor } from "./questionTextHighlights";
import {
  IconFlag,
  IconGrid,
  IconMaximize,
  IconMinus,
  IconSettings,
  IconStar,
} from "./iconesDaSessao";
import {
  closestHighlightTarget,
  getSelectionStartInTarget,
  highlightsForTarget,
  renderHighlightedText,
} from "./grifos";

export type QuestionPresentationMode = "learning" | "exam";
export type QuestionFlowKind = "training" | "simulation";

const OPTIONS: QuestionBankOption[] = ["A", "B", "C", "D", "E"];
const PREF_KEY = "krosmed.question_eink_preferences.v1";

const GUIDED_REVIEW_OPTIONS: Array<[QuestionBankGuidedReviewValue, string]> = [
  ["yes", "Sim"],
  ["partial", "Parcial"],
  ["no", "Nao"],
  ["unsure", "Não sei"],
];

const REPORT_LABELS: Record<QuestionBankReportType, string> = {
  error: "Erro no gabarito",
  unclear: "Enunciado confuso",
  wrong_answer: "Gabarito errado",
  bad_structure: "Enunciado cortado",
  missing_options: "Alternativas quebradas",
  truncated_or_merged_stem: "Questões misturadas",
  missing_media: "Imagem/tabela faltando",
  wrong_metadata: "Metadados errados",
  outdated: "Desatualizada",
  ai_correction_error: "Erro na correção por IA",
  other: "Outro",
};

const REPORT_OPTIONS: QuestionBankReportType[] = [
  "wrong_answer",
  "bad_structure",
  "missing_options",
  "truncated_or_merged_stem",
  "missing_media",
  "wrong_metadata",
  "outdated",
  "other",
];

type Preferences = {
  presentationMode?: QuestionPresentationMode;
  timerVisible?: boolean;
  sourceVisible?: boolean;
  /**
   * O interruptor do deslizar, do artboard `8f`.
   *
   * LIGADO por padrao, e desligavel — que e exatamente como o desenho o
   * descreve (`Webapp - telas.dc.html:2170`). Ligado por padrao porque o gesto
   * e a coisa que o utilizador ja sabe fazer; desligavel porque quem lê com uma
   * mao na maca esbarra nele sem querer.
   */
  swipeEnabled?: boolean;
};

type HighlightSelection = {
  target: QuestionTextHighlightTarget;
  option: QuestionBankOption | null;
  highlight_id?: string;
  kind?: QuestionTextHighlightKind;
  selected_text: string;
  prefix: string;
  suffix: string;
  occurrence_index: number;
  x: number;
  y: number;
};

type CorrectionConfidenceLevel = "low" | "medium" | "high";

type FocusedQuestionProps = {
  item: QuestionBankSessionItem;
  displayPosition: number;
  total: number;
  sessionStatus: QuestionBankSessionStatus;
  sessionStartedAt: string;
  sessionLabel: string;
  sessionKindLabel: string;
  flowKind: QuestionFlowKind;
  defaultPresentationMode: QuestionPresentationMode;
  canUseLearningFeedback: boolean;
  canChangeAnswer: boolean;
  revealed: boolean;
  correctionDraft: string;
  guidedReview: QuestionBankGuidedReview | null;
  guidedReviewError?: boolean;
  guidedResponses: Record<string, QuestionBankGuidedReviewValue>;
  correctionConfidenceLevel: CorrectionConfidenceLevel;
  eliminated: QuestionBankOption[];
  busy: boolean;
  reportOpen: boolean;
  reportType: QuestionBankReportType;
  reportReason: string;
  reportDone: boolean;
  canPrev: boolean;
  canNext: boolean;
  finalizeLabel?: string;
  onAnswer: (option: QuestionBankOption | null) => void;
  onReveal: () => void;
  onCorrectionChange: (v: string) => void;
  onGuidedResponseChange: (checkpointKey: string, value: QuestionBankGuidedReviewValue) => void;
  onCorrectionConfidenceChange: (v: CorrectionConfidenceLevel) => void;
  onSubmitCorrection: () => void;
  onToggleEliminate: (option: QuestionBankOption) => void;
  onToggleDoubtful: () => void;
  onToggleReport: () => void;
  onReportTypeChange: (v: QuestionBankReportType) => void;
  onReportReasonChange: (v: string) => void;
  onSubmitReport: () => void;
  onCancelReport: () => void;
  onQuickNote?: () => void;
  onCreateHighlight?: (input: {
    target: QuestionTextHighlightTarget;
    option?: QuestionBankOption | null;
    kind: QuestionTextHighlightKind;
    selected_text: string;
    prefix: string;
    suffix: string;
    occurrence_index: number;
  }) => void | Promise<void>;
  onDeleteHighlight?: (highlightId: string) => void | Promise<void>;
  onReflect?: (reflection: QuestionPostAnswerReflection) => void | Promise<void>;
  reflectionBusy?: boolean;
  onShowHistory?: () => void;
  onRequestAiCorrection?: () => void;
  onOpenMap: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinalize: () => void;
  onExit: () => void;
  bookmarked?: boolean;
  onBookmarkChange?: (bookmarked: boolean) => void | Promise<void>;
  fixacaoCount?: number;
  onFixar?: () => void;
  learningPackagePanel?: ReactNode;
  feedbackRevealPolicy?: QuestionBankFeedbackRevealPolicy;
  onFeedbackRevealPolicyChange?: (policy: QuestionBankFeedbackRevealPolicy) => void | Promise<void>;
  onSaveFeedbackRevealPolicyDefault?: () => void | Promise<void>;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * O cronômetro segue o MODO quando o aluno não escolheu.
 *
 * O §8.3 põe a tela de questão em densidade mínima e tira o relógio do modo
 * tutor: ali não há prova para caber nele, e um contador subindo transforma
 * leitura em corrida.
 *
 * Só que `parsed.timerVisible !== false` colapsava "nunca escolhi" com "escolhi
 * ligado" — os dois davam `true` — e sem essa distinção o modo não tem como ter
 * default próprio. Agora ausência segue o modo e escolha explícita vence sempre.
 */
function timerPadrao(mode: QuestionPresentationMode): boolean {
  return mode === "exam";
}

function readPreferences(defaultPresentationMode: QuestionPresentationMode): Required<Preferences> {
  if (typeof window === "undefined") {
    return {
      presentationMode: defaultPresentationMode,
      timerVisible: timerPadrao(defaultPresentationMode),
      sourceVisible: false,
      swipeEnabled: true,
    };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PREF_KEY) ?? "{}") as Preferences;
    const mode =
      parsed.presentationMode === "exam" || parsed.presentationMode === "learning"
        ? parsed.presentationMode
        : defaultPresentationMode;
    return {
      presentationMode: mode,
      timerVisible:
        typeof parsed.timerVisible === "boolean" ? parsed.timerVisible : timerPadrao(mode),
      sourceVisible: typeof parsed.sourceVisible === "boolean" ? parsed.sourceVisible : false,
      // `=== false`, e nao `!== true`: quem nunca escolheu tem de cair no
      // padrao LIGADO. Colapsar "nunca escolhi" com "escolhi nao" desligaria o
      // gesto para todo aluno que ja tem preferencias gravadas.
      swipeEnabled: parsed.swipeEnabled !== false,
    };
  } catch {
    return {
      presentationMode: defaultPresentationMode,
      timerVisible: timerPadrao(defaultPresentationMode),
      sourceVisible: false,
      swipeEnabled: true,
    };
  }
}

function setFullscreen(enabled: boolean) {
  if (typeof document === "undefined") return;
  if (enabled && !document.fullscreenElement) {
    void document.documentElement.requestFullscreen?.().catch(() => null);
  }
  if (!enabled && document.fullscreenElement) {
    void document.exitFullscreen?.().catch(() => null);
  }
}

function selectedBecause(reason: Record<string, unknown>): string[] {
  const raw = reason.selected_because;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string").slice(0, 4);
}

function difficultyLabel(value: number | null | undefined): string | null {
  if (value == null) return null;
  if (value < 0.35) return "Facil";
  if (value < 0.55) return "Média";
  if (value < 0.75) return "Difícil";
  return "Muito difícil";
}

const REFLECTION_LABELS: Record<QuestionPostAnswerReflection, string> = {
  correct_guess: "Chute",
  correct_secure: "Seguro",
  wrong_distraction: "Distracao",
  wrong_concept: "Conceito",
};

export default function FocusedQuestion({
  item,
  displayPosition,
  total,
  sessionStatus,
  sessionStartedAt,
  sessionLabel,
  sessionKindLabel,
  flowKind,
  defaultPresentationMode,
  canUseLearningFeedback,
  canChangeAnswer,
  revealed,
  correctionDraft,
  guidedReview,
  guidedReviewError = false,
  guidedResponses,
  correctionConfidenceLevel,
  eliminated,
  busy,
  reportOpen,
  reportType,
  reportReason,
  reportDone,
  canPrev,
  canNext,
  finalizeLabel,
  onAnswer,
  onReveal,
  onCorrectionChange,
  onGuidedResponseChange,
  onCorrectionConfidenceChange,
  onSubmitCorrection,
  onToggleEliminate,
  onToggleDoubtful,
  onToggleReport,
  onReportTypeChange,
  onReportReasonChange,
  onSubmitReport,
  onCancelReport,
  onQuickNote,
  onCreateHighlight,
  onDeleteHighlight,
  onReflect,
  reflectionBusy = false,
  onShowHistory,
  onRequestAiCorrection,
  onOpenMap,
  onPrev,
  onNext,
  onFinalize,
  onExit,
  bookmarked,
  onBookmarkChange,
  fixacaoCount,
  onFixar,
  learningPackagePanel,
  feedbackRevealPolicy,
  onFeedbackRevealPolicyChange,
  onSaveFeedbackRevealPolicyDefault,
}: FocusedQuestionProps) {
  const finalized = sessionStatus === "finalized";
  const [prefs, setPrefs] = useState(() => readPreferences(defaultPresentationMode));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [localFavorite, setLocalFavorite] = useState(Boolean(bookmarked ?? item.bookmarked));
  const [highlightSelection, setHighlightSelection] = useState<HighlightSelection | null>(null);
  const [highlightBusy, setHighlightBusy] = useState(false);
  const [ruleComposerOpen, setRuleComposerOpen] = useState(false);
  const lastOverlayTriggerRef = useRef<HTMLElement | null>(null);
  const fontScale = useQuestionFontScale();

  const isTrainingFlow = flowKind === "training";
  const presentationMode = isTrainingFlow ? prefs.presentationMode : "exam";
  const canShowLearning = presentationMode === "learning" && canUseLearningFeedback;
  const canReveal = canShowLearning && !finalized && Boolean(item.selected_option) && !revealed;

  /**
   * Deslizar entre questoes — o atalho POR CIMA dos botoes.
   *
   * `aoAvancar`/`aoVoltar` sao as MESMAS funcoes que `Proxima` e `←` chamam.
   * Nao ha um caminho do dedo: ha um atalho para o caminho que ja existia. E a
   * regra do desenho (`Webapp - telas.dc.html:2181`) e a da WCAG 2.5.1 ao mesmo
   * tempo.
   */
  const [deslize, gestoDeDeslize] = useDeslizeLateral({
    ativo: prefs.swipeEnabled,
    podeAvancar: canNext,
    podeVoltar: canPrev,
    aoAvancar: onNext,
    aoVoltar: onPrev,
  });

  /**
   * ⚠️ A SUPRESSAO DE BORDA E MONTADA AQUI, e nao herdada.
   *
   * `Nav.tsx:70` monta `useEdgeSwipeSuppression(!hideCompletely)` — e a sessao
   * ESCONDE o chrome, entao ali ela fica desligada. Sem ela, o swipe de borda do
   * iOS/Android navega o historico no meio do gesto e o aluno perde a sessao: o
   * defeito exato que o hook existe para impedir, na unica tela que mais tinha a
   * perder com ele.
   */
  useEdgeSwipeSuppression(prefs.swipeEnabled);
  const showFeedback = canShowLearning && revealed && item.correct_answer;
  const canAnswer = !finalized && !revealed && !item.answer_committed && (!item.answered || canChangeAnswer);
  const canEliminate = !finalized;
  const hasGuidedResponses = Object.keys(guidedResponses).length > 0;
  const primaryNode = item.knowledge_nodes.find((n) => n.is_primary) ?? item.knowledge_nodes[0];
  const microLabel = item.primary_microcompetency_label?.trim()
    || item.knowledge_nodes.find((node) =>
      String(node.node_type ?? "").toLowerCase().includes("micro")
      || String(node.role ?? "").toLowerCase().includes("micro")
    )?.node_name
    || null;
  const reasonChips = useMemo(() => selectedBecause(item.selection_reason), [item.selection_reason]);
  const progress = Math.round((displayPosition / Math.max(1, total)) * 100);
  const reflectionOptions = item.is_correct
    ? (["correct_guess", "correct_secure"] as const)
    : (["wrong_distraction", "wrong_concept"] as const);
  const hasPostAnswerReflection = Boolean(item.post_answer_reflection);
  const canOfferQuickNote = Boolean(onQuickNote) && (!item.is_correct || item.post_answer_reflection === "correct_guess");
  const emphasizeQuickNote = hasPostAnswerReflection && (item.post_answer_reflection === "wrong_concept" || item.post_answer_reflection === "correct_guess");
  const hideQuickNote = item.post_answer_reflection === "correct_secure";
  const emphasizeTrap = item.post_answer_reflection === "wrong_distraction";
  const quickNoteActionLabel = item.is_correct ? "Criar card" : "Salvar regra";
  const showQuickNoteAction = canOfferQuickNote && !hideQuickNote;
  const canUsePostAnswerActions = showFeedback && isTrainingFlow;
  const hasDistractorDiagnosis = Boolean(item.distractor_diagnosis && Object.keys(item.distractor_diagnosis).length > 0);
  const primaryPostAnswerAction =
    hasPostAnswerReflection && emphasizeQuickNote && showQuickNoteAction
      ? "quick_note"
      : hasPostAnswerReflection && emphasizeTrap && hasDistractorDiagnosis
        ? "trap"
        : "next";
  const hasRuleComposerContent = Boolean(correctionDraft.trim()) || hasGuidedResponses;
  const overlayOpen = settingsOpen || whyOpen || highlightSelection !== null;
  const focusActive = focusMode || browserFullscreen;
  const useWideReadingLayout = flowKind === "simulation" || presentationMode === "exam";
  const showStemMeta = prefs.sourceVisible;

  // ⚠️ O FOCO SAIU DAQUI, e nao foi perdido.
  //
  // As duas folhas guardavam o gatilho a mao (`lastOverlayTriggerRef`) e
  // devolviam o foco ao fechar. `Sheet` passou a fazer isso sozinho, e a
  // capturar o `document.activeElement` no momento de abrir -- o que dispensa
  // cada chamador lembrar-se de passar o botao. Manter as duas mecanicas faria
  // o foco ser reposto duas vezes pelo mesmo motivo.
  //
  // `lastOverlayTriggerRef` CONTINUA vivo: a barra de grifo ainda depende dele,
  // e ela nao e uma folha.
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeWhy = useCallback(() => setWhyOpen(false), []);
  const openWhy = useCallback(() => setWhyOpen(true), []);

  const toggleFocusMode = useCallback((next = !focusMode) => {
    setFocusMode(next);
    setFullscreen(next);
  }, [focusMode]);

  useEffect(() => {
    setPrefs((current) => ({
      ...current,
      presentationMode: current.presentationMode ?? defaultPresentationMode,
    }));
  }, [defaultPresentationMode]);

  useEffect(() => {
    setLocalFavorite(Boolean(bookmarked ?? item.bookmarked));
  }, [bookmarked, item.bookmarked, item.question_id]);

  useEffect(() => {
    setRuleComposerOpen(false);
  }, [item.question_id]);

  useEffect(() => {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    const start = new Date(sessionStartedAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sessionStartedAt]);

  useEffect(() => {
    function onFullscreenChange() {
      setBrowserFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const openHighlightToolbar = useCallback((
    highlight: QuestionTextHighlight,
    element: HTMLElement,
  ) => {
    const rect = element.getBoundingClientRect();
    lastOverlayTriggerRef.current = element;
    setHighlightSelection({
      target: highlight.target,
      option: highlight.option ?? null,
      highlight_id: highlight.highlight_id,
      kind: highlight.kind,
      selected_text: highlight.selected_text,
      prefix: highlight.prefix,
      suffix: highlight.suffix,
      occurrence_index: highlight.occurrence_index,
      x: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
      y: Math.max(16, rect.top - 8),
    });
  }, []);

  const closeHighlightToolbar = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setHighlightSelection(null);
    window.setTimeout(() => lastOverlayTriggerRef.current?.focus(), 0);
  }, []);

  const captureTextSelection = useCallback(() => {
    if (typeof window === "undefined") return false;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
    const selectedText = selection.toString().trim();
    if (selectedText.length < 2) return false;

    const range = selection.getRangeAt(0);
    const targetEl =
      closestHighlightTarget(range.commonAncestorContainer)
      ?? closestHighlightTarget(selection.anchorNode)
      ?? closestHighlightTarget(selection.focusNode);
    if (!targetEl) return false;

    const target = targetEl.dataset.highlightTarget === "alternative" ? "alternative" : "stem";
    const rawOption = targetEl.dataset.highlightOption as QuestionBankOption | undefined;
    const option = target === "alternative" && rawOption && OPTIONS.includes(rawOption) ? rawOption : null;
    const text = target === "stem" ? item.stem : option ? item.alternatives[option] ?? "" : "";
    if (!text) return false;
    const selectionStart = getSelectionStartInTarget(range, targetEl, selectedText);
    const anchor = buildTextHighlightAnchor(text, selectedText, selectionStart);
    if (!anchor.selected_text) return false;
    const rect = range.getBoundingClientRect();
    lastOverlayTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setHighlightSelection({
      target,
      option,
      selected_text: anchor.selected_text,
      prefix: anchor.prefix,
      suffix: anchor.suffix,
      occurrence_index: anchor.occurrence_index,
      x: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
      y: Math.max(16, rect.top - 8),
    });
    return true;
  }, [item.alternatives, item.stem]);

  const toggleFavorite = useCallback(async () => {
    const next = !localFavorite;
    setLocalFavorite(next);
    try {
      await onBookmarkChange?.(next);
    } catch {
      setLocalFavorite(!next);
    }
  }, [localFavorite, onBookmarkChange]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (highlightSelection) {
          event.preventDefault();
          closeHighlightToolbar();
          return;
        }
        // O `Esc` das duas folhas mora em `Sheet`, que e quem sabe se o foco
        // esta dentro delas. A barra de grifo acima FICA: ela nao e modal, nao
        // prende o foco, e por isso precisa do atalho da janela.
      }
      if (event.key === "F11") {
        event.preventDefault();
        toggleFocusMode(!focusActive);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      if (overlayOpen) return;
      if (event.key === "ArrowRight" && canNext) {
        event.preventDefault();
        onNext();
        return;
      }
      if (event.key === "ArrowLeft" && canPrev) {
        event.preventDefault();
        onPrev();
        return;
      }
      if (event.key === "Enter") {
        if (canReveal) {
          event.preventDefault();
          onReveal();
        } else if (canNext) {
          event.preventDefault();
          onNext();
        }
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFavorite();
        return;
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        if (captureTextSelection()) return;
        onToggleDoubtful();
        return;
      }
      if (!canAnswer || busy) return;
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
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, canAnswer, canNext, canPrev, canReveal, captureTextSelection, closeHighlightToolbar, closeSettings, closeWhy, focusActive, highlightSelection, item.alternatives, onAnswer, onNext, onPrev, onReveal, onToggleDoubtful, overlayOpen, settingsOpen, toggleFavorite, toggleFocusMode, whyOpen]);

  // NAO ha mais revelacao automatica -- a remocao e' o conserto.
  //
  // Era `if (prefs.autoReveal && canReveal) onReveal()`, e `canReveal` fica
  // verdadeiro no instante em que a alternativa e' TOCADA: o backend colapsa
  // `draft_selected_option` em `selected_option` na montagem do item. Um toque
  // disparava `revealAnswer`, que COMPROMETE (`commit: true`) e revela -- e
  // `canAnswer` exige `!revealed && !item.answer_committed`, entao nao havia
  // volta. Como a sessao pontua ao finalizar, um toque acidental entrava no
  // modelo do aluno como erro que ele nunca escolheu cometer.
  //
  // O rotulo dizia "Revelar ao responder" e o codigo revelava ao SELECIONAR.
  // O passo ja' existe -- o botao "Responder"; o atalho so' o pulava.

  function updatePrefs(next: Partial<Required<Preferences>>) {
    setPrefs((current) => ({ ...current, ...next }));
  }

  async function applyHighlight(kind: QuestionTextHighlightKind) {
    if (!highlightSelection || !onCreateHighlight) return;
    if (highlightSelection.highlight_id && highlightSelection.kind === kind) {
      closeHighlightToolbar();
      return;
    }
    setHighlightBusy(true);
    try {
      if (highlightSelection.highlight_id && onDeleteHighlight) {
        await onDeleteHighlight(highlightSelection.highlight_id);
      }
      await onCreateHighlight({
        target: highlightSelection.target,
        option: highlightSelection.option,
        kind,
        selected_text: highlightSelection.selected_text,
        prefix: highlightSelection.prefix,
        suffix: highlightSelection.suffix,
        occurrence_index: highlightSelection.occurrence_index,
      });
      closeHighlightToolbar();
    } finally {
      setHighlightBusy(false);
    }
  }

  async function clearSelectedHighlight() {
    if (!highlightSelection || !onDeleteHighlight) {
      closeHighlightToolbar();
      return;
    }
    const candidates = highlightSelection.highlight_id
      ? highlightsForTarget(item, highlightSelection.target, highlightSelection.option)
        .filter((highlight) => highlight.highlight_id === highlightSelection.highlight_id)
      : highlightsForTarget(item, highlightSelection.target, highlightSelection.option)
        .filter((highlight) => highlight.selected_text.trim() === highlightSelection.selected_text.trim());
    setHighlightBusy(true);
    try {
      await Promise.all(candidates.map((highlight) => onDeleteHighlight(highlight.highlight_id)));
      closeHighlightToolbar();
    } finally {
      setHighlightBusy(false);
    }
  }

  const highlightToolbarStyle =
    typeof window !== "undefined" && window.innerWidth < 768
      ? { left: 16, right: 16, bottom: 16 }
      : highlightSelection
        ? { left: highlightSelection.x, top: highlightSelection.y }
        : undefined;

  return (
    <div className={cx("flex min-h-screen flex-col bg-paper", focusActive && "selection:bg-surfaceMuted")}>
      <header
        className={cx("sticky top-0 z-20 bg-paper", focusActive ? "border-b border-transparent" : "border-b border-edge")}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className={cx("mx-auto flex items-center gap-2 px-3 md:px-5", focusActive ? "max-w-6xl py-1.5" : "max-w-5xl py-2")}>
          <SessionExitButton onExit={onExit} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {!focusActive && (
                <>
                  <span className="paper-eyebrow shrink-0">
                    {sessionKindLabel}
                  </span>
                  <span className="hidden truncate text-sm font-medium text-ink md:inline">
                    {sessionLabel}
                  </span>
                </>
              )}
              <span className="shrink-0 text-xs tabular-nums text-muted">{displayPosition}/{total}</span>
            </div>
            <div
              className="mt-1 h-1 overflow-hidden bg-surfaceMuted"
              role="progressbar"
              aria-label="Progresso da sessão"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={displayPosition}
              aria-valuetext={`Questão ${displayPosition} de ${total}`}
            >
              <div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isTrainingFlow ? (
              <div className="hidden rounded-control border border-edge bg-surface p-0.5 md:inline-flex">
                {(["learning", "exam"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updatePrefs({ presentationMode: mode })}
                    aria-pressed={presentationMode === mode}
                    className={cx(
                      "px-2.5 py-1.5 text-xs transition-colors",
                      presentationMode === mode ? "bg-primary text-primaryInk" : "text-muted hover:text-ink",
                    )}
                  >
                    {mode === "learning" ? "Aprender" : "Prova"}
                  </button>
                ))}
              </div>
            ) : (
              <span className="hidden rounded-control border border-edge bg-surface px-2.5 py-1.5 text-xs text-ink md:inline">
                {sessionKindLabel}
              </span>
            )}
            {prefs.timerVisible && (
              <span className="border border-edge px-2 py-1.5 text-xs tabular-nums text-ink md:px-2.5 md:text-sm">
                {formatClock(elapsedSeconds)}
              </span>
            )}
            <button type="button" onClick={onOpenMap} className="border border-edge p-2 text-muted hover:text-ink" title="Mapa" aria-label="Mapa">
              <IconGrid />
            </button>
            <button
              type="button"
              onClick={() => toggleFocusMode(!focusActive)}
              className={cx("border p-2 hover:text-ink", focusActive ? "border-ink text-ink" : "border-edge text-muted")}
              title={focusActive ? "Sair do foco" : "Modo foco"}
              aria-label={focusActive ? "Sair do foco" : "Modo foco"}
              aria-pressed={focusActive}
            >
              <IconMaximize />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="border border-edge p-2 text-muted hover:text-ink"
              title="Preferências"
              aria-label="Preferências"
              aria-expanded={settingsOpen}
            >
              <IconSettings />
            </button>
          </div>
        </div>
      </header>

      {/* ⚠️ DIV, E NAO MAIN.

          Este elemento era um segundo marco `main` DENTRO do `main` que o
          AppShell monta (`AppShell.tsx:375`) -- e o HTML admite um so por
          documento. Para leitor de tela, dois marcos `main` aninhados desfazem
          o atalho de "ir para o conteudo": deixa de haver UM conteudo
          principal.

          O axe da sessao passava verde porque `landmark-one-main` e regra de
          BOA PRATICA, e o gate roda so as tags de WCAG. Quem apanhou foi o
          seletor do e2e do deslize, que resolveu para dois elementos.

          ⚠️ Sinal de menor e maior NAO entra em comentario JSX: o
          `check-portuguese-ui-copy` le tudo entre eles como texto de tela, e
          acusou este proprio paragrafo. */}
      <div
        data-allow-horizontal-swipe="true"
        className={cx(
          "mx-auto w-full flex-1 px-4 md:px-6",
          focusActive
            ? "max-w-6xl py-3 md:py-4"
            : useWideReadingLayout
              ? "max-w-5xl py-4 md:py-5"
              : "max-w-4xl py-5 md:py-7",
        )}
        style={{
          ...ESTILO_DO_DESLIZE,
          // ⚠️ O TRANSFORM SO EXISTE DURANTE O ARRASTO, de proposito.
          //
          // Elemento com `transform` vira bloco de contencao para descendente
          // `position: fixed` — e a imagem ampliada da questao vive aqui dentro.
          // Um transform permanente, mesmo de 0px, a prenderia a este `main` em
          // vez do viewport. Durante o arrasto nao ha imagem aberta.
          transform: deslize.deslocamento
            ? `translate3d(${deslize.deslocamento}px, 0, 0)`
            : undefined,
          transition: deslize.arrastando ? "none" : "transform var(--motion-fast) var(--ease-paper)",
        }}
        {...gestoDeDeslize}
        onMouseUp={() => {
          window.setTimeout(captureTextSelection, 0);
        }}
        onTouchEnd={() => {
          window.setTimeout(captureTextSelection, 80);
        }}
      >
        <section className={cx("bg-surface p-4 md:p-5", focusActive ? "border border-transparent" : "border border-edge")}>
          {showStemMeta && (
            <div className={cx("flex flex-wrap items-center gap-3", prefs.sourceVisible ? "justify-between" : "justify-end")}>
              {prefs.sourceVisible && <p className="text-xs text-muted">{formatSourceLabel(item.source)}</p>}
              {item.selected_option && (
                <span className="rounded-control border border-edge bg-paper px-2.5 py-1 text-xs text-muted">
                  Resposta {item.selected_option}
                </span>
              )}
            </div>
          )}
          <p
            className={cx(
              "paper-reading whitespace-pre-wrap text-ink",
              showStemMeta ? "mt-5" : "mt-0",
              fontScale.stemClass,
              useWideReadingLayout && "max-w-none [text-align:justify]",
            )}
            data-highlight-target="stem"
          >
            {renderHighlightedText(item.stem, highlightsForTarget(item, "stem"), openHighlightToolbar)}
          </p>
          <QuestionImageRefs imageRefs={item.image_refs} className="mt-6 grid gap-3 md:grid-cols-2" />
        </section>

        <section className="mt-5 grid gap-2.5">
          {OPTIONS.map((option) => {
            if (!item.alternatives[option]) return null;
            const selected = item.selected_option === option;
            const isEliminated = eliminated.includes(option);
            const isCorrect = showFeedback && item.correct_answer === option;
            const isWrong = showFeedback && selected && item.correct_answer !== option;
            return (
              <div
                key={option}
                className={cx(
                  "flex items-stretch overflow-hidden border transition-colors",
                  fontScale.alternativeClass,
                  isCorrect
                    ? "border-success bg-surface text-success"
                    : isWrong
                      ? "border-danger bg-surface text-danger"
                      : selected
                        ? "border-ink bg-paper text-ink"
                        : isEliminated
                          ? "border-edge bg-surface opacity-60"
                          : "border-edge bg-surface hover:border-ink",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (isEliminated) return;
                    onAnswer(selected ? null : option);
                  }}
                  disabled={busy || !canAnswer || isEliminated}
                  className="flex min-w-0 flex-1 items-start gap-4 px-4 py-4 text-left disabled:cursor-not-allowed"
                >
                  <span className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center border text-nota font-medium",
                    selected || isCorrect ? "border-current bg-paper" : "border-edge bg-paper text-ink",
                  )}>
                    {option}
                  </span>
                  <span
                    className={cx(
                      "min-w-0 flex-1 leading-relaxed",
                      isEliminated && !selected && "text-muted line-through",
                    )}
                    data-highlight-target="alternative"
                    data-highlight-option={option}
                  >
                    {renderHighlightedText(item.alternatives[option], highlightsForTarget(item, "alternative", option), openHighlightToolbar)}
                  </span>
                  {(isCorrect || isWrong) && (
                    <span className="hidden shrink-0 border border-current px-2 py-0.5 text-micro sm:inline">
                      {isCorrect ? "Gabarito" : "Sua escolha"}
                    </span>
                  )}
                </button>
                {canEliminate && (
                  <button
                    type="button"
                    onClick={() => onToggleEliminate(option)}
                    disabled={busy || revealed}
                    aria-pressed={isEliminated}
                    aria-label={isEliminated ? `Restaurar alternativa ${option}` : `Riscar alternativa ${option}`}
                    title={isEliminated ? "Restaurar" : "Riscar"}
                    className={cx(
                      "flex w-12 shrink-0 items-center justify-center border-l border-edge transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                      isEliminated ? "text-danger" : "text-muted hover:text-danger",
                    )}
                  >
                    <IconMinus />
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {item.answered && presentationMode === "exam" && canUseLearningFeedback && (
          <section className="mt-5 rounded-surface border border-edge bg-surface px-4 py-3 text-sm text-muted">
            Feedback oculto no modo Prova.
          </section>
        )}

        {canUsePostAnswerActions && (
          <section className="mt-5 rounded-surface border border-edge bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={cx("paper-eyebrow", item.is_correct ? "text-success" : "text-danger")}>
                  {item.is_correct ? "Correto" : "Incorreto"}
                </p>
                <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-ink">
                  {item.is_correct ? "Caminho validado" : "Erro capturado"}
                </h2>
              </div>
              <div className="rounded-control border border-edge bg-paper px-3 py-2 text-center">
                <p className="paper-eyebrow">Gabarito</p>
                <p className="text-2xl font-bold text-ink">{item.correct_answer}</p>
              </div>
            </div>
            <div className={cx(
              "mt-4 flex flex-wrap items-center gap-2 border bg-paper px-3 py-2",
              hasPostAnswerReflection ? "border-edge" : "border-ink",
            )}>
              <span className="text-sm font-medium text-ink">Como foi?</span>
              {reflectionOptions.map((reflection) => (
                <button
                  key={reflection}
                  type="button"
                  disabled={reflectionBusy || !onReflect}
                  onClick={() => onReflect?.(reflection)}
                  aria-pressed={item.post_answer_reflection === reflection}
                  className={cx(
                    "border font-semibold transition-colors disabled:opacity-50",
                    hasPostAnswerReflection ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                    item.post_answer_reflection === reflection
                      ? "border-primary bg-primary text-primaryInk"
                      : hasPostAnswerReflection
                        ? "border-edge text-muted hover:text-ink"
                        : "border-ink text-ink hover:bg-surfaceMuted",
                  )}
                >
                  {REFLECTION_LABELS[reflection]}
                </button>
              ))}
              {item.post_answer_reflection && (
                <span className="text-xs text-muted">Registrado: {REFLECTION_LABELS[item.post_answer_reflection]}</span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {primaryPostAnswerAction === "quick_note" ? (
                <button
                  type="button"
                  onClick={onQuickNote}
                  disabled={!onQuickNote}
                  className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk transition hover:brightness-[1.04] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {quickNoteActionLabel}
                </button>
              ) : primaryPostAnswerAction === "trap" ? (
                <button
                  type="button"
                  onClick={() => openWhy()}
                  className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk transition hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Rever armadilha
                </button>
              ) : /* ⚠️ AVANCAR SAIU DAQUI, e foi para o rodape.
                     Ver o comentario do `<footer>`: o botao que muda de lugar
                     custa mais do que qualquer coisa que ele ganhe aqui. Quando
                     nao ha acao pedagogica a destacar, este canto fica vazio de
                     proposito -- o avancar ja esta na faixa do polegar. */
              null}
              {/* ⚠️ GUARDAR SAIU DAQUI, e foi para o rodape.
                  Ele so existia dentro deste cartao: invisivel no simulado, e
                  invisivel no treino ate o gabarito aparecer. Ou seja, existia
                  em toda parte MENOS na hora em que se decide guardar uma
                  questao -- ao ler. O atalho `F` sempre funcionou em qualquer
                  estado, e era a unica forma de chegar la. */}
              <div className="flex flex-wrap gap-2">
                {hasPostAnswerReflection && hasDistractorDiagnosis && primaryPostAnswerAction !== "trap" && (
                  <button
                    type="button"
                    onClick={() => openWhy()}
                    className={cx(
                      "border px-3 py-2 text-xs hover:text-ink",
                      emphasizeTrap ? "border-ink bg-paper text-ink" : "border-edge text-muted",
                    )}
                  >
                    {emphasizeTrap ? "Rever armadilha" : "Ver armadilha"}
                  </button>
                )}
                {hasPostAnswerReflection && !hasDistractorDiagnosis && (
                  <button type="button" onClick={() => openWhy()} className="border border-edge px-3 py-2 text-xs text-muted hover:text-ink">
                    Por que esta?
                  </button>
                )}
                {hasPostAnswerReflection && showQuickNoteAction && primaryPostAnswerAction !== "quick_note" && (
                  <button
                    type="button"
                    onClick={onQuickNote}
                    className={cx(
                      "border px-3 py-2 text-xs hover:text-ink",
                      emphasizeQuickNote ? "border-primary bg-primary text-primaryInk hover:text-paper" : "border-edge text-muted",
                    )}
                  >
                    {quickNoteActionLabel}
                  </button>
                )}
                {item.needs_correction && (
                  <button
                    type="button"
                    onClick={() => setRuleComposerOpen((open) => !open)}
                    className={cx(
                      "border border-edge px-3 py-2 text-xs hover:text-ink",
                      hasRuleComposerContent ? "text-ink" : "text-muted",
                    )}
                  >
                    {ruleComposerOpen ? "Ocultar revisão" : "Revisão guiada"}
                  </button>
                )}
                {onShowHistory && (
                  <button type="button" onClick={onShowHistory} className="border border-edge px-3 py-2 text-xs text-muted hover:text-ink">
                    Historico
                  </button>
                )}
                {!reportDone && (
                  <button type="button" onClick={onToggleReport} className="border border-edge px-3 py-2 text-xs text-muted hover:text-ink">
                    Reportar
                  </button>
                )}
              </div>
            </div>

            {item.needs_correction && ruleComposerOpen && (
              <div className="mt-4 rounded-control border border-edge bg-paper p-3">
                {guidedReviewError && !guidedReview && (
                  <p className="mb-2 text-xs text-muted">Não foi possível carregar a revisão guiada. Você ainda pode salvar uma regra.</p>
                )}
                {guidedReview?.eligible && guidedReview.checkpoints.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {guidedReview.checkpoints.map((checkpoint) => (
                      <div key={checkpoint.checkpoint_key} className="rounded-control border border-edge bg-surface p-3">
                        <p className="text-sm font-medium text-ink">{checkpoint.prompt}</p>
                        {checkpoint.micro_question && <p className="mt-1 text-xs text-muted">{checkpoint.micro_question}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {GUIDED_REVIEW_OPTIONS.map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => onGuidedResponseChange(checkpoint.checkpoint_key, value)}
                              className={cx(
                                "border px-3 py-1.5 text-xs transition",
                                guidedResponses[checkpoint.checkpoint_key] === value
                                  ? "border-primary bg-primary text-primaryInk"
                                  : "border-edge bg-paper text-muted hover:text-ink",
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <label className="paper-eyebrow block" htmlFor="focused-question-correction">
                  Regra para não errar de novo
                </label>
                <textarea
                  id="focused-question-correction"
                  value={correctionDraft}
                  onChange={(event) => onCorrectionChange(event.target.value)}
                  placeholder="Escreva uma regra curta."
                  className="mt-1 min-h-20 w-full resize-y"
                />
                {!guidedReview?.eligible && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onCorrectionConfidenceChange(level)}
                        className={cx(
                          "border px-3 py-1.5 text-xs",
                          correctionConfidenceLevel === level ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted hover:text-ink",
                        )}
                      >
                        {level === "low" ? "Pouco" : level === "medium" ? "Ok" : "Bem"}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={onSubmitCorrection}
                    disabled={busy || (!correctionDraft.trim() && !hasGuidedResponses)}
                    className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk transition hover:brightness-[1.04] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Salvar regra
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {canUsePostAnswerActions && learningPackagePanel}

        {reportOpen && !reportDone && canShowLearning && item.answered && (
          <section className="mt-5 rounded-surface border border-edge bg-surface p-3">
            <p className="paper-eyebrow mb-2">Qual o problema?</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {REPORT_OPTIONS.map((type) => (
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
              onChange={(event) => onReportReasonChange(event.target.value)}
              placeholder="Descreva o problema (opcional)."
              className="min-h-16 w-full resize-none"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={onSubmitReport} className="border border-primary bg-primary px-3 py-1.5 text-xs text-primaryInk transition hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Enviar
              </button>
              <button type="button" onClick={onCancelReport} className="border border-edge px-3 py-1.5 text-xs text-muted hover:text-ink">
                Cancelar
              </button>
            </div>
          </section>
        )}
      </div>

      {/* ⚠️ O RODAPE NAO SOME MAIS QUANDO A CORRECAO ABRE.
          Ele estava atras de `!canUsePostAnswerActions`: no fluxo de treino,
          revelar o gabarito APAGAVA a barra inteira, e o avancar reaparecia
          dentro do cartao de correcao -- onde ainda podia perder a primazia
          para "Salvar regra" ou "Rever armadilha", conforme a reflexao marcada.

          Tres consequencias, todas medidas na tela: o botao de avancar mudava
          de posicao a cada questao respondida; "Marcar" e "Anterior" sumiam
          justamente na hora em que o aluno decide se marca a questao; e a acao
          primaria saia da faixa de baixo, que o desenho reserva para ela
          (`Webapp - telas.dc.html:1720`: "a acao primaria da tela fica sempre na
          faixa de baixo, alcancavel com o polegar").

          Memoria motora e o ativo que este trabalho inteiro tenta explorar --
          e ela e exatamente o que um botao que se muda destroi. O cartao de
          correcao fica com a acao PEDAGOGICA; o rodape, com a de ANDAR. Elas
          deixaram de competir porque deixaram de morar juntas. */}
      <footer className={cx("sticky bottom-0 z-10 bg-paper px-4", focusActive ? "border-t border-transparent py-2" : "border-t border-edge py-3")}>
          <div
            className={cx(
              "mx-auto flex flex-wrap items-center justify-between gap-3",
              focusActive ? "max-w-6xl" : useWideReadingLayout ? "max-w-5xl" : "max-w-4xl",
            )}
          >
            {/* MARCAR e GUARDAR sao coisas diferentes, e ficam juntas porque
                as duas respondem à pergunta "o que faço com esta questão agora".

                ⚠️ Comentário JSX conta como copy para o `check-portuguese-ui-copy`:
                ele extrai literais entre aspas de QUALQUER linha, e não só as de
                código. Frase entre aspas aqui dentro tem de vir acentuada.

                Marcar e' duvida DESTA sessao: ela reaparece na aba "Marcadas"
                do pos-prova e morre ali. Guardar atravessa sessoes -- e o
                `bookmarked` em `student_question_state`, e a razao de existir
                uma lista de guardadas.

                Rotulo escondido abaixo de `sm`: em 390px os dois textos por
                extenso empurravam o grupo de navegacao para uma segunda linha.
                O `aria-label` carrega o nome para quem nao ve o icone. */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleDoubtful}
                aria-pressed={item.doubtful}
                aria-label={item.doubtful ? "Desmarcar questão" : "Marcar questão"}
                className={cx(
                  "inline-flex min-h-11 items-center gap-1.5 border px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                  item.doubtful ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted hover:text-ink",
                )}
              >
                <IconFlag className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.doubtful ? "Marcada" : "Marcar"}</span>
              </button>
              <button
                type="button"
                onClick={toggleFavorite}
                aria-pressed={localFavorite}
                aria-label={localFavorite ? "Tirar das guardadas" : "Guardar questão"}
                className={cx(
                  "inline-flex min-h-11 items-center gap-1.5 border px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                  localFavorite ? "border-primary bg-primary text-primaryInk" : "border-edge text-muted hover:text-ink",
                )}
              >
                <IconStar filled={localFavorite} className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{localFavorite ? "Guardada" : "Guardar"}</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={onPrev}
                className="border border-edge px-4 py-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-40"
              >
                Anterior
              </button>
              {canReveal ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onReveal}
                  className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk transition hover:brightness-[1.04] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Responder
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={onNext}
                  className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk transition hover:brightness-[1.04] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Próxima
                </button>
              )}
              {onFixar && fixacaoCount ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onFixar}
                  className="border border-edge px-4 py-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
                >
                  Fixar erros ({fixacaoCount})
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onFinalize}
              disabled={busy}
              className="border border-edge px-4 py-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              {finalizeLabel ?? "Finalizar"}
            </button>
          </div>
      </footer>

      {highlightSelection && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Fechar grifo"
            onClick={() => {
              closeHighlightToolbar();
            }}
          />
          <div
            className="fixed z-50 w-auto max-w-none rounded-control border border-edge bg-paper p-2 shadow-overlay md:max-w-sm md:-translate-x-1/2 md:-translate-y-full"
            style={highlightToolbarStyle}
            role="toolbar"
            aria-label="Grifar texto"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={highlightBusy || !onCreateHighlight}
                onClick={() => void applyHighlight("ponto_chave")}
                aria-pressed={highlightSelection.kind === "ponto_chave"}
                className={cx(
                  "border px-3 py-1.5 text-xs disabled:opacity-50",
                  canUsePostAnswerActions && item.post_answer_reflection === "correct_guess"
                    ? "border-primary bg-primary text-primaryInk"
                    : "border-edge text-muted hover:text-ink",
                )}
              >
                Ponto-chave
              </button>
              <button
                type="button"
                disabled={highlightBusy || !onCreateHighlight}
                onClick={() => void applyHighlight("pegadinha")}
                aria-pressed={highlightSelection.kind === "pegadinha"}
                className={cx(
                  "border px-3 py-1.5 text-xs disabled:opacity-50",
                  canUsePostAnswerActions && item.post_answer_reflection === "wrong_distraction"
                    ? "border-primary bg-primary text-primaryInk"
                    : "border-edge text-muted hover:text-ink",
                )}
              >
                Pegadinha
              </button>
              <button
                type="button"
                disabled={highlightBusy}
                onClick={() => void clearSelectedHighlight()}
                className="border border-edge px-3 py-1.5 text-xs text-muted hover:text-ink disabled:opacity-50"
              >
                Limpar
              </button>
            </div>
          </div>
        </>
      )}

      <Sheet
        open={settingsOpen}
        onClose={closeSettings}
        eyebrow="Preferências"
        title="Resolver sem ruido"
      >
            <div className="space-y-3 text-sm">
              {isTrainingFlow && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow mb-2">Modo visual</p>
                  <div className="inline-flex rounded-control border border-edge bg-paper p-0.5">
                    {(["learning", "exam"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updatePrefs({ presentationMode: mode })}
                        aria-pressed={presentationMode === mode}
                        className={cx(
                          "px-3 py-1.5 text-xs",
                          presentationMode === mode ? "bg-primary text-primaryInk" : "text-muted hover:text-ink",
                        )}
                      >
                        {mode === "learning" ? "Aprender" : "Prova"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!isTrainingFlow && feedbackRevealPolicy && onFeedbackRevealPolicyChange && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow">
                    Feedback ao finalizar
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Esta escolha vale somente para esta prova.
                  </p>
                  <div className="mt-3 grid gap-2">
                    {([
                      ["guided_choice", "Escolher por questão"],
                      ["reveal_all", "Revelar tudo ao finalizar"],
                    ] as const).map(([policy, label]) => (
                      <button
                        key={policy}
                        type="button"
                        disabled={busy}
                        onClick={() => void onFeedbackRevealPolicyChange(policy)}
                        aria-pressed={feedbackRevealPolicy === policy}
                        className={cx(
                          "border px-3 py-2 text-left text-sm font-medium disabled:opacity-50",
                          feedbackRevealPolicy === policy
                            ? "border-primary bg-primary text-primaryInk"
                            : "border-edge bg-paper text-muted hover:text-ink",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {onSaveFeedbackRevealPolicyDefault && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onSaveFeedbackRevealPolicyDefault()}
                      className="mt-3 text-xs text-primary underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Salvar esta escolha como padrão
                    </button>
                  )}
                </div>
              )}
              <div className="rounded-control border border-edge bg-surface p-3">
                <p className="paper-eyebrow mb-2">Fonte</p>
                <FontScaleControl
                  increase={fontScale.increase}
                  decrease={fontScale.decrease}
                  canIncrease={fontScale.canIncrease}
                  canDecrease={fontScale.canDecrease}
                />
              </div>
              {/* O interruptor do `8f`. Ele vem ANTES do Timer porque e o unico
                  daqui que muda como a tela responde ao dedo — os outros mudam o
                  que ela mostra. */}
              <label className="flex items-center justify-between gap-3 rounded-control border border-edge bg-surface px-3 py-2">
                <span>
                  Deslizar entre questões
                  <span className="mt-0.5 block text-xs text-muted">
                    Os botões continuam funcionando.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={prefs.swipeEnabled}
                  onChange={(e) => updatePrefs({ swipeEnabled: e.target.checked })}
                  className="h-4 w-4 accent-ink"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-control border border-edge bg-surface px-3 py-2">
                <span>Timer</span>
                <input type="checkbox" checked={prefs.timerVisible} onChange={(e) => updatePrefs({ timerVisible: e.target.checked })} className="h-4 w-4 accent-ink" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-control border border-edge bg-surface px-3 py-2">
                <span>Fonte da questão</span>
                <input type="checkbox" checked={prefs.sourceVisible} onChange={(e) => updatePrefs({ sourceVisible: e.target.checked })} className="h-4 w-4 accent-ink" />
              </label>
              <div className="rounded-control border border-edge bg-surface p-3">
                <p className="paper-eyebrow mb-2">Atalhos</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
                  <span>A-E / 1-5</span><span>Responder</span>
                  <span>Enter</span><span>Revelar ou avancar</span>
                  <span>Setas</span><span>Navegar</span>
                  <span>F</span><span>Guardar</span>
                  <span>M</span><span>Grifar ou marcar</span>
                  <span>F11</span><span>Modo foco</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  updatePrefs({
                    presentationMode: defaultPresentationMode,
                    timerVisible: timerPadrao(defaultPresentationMode),
                    sourceVisible: false,
                                  swipeEnabled: true,
                  })
                }
                className="w-full rounded-control border border-edge bg-surface px-3 py-2 text-left text-muted hover:text-ink"
              >
                Restaurar padrão
              </button>
            </div>
      </Sheet>

      <Sheet open={whyOpen} onClose={closeWhy} eyebrow="Contexto" title="Por que esta questão?">
            <div className="space-y-3 text-sm">
              {primaryNode?.node_name && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow">Tema</p>
                  <p className="mt-1 text-ink">{primaryNode.node_name}</p>
                </div>
              )}
              {microLabel && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow">Microcompetencia</p>
                  <p className="mt-1 text-ink">{microLabel}</p>
                </div>
              )}
              {difficultyLabel(item.difficulty_estimate) && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow">Dificuldade</p>
                  <p className="mt-1 text-ink">{difficultyLabel(item.difficulty_estimate)}</p>
                </div>
              )}
              {reasonChips.length > 0 && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow">Selecao</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {reasonChips.map((reason) => (
                      <span key={reason} className="rounded-control border border-edge bg-paper px-2.5 py-1 text-xs text-muted">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {showFeedback && item.selected_option && item.distractor_diagnosis?.[item.selected_option] && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow">Armadilha</p>
                  <p className="mt-1 text-ink">{item.distractor_diagnosis[item.selected_option]}</p>
                </div>
              )}
              {showFeedback && item.distractor_diagnosis && Object.keys(item.distractor_diagnosis).length > 0 && (
                <div className="rounded-control border border-edge bg-surface p-3">
                  <p className="paper-eyebrow">Distratores</p>
                  <div className="mt-2 space-y-2">
                    {Object.entries(item.distractor_diagnosis).map(([letter, text]) => (
                      <p key={letter} className="text-muted"><span className="font-semibold text-ink">{letter}:</span> {text}</p>
                    ))}
                  </div>
                </div>
              )}
              {onRequestAiCorrection && showFeedback && (
                <button type="button" onClick={onRequestAiCorrection} className="w-full border border-edge px-3 py-2 text-sm font-medium text-muted hover:text-ink">
                  Solicitar leitura por IA
                </button>
              )}
            </div>
      </Sheet>
    </div>
  );
}
