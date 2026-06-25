"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type {
  FullExamType,
  QuestionBankAnswerStatus,
  QuestionBankResolutionMode,
  QuestionBankTopic,
  StudyKind,
} from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const AREA_SHORT_LABELS: Record<string, string> = {
  "": "Todas", GO: "GO", CM: "CM", CG: "CG", MP: "MP", PD: "PD", OU: "OU",
};

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
    // "Corrigir fraquezas"/"Quase acertei": degradam para a subvisão de erros se o
    // usuário abrir a aba Status (o subconjunto refinado só existe no servidor).
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

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterTab = "assunto" | "banca" | "ano" | "realizacao" | "modo" | "quantidade";

type TopicTreeNode = QuestionBankTopic & { children: TopicTreeNode[]; treeDepth: number };

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const sortNodes = (nodes: TopicTreeNode[]) => {
    nodes.sort((a, b) => {
      const orderA = typeof a.display_order === "number" ? a.display_order : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.display_order === "number" ? b.display_order : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return topicPathLabel(a).localeCompare(topicPathLabel(b), "pt-BR");
    });
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);
  return roots;
}

function flattenTopicTree(nodes: TopicTreeNode[]): TopicTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTopicTree(node.children)]);
}

// ─── Topic Tree Sub-components ───────────────────────────────────────────────

function TopicTreeItem({
  node, selectedIds, expandedIds, onToggle, onToggleExpand,
}: {
  node: TopicTreeNode;
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onToggle: (topic: QuestionBankTopic) => void;
  onToggleExpand: (topicId: string) => void;
}) {
  const checked = selectedIds.has(node.knowledge_node_id);
  const childCount = node.children.length;
  const expanded = childCount > 0 && expandedIds.has(node.knowledge_node_id);
  const indent = Math.min(node.treeDepth, 7) * 14;
  const selectable = node.question_count > 0;

  return (
    <div style={{ paddingLeft: `${indent}px` }}>
      <div className={cx(
        "flex items-start gap-2 rounded-xl border p-2.5 transition-colors",
        checked && selectable ? "border-primary bg-[var(--amber-tint)]" : "border-transparent",
        selectable ? "hover:border-edge hover:bg-surface" : "opacity-65",
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
        <label className={cx("flex min-w-0 flex-1 items-start gap-3", selectable ? "cursor-pointer" : "cursor-not-allowed")}>
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
            <span className={cx("block text-sm font-semibold leading-snug", selectable ? "text-ink" : "text-muted")}>{node.node_name}</span>
            {topicPathLabel(node) !== node.node_name && (
              <span className="mt-0.5 block truncate text-xs text-muted">{topicPathLabel(node)}</span>
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
      <div className="rounded-xl border border-dashed border-edge bg-surface p-4 text-sm text-muted">
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FiltersBar(props: FiltersBarProps) {
  const {
    area, search, onSearchChange, topics, selectedTopics, onToggleTopic,
    boardCodes, boardInput, onBoardInputChange,
    onAddBoardCode, onRemoveBoardCode, institution, onInstitutionChange,
    selectedYears, onSelectedYearsChange, answerStatus, onAnswerStatusChange,
    resolutionMode, onResolutionModeChange, studyKind, onStudyKindChange,
    fullExamName, onFullExamNameChange, fullExamYear, onFullExamYearChange,
    fullExamType, onFullExamTypeChange, reviewTrailEnabled, onReviewTrailEnabledChange,
    reviewTrailLocked = false, limit, clampedLimit, maxSelectable, onLimitChange,
  } = props;

  const [activeTab, setActiveTab] = useState<FilterTab | null>("assunto");
  const [suggestionsFocused, setSuggestionsFocused] = useState(false);
  const [realizacaoState, setRealizacaoState] = useState<RealizacaoState>(() => initRealizacaoState(answerStatus));
  // Sync local UI state when parent resets answerStatus (e.g. clicking an intent card)
  useEffect(() => { setRealizacaoState(initRealizacaoState(answerStatus)); }, [answerStatus]);
  // Árvore começa recolhida (como o Estratégia): rastreia o que o usuário expandiu.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Recolhida por padrão; ao buscar, revela tudo para mostrar as correspondências.
  const hasSearch = search.trim().length > 0;
  const expandedTopicIds = useMemo(
    () => (hasSearch ? new Set(topics.map((t) => t.knowledge_node_id)) : expandedIds),
    [topics, expandedIds, hasSearch],
  );

  function toggleTopicExpanded(topicId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId); else next.add(topicId);
      return next;
    });
  }

  const topicTree = buildTopicTree(topics);
  const flatTopics = flattenTopicTree(topicTree);
  const selectedTopicIds = new Set(selectedTopics.map((t) => t.knowledge_node_id));

  const TABS: { id: FilterTab; label: string; value: string; indicator: boolean }[] = [
    {
      id: "assunto",
      label: "Especialidade / Assunto",
      value: selectedTopics.length > 0
        ? `${selectedTopics.length} assunto${selectedTopics.length > 1 ? "s" : ""}`
        : (search.trim() || AREA_SHORT_LABELS[area] || "Todas"),
      indicator: selectedTopics.length > 0 || !!area || !!search.trim(),
    },
    {
      id: "banca",
      label: "Instituição",
      value: boardCodes.length > 0 ? boardCodes.join(", ") : (institution.trim() || "Todas"),
      indicator: boardCodes.length > 0 || !!institution.trim(),
    },
    {
      id: "ano",
      label: "Ano",
      value: selectedYears.length > 0 ? [...selectedYears].sort((a, b) => a - b).join(", ") : "Todos",
      indicator: selectedYears.length > 0,
    },
    {
      id: "realizacao",
      label: "Status",
      value: deriveRealizacaoLabel(realizacaoState),
      indicator: answerStatus !== "all",
    },
    {
      id: "modo",
      label: "Modo",
      value: studyKind === "full_exam" ? "Prova" : resolutionMode === "simulation" ? "Simulado" : "Treino",
      indicator: false,
    },
    {
      id: "quantidade",
      label: "Qtd",
      value: `${clampedLimit}`,
      indicator: false,
    },
  ];

  return (
    <>
      <nav
        className="flex gap-2 overflow-x-auto border-b border-edge p-3"
        aria-label="Filtros superiores"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(active ? null : tab.id)}
              className={cx(
                "relative flex min-w-[5.5rem] shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition-colors",
                active
                  ? "border-primary bg-surfaceMuted text-ink"
                  : "border-edge bg-surface text-muted hover:border-primary hover:text-ink",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">{tab.label}</span>
              <span className="mt-1 truncate text-sm font-semibold">{tab.value}</span>
              {tab.indicator && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      {activeTab && (
        <div className="border-b border-edge p-4 md:p-5">

          {activeTab === "assunto" && (
            <div className="space-y-4">
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
                    {flatTopics.slice(0, 8).map((topic) => {
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
                            <span className="text-sm font-semibold">{topic.node_name}</span>
                            <span className="text-xs text-muted">{topicPathLabel(topic)} · {topic.question_count} questões</span>
                          </button>
                        </li>
                      );
                    })}
                    {flatTopics.length === 0 && (
                      <li className="px-3 py-2 text-sm text-muted">Nenhum resultado para &ldquo;{search}&rdquo;</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto rounded-2xl border border-edge bg-paper p-2 md:max-h-[28rem]">
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTopics.map((topic) => (
                      <span key={topic.knowledge_node_id} className="km-chip">
                        {topicPathLabel(topic)}
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
                  <p className="mt-1 text-sm text-muted">Escolha um assunto específico ou use só a área como filtro.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "banca" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
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
                      if (e.key === "Enter" || e.key === ",") { onAddBoardCode(); e.preventDefault(); }
                    }}
                    placeholder="SMK, FUVEST... Enter para adicionar"
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={onAddBoardCode}
                    className="rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-surfaceMuted"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Instituição</label>
                <input
                  value={institution}
                  onChange={(e) => onInstitutionChange(e.target.value)}
                  placeholder="USP, UNIFESP, ENARE..."
                  className="w-full"
                />
              </div>
            </div>
          )}

          {activeTab === "ano" && (
            <div className="space-y-3">
              <p className="text-xs text-muted">Selecione um ou mais anos. Sem seleção = todos.</p>
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
              {selectedYears.length > 0 && (
                <button
                  type="button"
                  onClick={() => onSelectedYearsChange([])}
                  className="text-xs text-muted hover:text-ink"
                >
                  Limpar seleção
                </button>
              )}
            </div>
          )}

          {activeTab === "realizacao" && (
            <div className="space-y-4">
              <p className="text-xs text-muted">Combine os estados que deseja incluir. Sem seleção = todas.</p>
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
                  Não realizadas
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
                  Realizadas {realizacaoState.answeredExpanded ? "▲" : "▼"}
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
              {!realizacaoState.unanswered && !realizacaoState.answeredExpanded && (
                <p className="text-xs text-muted">Sem filtro — todas as questões incluídas.</p>
              )}
            </div>
          )}

          {activeTab === "modo" && (
            <div className="space-y-4">
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
                        "rounded-2xl border p-4 text-left transition-colors",
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
            </div>
          )}

          {activeTab === "quantidade" && (
            <div className="grid gap-4 md:grid-cols-[10rem_1fr] md:items-end">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Questões</span>
                <input
                  type="number" min={1} max={maxSelectable} value={limit}
                  onChange={(e) => onLimitChange(Math.max(1, Math.min(maxSelectable, Number(e.target.value) || 1)))}
                />
              </label>
              <div className="space-y-2">
                <input
                  type="range" min={1} max={maxSelectable} value={clampedLimit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  style={{ "--track-bg": `linear-gradient(to right, var(--range-fill) 0%, var(--range-fill) ${(clampedLimit / maxSelectable) * 100}%, var(--range-rest) ${(clampedLimit / maxSelectable) * 100}%, var(--range-rest) 100%)` } as CSSProperties}
                  aria-label="Quantidade de questões"
                />
                <p className="text-xs text-muted">Máximo selecionável com os filtros atuais: {maxSelectable}</p>
              </div>
            </div>
          )}

        </div>
      )}
    </>
  );
}
