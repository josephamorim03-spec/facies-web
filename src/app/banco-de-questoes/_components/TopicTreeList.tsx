"use client";

import type { QuestionBankTopic } from "@/lib/api";
import type { TopicTreeNode } from "./topicTree";
import { topicPathLabel } from "./topicTree";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type TopicTreeListProps = {
  nodes: TopicTreeNode[];
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onToggle: (topic: QuestionBankTopic) => void;
  onToggleExpand: (topicId: string) => void;
};

type TopicTreeItemProps = Omit<TopicTreeListProps, "nodes"> & {
  node: TopicTreeNode;
};

function TopicTreeItem({
  node,
  selectedIds,
  expandedIds,
  onToggle,
  onToggleExpand,
}: TopicTreeItemProps) {
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
          <TopicTreeList
            nodes={node.children}
            selectedIds={selectedIds}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onToggleExpand={onToggleExpand}
          />
        </div>
      )}
    </div>
  );
}

export function TopicTreeList({
  nodes,
  selectedIds,
  expandedIds,
  onToggle,
  onToggleExpand,
}: TopicTreeListProps) {
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
