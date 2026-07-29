import type { QuestionBankTopic } from "@/lib/api";

export const QUESTION_BANK_LIMIT_CAP = 120;

export type QuestionBankEntryContext = {
  reviewTaskId: string | null;
  activityId: string | null;
  source: "calendar-review" | null;
  dateISO: string | null;
  area: string | null;
  theme: string | null;
  knowledgeNodeId: string | null;
  expectedQuestions: number | null;
};

type SearchParamReader = { get(name: string): string | null };

export function clampQuestionLimit(value: number | null | undefined, fallback = 10, maximum = QUESTION_BANK_LIMIT_CAP) {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.max(1, Math.min(maximum, Math.trunc(numericValue)));
}

export function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseQuestionBankEntryContext(params: SearchParamReader | null): QuestionBankEntryContext {
  if (!params) {
    return {
      reviewTaskId: null, activityId: null, source: null, dateISO: null, area: null,
      theme: null, knowledgeNodeId: null, expectedQuestions: null,
    };
  }
  const source = params.get("source") === "calendar-review" ? "calendar-review" : null;
  return {
    reviewTaskId: params.get("review_task_id")?.trim() || null,
    activityId: params.get("activity_id")?.trim() || null,
    source,
    dateISO: params.get("date")?.trim() || null,
    area: params.get("area")?.trim().toUpperCase() || null,
    theme: params.get("theme")?.trim() || null,
    knowledgeNodeId: params.get("knowledge_node_id")?.trim() || null,
    expectedQuestions: parsePositiveInt(params.get("expected_questions")),
  };
}

function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

/**
 * IDs are authoritative. Legacy entries may only use an unambiguous exact label;
 * fuzzy matching is intentionally avoided so a review never opens on a wrong topic.
 */
export function resolveEntryTopic(
  topics: QuestionBankTopic[],
  context: Pick<QuestionBankEntryContext, "knowledgeNodeId" | "theme" | "area">,
): QuestionBankTopic | null {
  if (context.knowledgeNodeId) {
    return topics.find((topic) => topic.knowledge_node_id === context.knowledgeNodeId) ?? null;
  }
  const legacyName = normalize(context.theme);
  if (!legacyName) return null;
  const matching = topics.filter((topic) => {
    const inArea = !context.area || normalize(topic.node_code).includes(normalize(context.area));
    return inArea && normalize(topic.node_name) === legacyName;
  });
  return matching.length === 1 ? matching[0] : null;
}

export type ActiveFilter = { id: string; label: string; topicId?: string };

export function getActiveFilters(params: {
  area: string;
  boardCodes: string[];
  examCodes: string[];
  institutions: string[];
  stateCodes: string[];
  selectedYears: number[];
  includeNoYear: boolean;
  answerStatus: string;
  correctionStatus: string;
  selectedTopics: QuestionBankTopic[];
  search: string;
  defaultExamCodes: string[];
}): ActiveFilter[] {
  const filters: ActiveFilter[] = [];
  if (params.area) filters.push({ id: "area", label: params.area });
  for (const topic of params.selectedTopics) filters.push({ id: `topic:${topic.knowledge_node_id}`, label: topic.node_name, topicId: topic.knowledge_node_id });
  for (const code of params.boardCodes) filters.push({ id: `board:${code}`, label: code });
  for (const code of params.examCodes.filter((code) => !params.defaultExamCodes.includes(code))) filters.push({ id: `exam:${code}`, label: code });
  for (const institution of params.institutions) filters.push({ id: `institution:${institution}`, label: institution });
  for (const state of params.stateCodes) filters.push({ id: `state:${state}`, label: state });
  for (const year of params.selectedYears) filters.push({ id: `year:${year}`, label: String(year) });
  if (params.includeNoYear) filters.push({ id: "no-year", label: "Sem ano" });
  if (params.answerStatus !== "unanswered") filters.push({ id: "answer-status", label: "Status de resolução" });
  if (params.correctionStatus !== "all") filters.push({ id: "correction-status", label: "Correção IA" });
  if (params.search.trim()) filters.push({ id: "search", label: params.search.trim() });
  return filters;
}

export function questionBankCtaLabel(limit: number, resolutionMode: "training" | "simulation", studyKind: string): string {
  if (studyKind === "full_exam") return `Começar prova · ${limit} questões`;
  return `Começar ${limit} questões · ${resolutionMode === "training" ? "correção imediata" : "pós-resultado"}`;
}
