"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  FullExamType,
  QuestionBankAnswerStatus,
  QuestionBankCorrectionStatus,
  QuestionBankResolutionMode,
  QuestionBankSourceOption,
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

const MODO_OPTIONS: { value: QuestionBankResolutionMode | "full_exam"; label: string; help: string }[] = [
  { value: "training", label: "Treino", help: "Correção manual item a item." },
  { value: "simulation", label: "Simulado", help: "Correção só no final." },
  { value: "full_exam", label: "Prova", help: "Fluxo de simulado salvo em Provas." },
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
  institutions: string[];
  sources: QuestionBankSourceOption[];
  sourcesLoading?: boolean;
  sourcesError?: boolean;
  onSourceSelectionChange: (selection: { boardCodes: string[]; institutions: string[] }) => void;
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
  reviewTrailEnabled: boolean;
  onReviewTrailEnabledChange: (v: boolean) => void;
  reviewTrailLocked?: boolean;
  limit: number;
  clampedLimit: number;
  maxSelectable: number;
  limitMax: number;
  onLimitChange: (v: number) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SectionHeader({ step, title, detail }: { step: string; title: string; detail: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{step}</p>
        <h3 className="mt-0.5 font-serif text-xl font-semibold leading-tight text-ink">{title}</h3>
      </div>
      <p className="max-w-md text-sm text-muted">{detail}</p>
    </div>
  );
}

export default function FiltersBar(props: FiltersBarProps) {
  const {
    area, onAreaChange, search, onSearchChange, topics, topicSuggestions, selectedTopics, onToggleTopic,
    topicsLoading = false, topicsError = false, onTopicsRetry,
    boardCodes, institutions, sources, sourcesLoading, sourcesError, onSourceSelectionChange, onSourcesRetry,
    yearStats, yearsLoading, yearsError, onYearsRetry,
    selectedYears, onSelectedYearsChange, includeNoYear, onIncludeNoYearChange,
    answerStatus, onAnswerStatusChange,
    correctionStatus, onCorrectionStatusChange,
    resolutionMode, onResolutionModeChange, studyKind, onStudyKindChange,
    fullExamName, onFullExamNameChange, fullExamYear, onFullExamYearChange,
    fullExamType, onFullExamTypeChange, reviewTrailEnabled, onReviewTrailEnabledChange,
    reviewTrailLocked = false, limit, clampedLimit, maxSelectable, limitMax, onLimitChange,
  } = props;

  const [suggestionsFocused, setSuggestionsFocused] = useState(false);
  const [realizacaoState, setRealizacaoState] = useState<RealizacaoState>(() => initRealizacaoState(answerStatus));
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => { setRealizacaoState(initRealizacaoState(answerStatus)); }, [answerStatus]);

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

  const modeLabel = studyKind === "full_exam" ? "Prova" : resolutionMode === "simulation" ? "Simulado" : "Treino";
  const statusLabel = deriveRealizacaoLabel(realizacaoState);
  const selectedSourceCount = boardCodes.length + institutions.length;
  const sourceDetail = selectedSourceCount > 0
    ? `${selectedSourceCount} fonte${selectedSourceCount > 1 ? "s" : ""}`
    : "todas as fontes";

  return (
    <div className="divide-y divide-edge">
      <section className="space-y-4 p-4 md:p-5">
        <SectionHeader
          step="1. Foco clínico"
          title="Escolha a área e os temas"
          detail="Use a busca para chegar no subtema certo ou navegue pela árvore de conhecimento."
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
            <ul className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 max-h-72 overflow-y-auto rounded-xl border border-edge bg-surface shadow-[var(--soft-shadow)]">
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
          <div className="max-h-[32rem] overflow-y-auto rounded-xl border border-edge bg-paper p-2">
            <TopicTreeList
              nodes={topicTree}
              selectedIds={selectedTopicIds}
              expandedIds={expandedTopicIds}
              onToggle={onToggleTopic}
              onToggleExpand={toggleTopicExpanded}
              loading={topicsLoading}
              error={topicsError}
              onRetry={onTopicsRetry}
            />
          </div>

          <div className="rounded-xl border border-edge bg-surface p-3">
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
              <p className="mt-1 text-sm text-muted">Sem tema selecionado, a sessão usa todos os assuntos que combinam com os filtros.</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4 p-4 md:p-5">
        <SectionHeader
          step="2. Recorte"
          title="Filtre fonte, ano e histórico"
          detail={`${statusLabel} · ${sourceDetail}`}
        />

        <BancaPicker
          sources={sources}
          selectedBoardCodes={boardCodes}
          selectedInstitutions={institutions}
          onChange={onSourceSelectionChange}
          loading={sourcesLoading}
          error={sourcesError}
          onRetry={onSourcesRetry}
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

          <div className="space-y-3 rounded-xl border border-edge bg-surface p-3">
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
            <div className="border-t border-edge pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Correcao IA</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "Todas"],
                  ["with_correction", "Com correcao"],
                  ["without_correction", "Sem correcao"],
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
      </section>

      <section className="space-y-4 p-4 md:p-5">
        <SectionHeader
          step="3. Modo e carga"
          title={`${modeLabel}, ${clampedLimit} questões`}
          detail="Defina se quer feedback item a item, simulado ou prova completa."
        />

        <div className="grid gap-3 md:grid-cols-3">
          {MODO_OPTIONS.map((option) => {
            const active = option.value === "full_exam"
              ? studyKind === "full_exam"
              : studyKind === "topic" && resolutionMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (option.value === "full_exam") {
                    onStudyKindChange("full_exam");
                    onResolutionModeChange("simulation");
                  } else {
                    onStudyKindChange("topic");
                    onResolutionModeChange(option.value);
                  }
                }}
                className={cx(
                  "rounded-xl border p-4 text-left transition-colors",
                  active ? "border-primary bg-surfaceMuted" : "border-edge bg-surface hover:border-primary",
                )}
              >
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="mt-1 block text-xs text-muted">{option.help}</span>
              </button>
            );
          })}
        </div>

        {studyKind === "full_exam" ? (
          <div className="grid gap-3 rounded-xl border border-edge bg-surface p-3 md:grid-cols-[1fr_7rem_11rem]">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Nome da prova</span>
              <input
                value={fullExamName}
                onChange={(e) => onFullExamNameChange(e.target.value)}
                placeholder="ENARE, USP, UNIFESP..."
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
                className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-ink"
              >
                <option value="acesso_direto">Acesso direto</option>
                <option value="r_plus">R+</option>
              </select>
            </label>
          </div>
        ) : (
          !reviewTrailLocked && (
            <label className="flex items-start gap-3 rounded-xl border border-edge bg-surface p-3">
              <input
                type="checkbox"
                checked={reviewTrailEnabled}
                onChange={(e) => onReviewTrailEnabledChange(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Gerar trilha de revisão</span>
                <span className="mt-0.5 block text-xs text-muted">Ligado por padrão em foco único; desligado em listas mistas.</span>
              </span>
            </label>
          )
        )}

        <div className="grid gap-4 rounded-xl border border-edge bg-surface p-3 md:grid-cols-[10rem_1fr] md:items-end">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Questões</span>
            <input
              type="number"
              min={1}
              max={limitMax}
              value={limit}
              onChange={(e) => onLimitChange(Math.max(1, Math.min(limitMax, Number(e.target.value) || 1)))}
            />
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min={1}
              max={limitMax}
              value={clampedLimit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{ "--track-bg": `linear-gradient(to right, var(--range-fill) 0%, var(--range-fill) ${(clampedLimit / limitMax) * 100}%, var(--range-rest) ${(clampedLimit / limitMax) * 100}%, var(--range-rest) 100%)` } as CSSProperties}
              aria-label="Quantidade de questões"
            />
            <p className="text-xs text-muted">Máximo selecionável com os filtros atuais: {maxSelectable}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
