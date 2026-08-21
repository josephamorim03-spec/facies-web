"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type {
  FullExamType,
  QuestionBankAnswerStatus,
  QuestionBankCorrectionStatus,
  QuestionBankResolutionMode,
  QuestionBankSourceOption,
  QuestionBankStateOption,
  QuestionBankTopic,
  QuestionBankYearStat,
  StudyKind,
} from "@/lib/api";
import { TopicTreeList } from "./TopicTreeList";
import { buildTopicTree, flattenTopicTree, topicPathLabel } from "./topicTree";
import BancaPicker from "./BancaPicker";
import YearPicker from "./YearPicker";

const AREA_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "GO", label: "GO" },
  { value: "OB", label: "OB" },
  { value: "CM", label: "CM" },
  { value: "CG", label: "CG" },
  { value: "MP", label: "MP" },
  { value: "PD", label: "PD" },
  { value: "OU", label: "OU" },
] as const;

type RealizacaoState = {
  unanswered: boolean;
  answeredExpanded: boolean;
  answeredSubset: "all" | "correct" | "wrong";
};

function deriveAnswerStatus(s: RealizacaoState): QuestionBankAnswerStatus {
  if (!s.unanswered && !s.answeredExpanded) return "all";
  if (s.unanswered && !s.answeredExpanded) return "unanswered";
  if (!s.unanswered && s.answeredExpanded) {
    if (s.answeredSubset === "correct") return "correct";
    if (s.answeredSubset === "wrong") return "wrong";
    return "answered";
  }
  if (s.answeredSubset === "wrong") return "unanswered_or_wrong";
  return "all";
}

function initRealizacaoState(v: QuestionBankAnswerStatus): RealizacaoState {
  switch (v) {
    case "unanswered": return { unanswered: true, answeredExpanded: false, answeredSubset: "all" };
    case "answered": return { unanswered: false, answeredExpanded: true, answeredSubset: "all" };
    case "correct": return { unanswered: false, answeredExpanded: true, answeredSubset: "correct" };
    case "wrong": return { unanswered: false, answeredExpanded: true, answeredSubset: "wrong" };
    case "unanswered_or_wrong": return { unanswered: true, answeredExpanded: true, answeredSubset: "wrong" };
    case "needs_review":
    case "near_miss":
      return { unanswered: false, answeredExpanded: true, answeredSubset: "wrong" };
    default: return { unanswered: false, answeredExpanded: false, answeredSubset: "all" };
  }
}

function deriveRealizacaoLabel(s: RealizacaoState): string {
  if (!s.unanswered && !s.answeredExpanded) return "Todas";
  const parts: string[] = [];
  if (s.unanswered) parts.push("Não feitas");
  if (s.answeredExpanded) {
    if (s.answeredSubset === "correct") parts.push("Acertos");
    else if (s.answeredSubset === "wrong") parts.push("Erros");
    else parts.push("Feitas");
  }
  return parts.join(" + ");
}

/**
 * Dois eixos, e não um.
 *
 * Isto era uma lista só, com "Prova institucional" ao lado de duas opções de
 * correção — e escolher a prova sobrescrevia a correção em silêncio
 * (`onResolutionModeChange("simulation")`). O aluno cuja preferência era
 * "revelar tudo ao finalizar" pedia uma prova institucional e recebia "escolher
 * por questão", sem aviso.
 *
 * São perguntas independentes: O QUE estudar (tópico ou prova inteira) e COMO
 * corrigir (por questão ou tudo no fim). Separadas, uma não apaga a outra.
 */
const TIPO_OPTIONS: { value: "topic" | "full_exam"; label: string; help: string }[] = [
  { value: "topic", label: "Por tópico", help: "Você escolhe as áreas e os temas." },
  { value: "full_exam", label: "Prova institucional", help: "Uma instituição e um ano." },
];

const CORRECAO_OPTIONS: { value: QuestionBankResolutionMode; label: string; help: string }[] = [
  { value: "simulation", label: "Escolher por questão", help: "Depois do resultado, revise o raciocínio ou revele cada feedback." },
  { value: "training", label: "Revelar tudo ao finalizar", help: "Mostra gabarito e comentários de todas após concluir." },
];

export type FiltersBarProps = {
  area: string;
  onAreaChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  topics: QuestionBankTopic[];
  topicSuggestions: QuestionBankTopic[];
  topicsLoading?: boolean;
  topicsError?: boolean;
  onTopicsRetry?: () => void;
  selectedTopics: QuestionBankTopic[];
  onToggleTopic: (topic: QuestionBankTopic) => void;
  boardCodes: string[];
  examCodes: string[];
  institutions: string[];
  stateCodes: string[];
  sources: QuestionBankSourceOption[];
  states: QuestionBankStateOption[];
  sourcesLoading?: boolean;
  sourcesError?: boolean;
  onSourceSelectionChange: (selection: { boardCodes: string[]; examCodes: string[]; institutions: string[] }) => void;
  onStateCodesChange: (stateCodes: string[]) => void;
  onSourcesRetry?: () => void;
  yearStats: QuestionBankYearStat[];
  yearsLoading?: boolean;
  yearsError?: boolean;
  onYearsRetry?: () => void;
  selectedYears: number[];
  onSelectedYearsChange: (years: number[]) => void;
  includeNoYear: boolean;
  onIncludeNoYearChange: (v: boolean) => void;
  answerStatus: QuestionBankAnswerStatus;
  onAnswerStatusChange: (v: QuestionBankAnswerStatus) => void;
  correctionStatus: QuestionBankCorrectionStatus;
  onCorrectionStatusChange: (v: QuestionBankCorrectionStatus) => void;
  resolutionMode: QuestionBankResolutionMode;
  onResolutionModeChange: (v: QuestionBankResolutionMode) => void;
  studyKind: StudyKind;
  onStudyKindChange: (v: StudyKind) => void;
  fullExamName: string;
  onFullExamNameChange: (v: string) => void;
  fullExamYear: string;
  onFullExamYearChange: (v: string) => void;
  fullExamType: FullExamType;
  onFullExamTypeChange: (v: FullExamType) => void;
  limit: number;
  clampedLimit: number;
  maxSelectable: number;
  limitMax: number;
  onLimitChange: (v: number) => void;
  focusTopicId?: string | null;
  onQuantityEditingChange?: (editing: boolean) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SectionHeader({ step, title, detail }: { step: string; title: string; detail?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p className="text-micro font-semibold uppercase tracking-[0.14em] text-primary">{step}</p>
        <h3 className="mt-0.5 text-xl font-semibold leading-tight text-ink">{title}</h3>
      </div>
      {detail ? <p className="max-w-md text-sm text-muted">{detail}</p> : null}
    </div>
  );
}

function toggleCode(values: string[], code: string): string[] {
  const normalized = values.map((value) => value.trim().toUpperCase()).filter(Boolean);
  return normalized.includes(code) ? normalized.filter((value) => value !== code) : [...normalized, code];
}

function StatePicker({
  states,
  selected,
  onChange,
}: {
  states: QuestionBankStateOption[];
  selected: string[];
  onChange: (stateCodes: string[]) => void;
}) {
  const selectedSet = useMemo(
    () => new Set(selected.map((value) => value.trim().toUpperCase()).filter(Boolean)),
    [selected],
  );
  const options = useMemo(() => {
    const byCode = new Map<string, QuestionBankStateOption>();
    for (const state of states) {
      const code = String(state.state_code || state.label || "").trim().toUpperCase();
      if (!code) continue;
      const current = byCode.get(code);
      if (!current || state.question_count > current.question_count) {
        byCode.set(code, { ...state, state_code: code, label: state.label || code });
      }
    }
    for (const code of selectedSet) {
      if (!byCode.has(code)) byCode.set(code, { state_code: code, label: code, question_count: 0 });
    }
    return Array.from(byCode.values()).sort((a, b) => b.question_count - a.question_count || a.state_code.localeCompare(b.state_code));
  }, [selectedSet, states]);

  return (
    <div className="space-y-3 border-t border-edge pt-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Estado da prova</p>
          <p className="mt-0.5 text-xs text-muted">UF catalogada na prova, banca ou instituição.</p>
        </div>
        {selectedSet.size > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs font-semibold text-muted underline underline-offset-2 hover:text-ink"
          >
            Limpar
          </button>
        )}
      </div>
      {options.length === 0 ? (
        <p className="paper-dashed px-3 py-4 text-center text-xs text-muted">
          Nenhuma UF catalogada neste recorte.
        </p>
      ) : (
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
          {options.map((state) => {
            const code = state.state_code.trim().toUpperCase();
            const active = selectedSet.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => onChange(toggleCode(selected, code))}
                className={cx("km-chip", active && "km-chip-active")}
                aria-pressed={active}
              >
                <span>{code}</span>
                <span className="text-nano tabular-nums text-muted">{state.question_count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FiltersBar(props: FiltersBarProps) {
  const {
    area, onAreaChange, search, onSearchChange, topics, topicSuggestions, selectedTopics, onToggleTopic,
    topicsLoading = false, topicsError = false, onTopicsRetry,
    boardCodes, examCodes, institutions, stateCodes, sources, states, sourcesLoading, sourcesError, onSourceSelectionChange, onStateCodesChange, onSourcesRetry,
    yearStats, yearsLoading, yearsError, onYearsRetry,
    selectedYears, onSelectedYearsChange, includeNoYear, onIncludeNoYearChange,
    answerStatus, onAnswerStatusChange,
    correctionStatus, onCorrectionStatusChange,
    resolutionMode, onResolutionModeChange, studyKind, onStudyKindChange,
    fullExamName, onFullExamNameChange, fullExamYear, onFullExamYearChange,
    fullExamType, onFullExamTypeChange,
    limit, clampedLimit, maxSelectable, limitMax, onLimitChange, focusTopicId, onQuantityEditingChange,
  } = props;

  const [suggestionsFocused, setSuggestionsFocused] = useState(false);
  const [realizacaoState, setRealizacaoState] = useState<RealizacaoState>(() => initRealizacaoState(answerStatus));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [limitDraft, setLimitDraft] = useState(String(limit));

  useEffect(() => { setRealizacaoState(initRealizacaoState(answerStatus)); }, [answerStatus]);
  useEffect(() => { setLimitDraft(String(limit)); }, [limit]);

  function toggleTopicExpanded(topicId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  const topicTree = useMemo(() => buildTopicTree(topics), [topics]);
  const flatTopics = useMemo(() => flattenTopicTree(topicTree), [topicTree]);
  const selectedTopicIds = new Set(selectedTopics.map((t) => t.knowledge_node_id));
  const syntheticGroupIds = useMemo(
    () => new Set(flatTopics.filter((topic) => topic.synthetic).map((topic) => topic.knowledge_node_id)),
    [flatTopics],
  );
  const expandedTopicIds = useMemo(() => {
    if (search.trim()) return new Set(flatTopics.map((topic) => topic.knowledge_node_id));
    const next = new Set(expandedIds);
    for (const id of syntheticGroupIds) next.add(id);
    return next;
  }, [expandedIds, flatTopics, search, syntheticGroupIds]);

  useEffect(() => {
    if (!focusTopicId) return;
    const topicById = new Map(flatTopics.map((topic) => [topic.knowledge_node_id, topic]));
    const expanded = new Set<string>();
    let current = topicById.get(focusTopicId);
    while (current?.parent_knowledge_node_id) {
      expanded.add(current.parent_knowledge_node_id);
      current = topicById.get(current.parent_knowledge_node_id);
    }
    const syntheticParent = flatTopics.find((topic) => topic.children.some((child) => child.knowledge_node_id === focusTopicId));
    if (syntheticParent) expanded.add(syntheticParent.knowledge_node_id);
    setExpandedIds((previous) => new Set([...previous, ...expanded]));
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`topic-node-${focusTopicId}`);
      target?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      target?.querySelector("input")?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [flatTopics, focusTopicId]);

  function commitLimitDraft() {
    const parsed = Number(limitDraft);
    const next = Number.isInteger(parsed) ? Math.max(1, Math.min(limitMax, parsed)) : clampedLimit;
    onLimitChange(next);
    setLimitDraft(String(next));
  }

  // Os DOIS eixos no título. Antes "Prova institucional" engolia a correção, e o
  // aluno não via como a prova seria corrigida até terminá-la.
  const modeLabel = [
    studyKind === "full_exam" ? "Prova institucional" : "Por tópico",
    resolutionMode === "simulation" ? "feedback por questão" : "revelação ao finalizar",
  ].join(" · ");
  const statusLabel = deriveRealizacaoLabel(realizacaoState);
  const selectedSourceCount = boardCodes.length + examCodes.length + institutions.length;
  const selectedStateCount = stateCodes.length;
  const sourceDetail = selectedSourceCount > 0
    ? `${selectedSourceCount} fonte${selectedSourceCount > 1 ? "s" : ""}`
    : "todas as fontes";
  const stateDetail = selectedStateCount > 0 ? `${selectedStateCount} UF` : "todas as UFs";

  return (
    <div className="divide-y divide-edge">
      <section id="question-bank-topic-filters" className="space-y-4 p-4 md:p-5">
        <SectionHeader
          step="1. Foco clínico"
          title="Escolha a área e os temas"
        />

        <div className="flex flex-wrap gap-2">
          {AREA_OPTIONS.map((option) => {
            const selected = area === option.value;
            return (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => onAreaChange(option.value)}
                className={cx("km-chip", selected && "km-chip-active")}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSuggestionsFocused(true)}
            onBlur={() => setTimeout(() => setSuggestionsFocused(false), 150)}
            placeholder="Buscar especialidade, macrotema ou subtema"
            className="w-full"
          />
          {suggestionsFocused && search.trim() && (
            <ul className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 max-h-72 overflow-y-auto border border-edge bg-surface ">
              {topicSuggestions.slice(0, 8).map((topic) => {
                const selectable = topic.question_count > 0;
                return (
                  <li key={topic.knowledge_node_id}>
                    <button
                      type="button"
                      disabled={!selectable}
                      onMouseDown={() => {
                        if (!selectable) return;
                        onToggleTopic(topic);
                        onSearchChange("");
                        setSuggestionsFocused(false);
                      }}
                      className={cx(
                        "flex w-full flex-col px-3 py-2 text-left",
                        selectable ? "hover:bg-surfaceMuted" : "cursor-not-allowed opacity-65",
                      )}
                    >
                      <span className="break-words text-sm font-semibold [overflow-wrap:anywhere]">{topic.node_name}</span>
                      <span className="break-words text-xs text-muted [overflow-wrap:anywhere]">{topicPathLabel(topic)} · {topic.question_count} questões</span>
                    </button>
                  </li>
                );
              })}
              {topicSuggestions.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">Nenhum resultado para &ldquo;{search}&rdquo;</li>
              )}
            </ul>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="max-h-[32rem] overflow-y-auto border border-edge bg-paper p-2">
            <TopicTreeList
              nodes={topicTree}
              selectedIds={selectedTopicIds}
              expandedIds={expandedTopicIds}
              onToggle={onToggleTopic}
              onToggleExpand={toggleTopicExpanded}
              loading={topicsLoading}
              error={topicsError}
            onRetry={onTopicsRetry}
            highlightedId={focusTopicId}
            />
          </div>

          <div className="border-l-2 border-edge pl-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              {selectedTopics.length > 0
                ? `${selectedTopics.length} selecionado${selectedTopics.length > 1 ? "s" : ""}`
                : "Nenhum tema selecionado"}
            </p>
            {selectedTopics.length > 0 ? (
              <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                {selectedTopics.map((topic) => (
                  <span key={topic.knowledge_node_id} className="km-chip max-w-full items-start">
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{topicPathLabel(topic)}</span>
                    <button
                      type="button"
                      onClick={() => onToggleTopic(topic)}
                      className="ml-0.5 text-muted hover:text-ink"
                      aria-label={`Remover ${topic.node_name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">Sem tema, usa todos os assuntos dos filtros.</p>
            )}
          </div>
        </div>
      </section>

      <details id="question-bank-adjustments" className="group p-4 md:p-5">
        <summary className="paper-control min-h-11 cursor-pointer list-none marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <SectionHeader
            step="2. Refinar seleção"
            title="Banca, ano e histórico"
            detail={
              <span className="text-right">
                {statusLabel} · {sourceDetail} · {stateDetail}
                <span className="ml-2 inline-block transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
              </span>
            }
          />
        </summary>

        <div className="mt-4 space-y-4">

        <BancaPicker
          sources={sources}
          selectedBoardCodes={boardCodes}
          selectedExamCodes={examCodes}
          selectedInstitutions={institutions}
          onChange={onSourceSelectionChange}
          loading={sourcesLoading}
          error={sourcesError}
          onRetry={onSourcesRetry}
        />

        <StatePicker
          states={states}
          selected={stateCodes}
          onChange={onStateCodesChange}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <YearPicker
            yearStats={yearStats}
            selectedYears={selectedYears}
            onSelectedYearsChange={onSelectedYearsChange}
            includeNoYear={includeNoYear}
            onIncludeNoYearChange={onIncludeNoYearChange}
            loading={yearsLoading}
            error={yearsError}
            onRetry={onYearsRetry}
          />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Status das questões</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = { ...realizacaoState, unanswered: !realizacaoState.unanswered };
                  setRealizacaoState(next);
                  onAnswerStatusChange(deriveAnswerStatus(next));
                }}
                className={cx("km-chip", realizacaoState.unanswered && "km-chip-active")}
              >
                Não feitas
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = { ...realizacaoState, answeredExpanded: !realizacaoState.answeredExpanded };
                  setRealizacaoState(next);
                  onAnswerStatusChange(deriveAnswerStatus(next));
                }}
                className={cx("km-chip", realizacaoState.answeredExpanded && "km-chip-active")}
              >
                Feitas
              </button>
            </div>
            {realizacaoState.answeredExpanded && (
              <div className="flex flex-wrap gap-2 border-l-2 border-primary/30 pl-4">
                {(["all", "correct", "wrong"] as const).map((subset) => (
                  <button
                    key={subset}
                    type="button"
                    onClick={() => {
                      const next = { ...realizacaoState, answeredSubset: subset };
                      setRealizacaoState(next);
                      onAnswerStatusChange(deriveAnswerStatus(next));
                    }}
                    className={cx("km-chip", realizacaoState.answeredSubset === subset && "km-chip-active")}
                  >
                    {subset === "all" ? "Todas" : subset === "correct" ? "Acertadas" : "Erradas"}
                  </button>
                ))}
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Correção IA</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "Todas"],
                  ["with_correction", "Com correção"],
                  ["without_correction", "Sem correção"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onCorrectionStatusChange(value)}
                    className={cx("km-chip", correctionStatus === value && "km-chip-active")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>
      </details>

      <section id="question-bank-session-settings" className="space-y-4 p-4 md:p-5">
        <SectionHeader
          step="3. Modo e carga"
          title={`${modeLabel}, ${clampedLimit} questões`}
        />

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            O que estudar
          </legend>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {TIPO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={studyKind === option.value}
                // Só o tipo. A correção fica onde o aluno deixou.
                onClick={() => onStudyKindChange(option.value)}
                className={cx(
                  "border p-4 text-left transition-colors",
                  studyKind === option.value
                    ? "border-primary bg-surfaceMuted"
                    : "border-edge bg-surface hover:border-primary",
                )}
              >
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-1 block text-xs text-muted">{option.help}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            Como corrigir
          </legend>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {CORRECAO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={resolutionMode === option.value}
                onClick={() => onResolutionModeChange(option.value)}
                className={cx(
                  "border p-4 text-left transition-colors",
                  resolutionMode === option.value
                    ? "border-primary bg-surfaceMuted"
                    : "border-edge bg-surface hover:border-primary",
                )}
              >
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-1 block text-xs text-muted">{option.help}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {studyKind === "full_exam" ? (
          <div className="grid gap-3 border-t border-edge pt-4 md:grid-cols-[1fr_7rem_11rem]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Instituição</span>
              <input
                value={fullExamName}
                onChange={(e) => onFullExamNameChange(e.target.value)}
                placeholder="USP, UNIFESP, SUS-SP..."
                className="w-full"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ano</span>
              <input
                type="number"
                min={1900}
                max={2100}
                value={fullExamYear}
                onChange={(e) => onFullExamYearChange(e.target.value)}
                className="w-full"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Tipo</span>
              <select
                value={fullExamType}
                onChange={(e) => onFullExamTypeChange(e.target.value as FullExamType)}
                className="w-full border border-edge bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="acesso_direto">Acesso direto</option>
                <option value="r_plus">R+</option>
              </select>
            </label>
          </div>
        ) : null}

        {/* Alinhado a esquerda e em largura cheia, como o cabecalho da secao e os
            cards de modo acima. Centralizar num `max-w-md` fazia deste bloco uma
            ilha estreita que nao encostava em nenhuma borda vizinha. */}
        <div className="space-y-3 border-t border-edge pt-5">
          <div className="flex items-end justify-between gap-4">
            <label className="space-y-1.5">
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">Questões</span>
              <input
                type="number"
                min={1}
                max={limitMax}
                inputMode="numeric"
                pattern="[0-9]*"
                value={limitDraft}
                onFocus={() => onQuantityEditingChange?.(true)}
                onChange={(e) => {
                  const next = e.target.value;
                  if (/^\d*$/.test(next)) setLimitDraft(next);
                }}
                onBlur={() => {
                  commitLimitDraft();
                  onQuantityEditingChange?.(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                className="w-24 text-center"
              />
            </label>
            <p className="pb-2.5 text-xs text-muted">Máx. {Math.min(120, maxSelectable)}</p>
          </div>
          <input
            type="range"
            min={1}
            max={limitMax}
            value={clampedLimit}
            onChange={(e) => {
              const next = Number(e.target.value);
              setLimitDraft(String(next));
              onLimitChange(next);
            }}
            className="w-full"
            style={{ "--track-bg": `linear-gradient(to right, var(--range-fill) 0%, var(--range-fill) ${(clampedLimit / limitMax) * 100}%, var(--range-rest) ${(clampedLimit / limitMax) * 100}%, var(--range-rest) 100%)` } as CSSProperties}
            aria-label="Quantidade de questões"
          />
        </div>
      </section>
    </div>
  );
}
