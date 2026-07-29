import assert from "node:assert/strict";
import test from "node:test";

import {
  clampQuestionLimit,
  getActiveFilters,
  parseQuestionBankEntryContext,
  questionBankCtaLabel,
  resolveEntryTopic,
} from "../../src/app/banco/_lib/sessionBuilder.ts";

const specialty = {
  knowledge_node_id: "pd",
  parent_knowledge_node_id: null,
  node_code: "PD",
  node_name: "Pediatria",
  node_type: "specialty",
  node_path: ["Medicina", "Pediatria"],
  path_label: "Medicina / Pediatria",
};

const puericultura = {
  ...specialty,
  knowledge_node_id: "pd-puericultura",
  parent_knowledge_node_id: "pd",
  node_name: "Puericultura",
  node_type: "theme",
  node_path: ["Medicina", "Pediatria", "Puericultura"],
};

test("calendar context prefers the normalized knowledge-node ID", () => {
  const context = parseQuestionBankEntryContext(new URLSearchParams(
    "source=calendar-review&activity_id=review-1&knowledge_node_id=pd-puericultura&theme=Puericultura",
  ));
  assert.equal(context.source, "calendar-review");
  assert.equal(context.activityId, "review-1");
  assert.equal(resolveEntryTopic([specialty, puericultura], context)?.knowledge_node_id, "pd-puericultura");
});

test("legacy topic fallback accepts only an unambiguous exact name", () => {
  assert.equal(
    resolveEntryTopic([specialty, puericultura], { knowledgeNodeId: null, theme: "Puericultura", area: "PD" })?.knowledge_node_id,
    "pd-puericultura",
  );
  assert.equal(
    resolveEntryTopic([puericultura, { ...puericultura, knowledge_node_id: "duplicate" }], { knowledgeNodeId: null, theme: "Puericultura", area: "PD" }),
    null,
  );
});

test("filter count includes the default access-direct choice and quantity is clamped at commit boundaries", () => {
  assert.equal(clampQuestionLimit(-10), 1);
  assert.equal(clampQuestionLimit(400), 120);
  assert.deepEqual(getActiveFilters({
    area: "",
    boardCodes: [],
    examCodes: ["ACESSO-DIRETO"],
    institutions: [],
    stateCodes: [],
    selectedYears: [],
    includeNoYear: false,
    answerStatus: "unanswered",
    correctionStatus: "all",
    selectedTopics: [puericultura],
    search: "",
    defaultExamCodes: ["ACESSO-DIRETO"],
  }).map((filter) => filter.label), ["Puericultura", "Acesso Direto"]);
  assert.equal(questionBankCtaLabel(10, "simulation", "topic"), "Começar 10 questões · pós-resultado");
});
