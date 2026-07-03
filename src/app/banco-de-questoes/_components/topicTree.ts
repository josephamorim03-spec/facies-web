import type { QuestionBankTopic } from "@/lib/api";

export type TopicTreeNode = QuestionBankTopic & {
  children: TopicTreeNode[];
  treeDepth: number;
  synthetic?: boolean;
};

function normalizeTopicSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const QUESTION_BANK_AREA_CODES = new Set(["GO", "OB", "PD", "MP", "CG", "CM", "OU"]);

function topicAreaFromCode(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.startsWith("QB-")) {
    const [, area] = normalized.split("-");
    return area && QUESTION_BANK_AREA_CODES.has(area) ? area : null;
  }
  return QUESTION_BANK_AREA_CODES.has(normalized) ? normalized : null;
}

function sanitizeTopicPathParts(parts: string[]): string[] {
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  while (cleaned.length > 0 && normalizeTopicSegment(cleaned[0]) === "medicina") {
    cleaned.shift();
  }
  return cleaned;
}

function topicPathParts(topic: Pick<QuestionBankTopic, "node_name" | "node_path" | "path_label">): string[] {
  if (Array.isArray(topic.node_path) && topic.node_path.length > 0) {
    const direct = sanitizeTopicPathParts(topic.node_path.map((part) => String(part)));
    if (direct.length > 0) return direct;
  }
  if (topic.path_label?.trim()) {
    const split = topic.path_label.split(/\s*(?:\/|>)\s*/);
    const cleaned = sanitizeTopicPathParts(split);
    if (cleaned.length > 0) return cleaned;
  }
  return sanitizeTopicPathParts([topic.node_name]);
}

function topicSearchValue(topic: Pick<QuestionBankTopic, "node_name" | "node_code" | "node_path" | "path_label">): string {
  return normalizeTopicSegment(
    [
      topic.node_name,
      topic.node_code ?? "",
      topic.path_label ?? "",
      ...(topic.node_path ?? []),
    ].join(" "),
  );
}

function resolveTopicArea(
  topic: Pick<QuestionBankTopic, "knowledge_node_id" | "parent_knowledge_node_id" | "node_code">,
  topicsById: Map<string, QuestionBankTopic>,
  memo: Map<string, string | null>,
  visiting: Set<string>,
): string | null {
  const cached = memo.get(topic.knowledge_node_id);
  if (cached !== undefined) return cached;
  const direct = topicAreaFromCode(topic.node_code);
  if (direct) {
    memo.set(topic.knowledge_node_id, direct);
    return direct;
  }
  if (visiting.has(topic.knowledge_node_id)) {
    memo.set(topic.knowledge_node_id, null);
    return null;
  }
  visiting.add(topic.knowledge_node_id);
  const parentId = topic.parent_knowledge_node_id?.trim();
  const parent = parentId ? topicsById.get(parentId) : undefined;
  const resolved = parent ? resolveTopicArea(parent, topicsById, memo, visiting) : null;
  visiting.delete(topic.knowledge_node_id);
  memo.set(topic.knowledge_node_id, resolved);
  return resolved;
}

function isForbiddenStudentRoot(topic: Pick<QuestionBankTopic, "node_name" | "node_path" | "path_label">): boolean {
  return normalizeTopicSegment(topic.node_name) === "medicina" && topicPathParts(topic).length === 0;
}

export function topicPathLabel(topic: Pick<QuestionBankTopic, "node_name" | "node_path" | "path_label">): string {
  const parts = topicPathParts(topic);
  if (parts.length > 0) return parts.join(" / ");
  return topic.node_name;
}

function topicDepth(topic: QuestionBankTopic): number {
  const parts = topicPathParts(topic);
  if (parts.length > 0) return Math.max(0, parts.length - 1);
  if (typeof topic.depth === "number" && Number.isFinite(topic.depth)) return Math.max(0, topic.depth);
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

export function buildTopicTree(topics: QuestionBankTopic[]): TopicTreeNode[] {
  const byId = new Map<string, TopicTreeNode>();
  for (const topic of topics) {
    if (isForbiddenStudentRoot(topic)) continue;
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
    const pathParts = topicPathParts(node);
    const firstPath = pathParts[0]?.trim();
    const shouldGroup = Boolean(firstPath && firstPath !== node.node_name && pathParts.length > 1);
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

export function flattenTopicTree(nodes: TopicTreeNode[]): TopicTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTopicTree(node.children)]);
}

export function filterTopicsLocally(
  topics: QuestionBankTopic[],
  params: {
    area?: string;
    search?: string;
    preserveSearchAncestors?: boolean;
  } = {},
): QuestionBankTopic[] {
  const normalizedArea = String(params.area ?? "").trim().toUpperCase();
  const normalizedSearch = normalizeTopicSegment(String(params.search ?? ""));
  const topicsById = new Map(topics.map((topic) => [topic.knowledge_node_id, topic]));
  const areaMemo = new Map<string, string | null>();

  const areaFiltered = normalizedArea
    ? topics.filter(
        (topic) =>
          resolveTopicArea(topic, topicsById, areaMemo, new Set()) === normalizedArea,
      )
    : topics;

  if (!normalizedSearch) return areaFiltered;

  const filteredById = new Map(areaFiltered.map((topic) => [topic.knowledge_node_id, topic]));
  const matchedIds = new Set(
    areaFiltered
      .filter((topic) => topicSearchValue(topic).includes(normalizedSearch))
      .map((topic) => topic.knowledge_node_id),
  );

  if (!params.preserveSearchAncestors) {
    return areaFiltered.filter((topic) => matchedIds.has(topic.knowledge_node_id));
  }

  const retainedIds = new Set(matchedIds);
  for (const topicId of matchedIds) {
    let parentId = filteredById.get(topicId)?.parent_knowledge_node_id?.trim() ?? "";
    while (parentId) {
      retainedIds.add(parentId);
      parentId = filteredById.get(parentId)?.parent_knowledge_node_id?.trim() ?? "";
    }
  }
  return areaFiltered.filter((topic) => retainedIds.has(topic.knowledge_node_id));
}
