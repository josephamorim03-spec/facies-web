"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { QuestionBankAnswerStatus, QuestionBankResolutionMode, QuestionBankTopic } from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const AREAS = ["", "GO", "CM", "CG", "MP", "PD", "OU"] as const;
const QUICK_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;

const AREA_LABELS: Record<string, string> = {
  "": "Todas", GO: "GO", CM: "Clínica Médica", CG: "Cirurgia Geral",
  MP: "Preventiva", PD: "Pediatria", OU: "Outras",
};

const REALIZACAO_OPTIONS: { value: QuestionBankAnswerStatus; label: string; help: string }[] = [
  { value: "unanswered", label: "Não realizadas", help: "Questões ainda não respondidas." },
  { value: "answered", label: "Já realizadas", help: "Tudo que já recebeu tentativa." },
  { value: "all", label: "Todas", help: "Mistura disponíveis e já feitas." },
];

const MODO_OPTIONS: { value: QuestionBankResolutionMode; label: string; help: string }[] = [
  { value: "simulation", label: "Simulado", help: "Correção só no final." },
  { value: "training", label: "Treino", help: "Correção manual item a item." },
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
  yearFrom: string;
  onYearFromChange: (v: string) => void;
  yearTo: string;
  onYearToChange: (v: string) => void;
  answerStatus: QuestionBankAnswerStatus;
  onAnswerStatusChange: (v: QuestionBankAnswerStatus) => void;
  resolutionMode: QuestionBankResolutionMode;
  onResolutionModeChange: (v: QuestionBankResolutionMode) => void;
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
    nodes.sort((a, b) => topicPathLabel(a).localeCompare(topicPathLabel(b), "pt-BR"));
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

  return (
    <div style={{ paddingLeft: `${indent}px` }}>
      <div className={cx(
        "flex items-start gap-2 rounded-xl border p-2.5 transition-colors",
        checked ? "border-primary bg-[var(--amber-tint)]" : "border-transparent hover:border-edge hover:bg-surface",
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
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(node)}
            className="mt-1 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {node.node_code ?? "OU"} · {node.question_count} questões
              {childCount > 0 ? ` · ${childCount} subassunto${childCount > 1 ? "s" : ""}` : ""}
            </span>
            <span className="mt-0.5 block text-sm font-semibold leading-snug text-ink">{node.node_name}</span>
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
    area, onAreaChange, search, onSearchChange, topics, selectedTopics, onToggleTopic,
    boardCodes, boardInput, onBoardInputChange,
    onAddBoardCode, onRemoveBoardCode, institution, onInstitutionChange,
    yearFrom, onYearFromChange, yearTo, onYearToChange, answerStatus, onAnswerStatusChange,
    resolutionMode, onResolutionModeChange, limit, clampedLimit, maxSelectable, onLimitChange,
  } = props;

  const [activeTab, setActiveTab] = useState<FilterTab | null>("assunto");
  const [suggestionsFocused, setSuggestionsFocused] = useState(false);
  // Tracks IDs the user has manually collapsed
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  // All topic IDs are expanded by default; subtract user-collapsed ones
  const expandedTopicIds = useMemo(
    () => {
      const all = new Set(topics.map((t) => t.knowledge_node_id));
      for (const id of collapsedIds) all.delete(id);
      return all;
    },
    [topics, collapsedIds],
  );

  function toggleTopicExpanded(topicId: string) {
    setCollapsedIds((prev) => {
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
      label: "Área / Assunto",
      value: selectedTopics.length > 0
        ? `${selectedTopics.length} tema${selectedTopics.length > 1 ? "s" : ""}`
        : (search.trim() || AREA_LABELS[area] || "Todas"),
      indicator: selectedTopics.length > 0 || !!area || !!search.trim(),
    },
    {
      id: "banca",
      label: "Banca / Instituição",
      value: boardCodes.length > 0 ? boardCodes.join(", ") : (institution.trim() || "Todas"),
      indicator: boardCodes.length > 0 || !!institution.trim(),
    },
    {
      id: "ano",
      label: "Ano",
      value: yearFrom || yearTo ? `${yearFrom || "1990"} - ${yearTo || "2026"}` : "Todos",
      indicator: !!yearFrom || !!yearTo,
    },
    {
      id: "realizacao",
      label: "Realização",
      value: REALIZACAO_OPTIONS.find((opt) => opt.value === answerStatus)?.label ?? "Não realizadas",
      indicator: answerStatus !== "unanswered",
    },
    {
      id: "modo",
      label: "Modo",
      value: resolutionMode === "simulation" ? "Simulado" : "Treino",
      indicator: false,
    },
    {
      id: "quantidade",
      label: "Quantidade",
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
                "relative flex min-w-[9.5rem] shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition-colors",
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
              <div className="flex flex-wrap gap-2">
                {AREAS.map((areaOption) => (
                  <button
                    key={areaOption || "all"}
                    type="button"
                    onClick={() => onAreaChange(areaOption)}
                    className={cx("km-chip", area === areaOption && "km-chip-active")}
                  >
                    {AREA_LABELS[areaOption]}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setSuggestionsFocused(true)}
                  onBlur={() => setTimeout(() => setSuggestionsFocused(false), 150)}
                  placeholder="Buscar assunto, tema ou microcompetência"
                  className="w-full"
                />
                {suggestionsFocused && search.trim() && (
                  <ul className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 max-h-72 overflow-y-auto rounded-xl border border-edge bg-surface shadow-[var(--soft-shadow)]">
                    {flatTopics.slice(0, 8).map((topic) => (
                      <li key={topic.knowledge_node_id}>
                        <button
                          type="button"
                          onMouseDown={() => {
                            onToggleTopic(topic);
                            onSearchChange("");
                            setSuggestionsFocused(false);
                          }}
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-surfaceMuted"
                        >
                          <span className="text-sm font-semibold">{topic.node_name}</span>
                          <span className="text-xs text-muted">{topicPathLabel(topic)} · {topic.question_count} questões</span>
                        </button>
                      </li>
                    ))}
                    {flatTopics.length === 0 && (
                      <li className="px-3 py-2 text-sm text-muted">Nenhum resultado para &ldquo;{search}&rdquo;</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="max-h-[28rem] overflow-y-auto rounded-2xl border border-edge bg-paper p-2">
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
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[8rem_8rem_auto] sm:items-end">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">De</span>
                  <input
                    type="number" min={1990} max={2026} value={yearFrom}
                    onChange={(e) => onYearFromChange(e.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Até</span>
                  <input
                    type="number" min={1990} max={2026} value={yearTo}
                    onChange={(e) => onYearToChange(e.target.value)}
                  />
                </label>
                {(yearFrom || yearTo) && (
                  <button
                    type="button"
                    onClick={() => { onYearFromChange(""); onYearToChange(""); }}
                    className="rounded-xl border border-edge px-4 py-2 text-sm text-muted hover:border-primary hover:text-ink"
                  >
                    Limpar anos
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_YEARS.map((year) => {
                  const ys = String(year);
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => { onYearFromChange(ys); onYearToChange(ys); }}
                      className={cx("km-chip", yearFrom === ys && yearTo === ys && "km-chip-active")}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "realizacao" && (
            <div className="grid gap-3 md:grid-cols-3">
              {REALIZACAO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onAnswerStatusChange(option.value)}
                  className={cx(
                    "rounded-2xl border p-4 text-left transition-colors",
                    answerStatus === option.value ? "border-primary bg-surfaceMuted" : "border-edge bg-surface hover:border-primary",
                  )}
                >
                  <span className="block text-sm font-semibold text-ink">{option.label}</span>
                  <span className="mt-1 block text-xs text-muted">{option.help}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "modo" && (
            <div className="grid gap-3 md:grid-cols-2">
              {MODO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onResolutionModeChange(option.value)}
                  className={cx(
                    "rounded-2xl border p-4 text-left transition-colors",
                    resolutionMode === option.value ? "border-primary bg-surfaceMuted" : "border-edge bg-surface hover:border-primary",
                  )}
                >
                  <span className="block text-sm font-semibold text-ink">{option.label}</span>
                  <span className="mt-1 block text-xs text-muted">{option.help}</span>
                </button>
              ))}
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
