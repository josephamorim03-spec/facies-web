import assert from "node:assert/strict";
import test from "node:test";

import {
  clampQuestionLimit,
  getActiveFilters,
  motivoParaNaoComecar,
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
  assert.equal(
    questionBankCtaLabel(10, "immediate", "topic"),
    "Começar 10 questões · corrige a cada questão",
  );
});

test("o CTA diz como sera corrigido tambem na prova institucional", () => {
  // A prova retornava cedo e omitia a correcao. Somado ao fato de que escolher a
  // prova SOBRESCREVIA a correcao em silencio, o aluno nao tinha nenhum lugar
  // onde ver o que ia receber. Os dois eixos aparecem sempre.
  assert.equal(
    questionBankCtaLabel(100, "reveal_all", "full_exam"),
    "Começar prova · 100 questões · corrige tudo ao terminar",
  );
  assert.equal(
    questionBankCtaLabel(100, "guided_choice", "full_exam"),
    "Começar prova · 100 questões · corrige ao terminar, uma a uma",
  );
});

test("tipo de estudo e correcao sao eixos independentes no rotulo", () => {
  const porTopico = questionBankCtaLabel(20, "reveal_all", "topic");
  const prova = questionBankCtaLabel(20, "reveal_all", "full_exam");
  // Mesma correcao nos dois: o que muda e' so o tipo de estudo.
  assert.ok(porTopico.endsWith("corrige tudo ao terminar"));
  assert.ok(prova.endsWith("corrige tudo ao terminar"));
  assert.notEqual(porTopico, prova);
});

// ─── motivoParaNaoComecar ────────────────────────────────────────────────────
//
// Dois dos quatro motivos de `canStartConfigured` nao tinham explicacao: o CTA
// ficava desabilitado e MUDO. O pior era a prova — sem instituicao e ano nao ha
// o que contar, e era o "modo prova nao inicia de forma clara" relatado.

const baseEstado = {
  studyKind: "topic",
  fullExamReady: false,
  fullExamName: "",
  fullExamYear: 2025,
  // O que já foi escolhido, SEPARADO do rótulo — ver o teste do ano abaixo.
  temBanca: false,
  temAno: false,
  loadingPreview: false,
  availableCount: 10,
  totalCount: 10,
  answerStatus: "all",
  activeFilterCount: 0,
};

test("pode comecar: sem motivo, sem texto inventado", () => {
  assert.equal(motivoParaNaoComecar(baseEstado), null);
});

test("carregando nao inventa motivo", () => {
  assert.equal(
    motivoParaNaoComecar({ ...baseEstado, loadingPreview: true, availableCount: 0 }),
    null,
  );
});

test("prova sem banca diz o que falta -- e manda ESCOLHER, nao digitar", () => {
  // A copia mudou junto com o controle: a instituicao saiu de um campo de
  // texto livre para o seletor. Dizer "informe a instituicao" mandava
  // procurar uma caixa que deixou de existir -- e era o texto digitado ali
  // que o payload enviava como chave, casando zero no acervo.
  const motivo = motivoParaNaoComecar({ ...baseEstado, studyKind: "full_exam" });
  assert.match(motivo, /escolha a banca/i);
  assert.doesNotMatch(motivo, /informe/i);
});

test("prova com banca e SEM ano cobra o ANO — não a banca", () => {
  // O caso visto na tela do operador (2026-09-10): a banca estava escolhida, o
  // ano não, e a tela pedia a BANCA.
  //
  // ⚠️ A versão anterior deste teste passava `fullExamName: "USP-SP"` e passava
  // VERDE sobre o código defeituoso — porque o código lia o rótulo, e o rótulo
  // sai de `provaEscolhida`, que é `null` quando falta QUALQUER um dos dois. O
  // teste reproduzia a confusão em vez de a denunciar.
  const motivo = motivoParaNaoComecar({
    ...baseEstado,
    studyKind: "full_exam",
    temBanca: true,
    temAno: false,
    fullExamName: "",
    fullExamYear: null,
  });

  assert.match(motivo, /ano/i);
  assert.doesNotMatch(motivo, /banca/i, "pediu a banca, que já estava escolhida");
});

test("prova sem banca e COM ano cobra a banca", () => {
  const motivo = motivoParaNaoComecar({
    ...baseEstado, studyKind: "full_exam", temBanca: false, temAno: true,
  });

  assert.match(motivo, /banca/i);
  assert.doesNotMatch(motivo, /\bano\b/i);
});

test("sem nenhum dos dois, cobra a BANCA primeiro", () => {
  // Uma coisa de cada vez, e nesta ordem: a banca decide quais anos existem.
  // Pedir os dois juntos daria uma frase que o aluno nao satisfaz de uma vez.
  const motivo = motivoParaNaoComecar({
    ...baseEstado, studyKind: "full_exam", temBanca: false, temAno: false,
  });

  assert.match(motivo, /banca/i);
  assert.doesNotMatch(motivo, /ano/i);
});

test("prova vazia NAO manda remover filtro -- o filtro e' a prova", () => {
  const motivo = motivoParaNaoComecar({
    ...baseEstado, studyKind: "full_exam", fullExamReady: true,
    fullExamName: "USP-SP", fullExamYear: 2023, availableCount: 0, totalCount: 0,
  });
  assert.match(motivo, /USP-SP/);
  assert.doesNotMatch(motivo, /remova um filtro/i);
});

test("treino vazio COM filtro manda remover filtro", () => {
  const motivo = motivoParaNaoComecar({
    ...baseEstado, availableCount: 0, totalCount: 0, activeFilterCount: 2,
  });
  assert.match(motivo, /remova um filtro/i);
});

test("tudo respondido explica o historico, nao o filtro", () => {
  const motivo = motivoParaNaoComecar({
    ...baseEstado, availableCount: 0, totalCount: 40, answerStatus: "unanswered",
  });
  assert.match(motivo, /40/);
  assert.match(motivo, /histórico/i);
});
