"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  FullExamType,
  QuestionBankAnswerStatus,
  QuestionBankResolutionMode,
  QuestionBankTopic,
  StudyKind,
} from "@/lib/api";

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

const YEAR_OPTIONS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

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

type TopicTreeNode = QuestionBankTopic & {
  children: TopicTreeNode[];
  treeDepth: number;
  synthetic?: boolean;
};

export type FiltersBarProps = {
  area: string;
  onAreaChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  topics: QuestionBankTopic[];
  selectedTopics: QuestionBankTopic[];
  onToggleTopic: (topic: QuestionBankTopic) => void;
  boardCodes: string[];
  boardInput: string;
  onBoardInputChange: (v: string) => void;
  onAddBoardCode: () => void;
  onRemoveBoardCode: (code: string) => void;
  institution: string;
  onInstitutionChange: (v: string) => void;
  selectedYears: number[];
  onSelectedYearsChange: (years: number[]) => void;
  answerStatus: QuestionBankAnswerStatus;
  onAnswerStatusChange: (v: QuestionBankAnswerStatus) => void;
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
  onLimitChange: (v: number) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function topicPathLabel(topic: QuestionBankTopic): string {
  if (topic.path_label?.trim()) return topic.path_label.trim();
  if ((topic.node_path?.length ?? 0) > 0) return topic.node_path.join(" / ");
  return topic.node_name;
}

function topicDepth(topic: QuestionBankTopic): number {
  if (typeof topic.depth === "number" && Number.isFinite(topic.depth)) return Math.max(0, topic.depth);
  if ((topic.node_path?.length ?? 0) > 1) return topic.node_path.length - 1;
  return 0;
}

function makeSyntheticGroup(label: string, code: string | null): TopicTreeNode {
  return {
    knowledge_node_id: `synthetic:${code ?? "all"}:${label}`,
    parent_knowledge_node_id: null,
    node_code: code,
    node_name: label,
    node_type: "group",
    node_path: [label],
    path_label: label,
    depth: 0,
    display_order: null,
    description: null,
    question_count: 0,
    primary_question_count: 0,
    board_count: 0,
    difficulty_mean: null,
    recurrence_score: 0,
    bank_demand_score: 0,
    board_frequency: {},
    charge_patterns: {},
    answer_types: {},
    adaptive_weight: 0,
    adaptive_weight_score: 0,
    adaptive_weight_factors: {},
    children: [],
    treeDepth: 0,
    synthetic: true,
  };
}

function sortTopicNodes(nodes: TopicTreeNode[]) {
  nodes.sort((a, b) => {
    if (a.synthetic !== b.synthetic) return a.synthetic ? -1 : 1;
    const orderA = typeof a.display_order === "number" ? a.display_order : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.display_order === "number" ? b.display_order : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return topicPathLabel(a).localeCompare(topicPathLabel(b), "pt-BR");
  });
  for (const node of nodes) sortTopicNodes(node.children);
}

function normalizeDepth(nodes: TopicTreeNode[], depth = 0) {
  for (const node of nodes) {
    node.treeDepth = depth;
    normalizeDepth(node.children, depth + 1);
  }
}

function buildTopicTree(topics: QuestionBankTopic[]): TopicTreeNode[] {
  const byId = new Map<string, TopicTreeNode>();
  for (const topic of topics) {
    byId.set(topic.knowledge_node_id, { ...topic, children: [], treeDepth: topicDepth(topic) });
  }

  const roots: TopicTreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.parent_knowledge_node_id?.trim();
    const parent = parentId ? byId.get(parentId) : null;
    if (parent && parent.knowledge_node_id !== node.knowledge_node_id) parent.children.push(node);
    else roots.push(node);
  }

  const groupedRoots: TopicTreeNode[] = [];
  const groupByLabel = new Map<string, TopicTreeNode>();
  for (const node of roots) {
    const firstPath = node.node_path?.[0]?.trim();
    const shouldGroup = Boolean(firstPath && firstPath !== node.node_name && topicDepth(node) > 0);
    if (!shouldGroup || !firstPath) {
      groupedRoots.push(node);
      continue;
    }
    const groupKey = `${node.node_code ?? ""}:${firstPath}`;
    let group = groupByLabel.get(groupKey);
    if (!group) {
      group = makeSyntheticGroup(firstPath, node.node_code);
      groupByLabel.set(groupKey, group);
      groupedRoots.push(group);
    }
    group.children.push(node);
    group.question_count += Math.max(0, Number(node.question_count || 0));
    group.primary_question_count += Math.max(0, Number(node.primary_question_count || 0));
  }

  sortTopicNodes(groupedRoots);
  normalizeDepth(groupedRoots);
  return groupedRoots;
}

function flattenTopicTree(nodes: TopicTreeNode[]): TopicTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTopicTree(node.children)]);
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

function TopicTreeItem({
  node, selectedIds, expandedIds, onToggle, onToggleExpand,
}: {
  node: TopicTreeNode;
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onToggle: (topic: QuestionBankTopic) => void;
  onToggleExpand: (topicId: string) => void;
}) {
  const selectable = !node.synthetic && node.question_count > 0;
  const checked = selectable && selectedIds.has(node.knowledge_node_id);
  const childCount = node.children.length;
  const expanded = childCount > 0 && expandedIds.has(node.knowledge_node_id);
  const indent = Math.min(node.treeDepth, 7) * 14;

  return (
    <div style={{ paddingLeft: `${indent}px` }}>
      <div className={cx(
        "flex min-w-0 items-start gap-2 rounded-lg border p-2.5 transition-colors",
        checked ? "border-primary bg-[var(--amber-tint)]" : "border-transparent",
        selectable ? "hover:border-edge hover:bg-surface" : "opacity-75",
      )}>
        {childCount > 0 ? (
          <button
            type="button"
            onClick={() => onToggleExpand(node.knowledge_node_id)}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-edge bg-surface text-xs text-muted hover:border-primary hover:text-ink"
            aria-label={expanded ? `Recolher ${node.node_name}` : `Expandir ${node.node_name}`}
            aria-expanded={expanded}
          >
            {expanded ? "−" : "+"}
          </button>
        ) : (
          <span className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
        )}
        <label className={cx("flex min-w-0 flex-1 items-start gap-3", selectable ? "cursor-pointer" : "cursor-default")}>
          <input
            type="checkbox"
            checked={checked}
            disabled={!selectable}
            onChange={() => {
              if (selectable) onToggle(node);
            }}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="min-w-0 flex-1">
            <span className={cx("block break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]", selectable || node.synthetic ? "text-ink" : "text-muted")}>{node.node_name}</span>
            {topicPathLabel(node) !== node.node_name && (
              <span className="mt-0.5 block line-clamp-2 break-words text-xs text-muted [overflow-wrap:anywhere]">{topicPathLabel(node)}</span>
            )}
            {node.synthetic && (
              <span className="mt-0.5 block text-xs text-muted">{node.question_count} questões nesse grupo</span>
            )}
            {!node.synthetic && node.question_count === 0 && (
              <span className="mt-1 inline-block rounded-full border border-edge bg-surfaceMuted px-2 py-0.5 text-[11px] font-medium text-muted">
                0 questões · em curadoria
              </span>
            )}
          </span>
        </label>
      </div>
      {expanded && childCount > 0 && (
        <div className="mt-1 space-y-1">
          <TopicTreeList nodes={node.children} selectedIds={selectedIds} expandedIds={expandedIds} onToggle={onToggle} onToggleExpand={onToggleExpand} />
        </div>
      )}
    </div>
  );
}

function TopicTreeList({
  nodes, selectedIds, expandedIds, onToggle, onToggleExpand,
}: {
  nodes: TopicTreeNode[];
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onToggle: (topic: QuestionBankTopic) => void;
  onToggleExpand: (topicId: string) => void;
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-edge bg-surface p-4 text-sm text-muted">
        Nenhum assunto encontrado para os filtros atuais.
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TopicTreeItem
          key={node.knowledge_node_id}
          node={node}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  );
}

export default function FiltersBar(props: FiltersBarProps) {
  const {
    area, onAreaChange, search, onSearchChange, topics, selectedTopics, onToggleTopic,
    boardCodes, boardInput, onBoardInputChange,
    onAddBoardCode, onRemoveBoardCode, institution, onInstitutionChange,
    selectedYears, onSelectedYearsChange, answerStatus, onAnswerStatusChange,
    resolutionMode, onResolutionModeChange, studyKind, onStudyKindChange,
    fullExamName, onFullExamNameChange, fullExamYear, onFullExamYearChange,
    fullExamType, onFullExamTypeChange, reviewTrailEnabled, onReviewTrailEnabledChange,
    reviewTrailLocked = false, limit, clampedLimit, maxSelectable, onLimitChange,
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
              {flatTopics.filter((topic) => !topic.synthetic).slice(0, 8).map((topic) => {
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
              {flatTopics.filter((topic) => !topic.synthetic).length === 0 && (
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
          detail={`${statusLabel} · ${boardCodes.length > 0 ? boardCodes.join(", ") : institution.trim() || "todas as instituições"}`}
        />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-xl border border-edge bg-surface p-3">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Banca</label>
            {boardCodes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {boardCodes.map((code) => (
                  <span key={code} className="km-chip">
                    {code}
                    <button
                      type="button"
                      onClick={() => onRemoveBoardCode(code)}
                      className="ml-0.5 text-muted hover:text-ink"
                      aria-label={`Remover ${code}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={boardInput}
                onChange={(e) => onBoardInputChange(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    onAddBoardCode();
                    e.preventDefault();
                  }
                }}
                placeholder="SMK, FUVEST... Enter para adicionar"
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={onAddBoardCode}
                className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted"
              >
                Add
              </button>
            </div>
          </div>

          <label className="space-y-2 rounded-xl border border-edge bg-surface p-3">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Instituição</span>
            <input
              value={institution}
              onChange={(e) => onInstitutionChange(e.target.value)}
              placeholder="USP, UNIFESP, ENARE..."
              className="w-full"
            />
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-xl border border-edge bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Ano</p>
              {selectedYears.length > 0 && (
                <button type="button" onClick={() => onSelectedYearsChange([])} className="text-xs text-muted hover:text-ink">
                  Limpar
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {YEAR_OPTIONS.map((year) => {
                const selected = selectedYears.includes(year);
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() =>
                      onSelectedYearsChange(
                        selected ? selectedYears.filter((y) => y !== year) : [...selectedYears, year],
                      )
                    }
                    className={cx("km-chip", selected && "km-chip-active")}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </div>

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
              max={maxSelectable}
              value={limit}
              onChange={(e) => onLimitChange(Math.max(1, Math.min(maxSelectable, Number(e.target.value) || 1)))}
            />
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min={1}
              max={maxSelectable}
              value={clampedLimit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{ "--track-bg": `linear-gradient(to right, var(--range-fill) 0%, var(--range-fill) ${(clampedLimit / maxSelectable) * 100}%, var(--range-rest) ${(clampedLimit / maxSelectable) * 100}%, var(--range-rest) 100%)` } as CSSProperties}
              aria-label="Quantidade de questões"
            />
            <p className="text-xs text-muted">Máximo selecionável com os filtros atuais: {maxSelectable}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
