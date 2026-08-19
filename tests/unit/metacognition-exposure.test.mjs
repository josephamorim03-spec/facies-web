import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

// `/evolucao` e a tela do Acompanhar que o aluno alcanca. Este contrato lia
// `estatisticas/EstatisticasClientPage.tsx`, orfa e com 308 na raiz — protegia
// uma tela que ninguem abre enquanto a viva ficava sem guarda.
test("Acompanhar nao expoe modelo ou aba metacognitiva", () => {
  const source = read("src/app/evolucao/page.tsx");

  assert.equal(source.includes("MetacognitionInsights"), false);
  assert.equal(source.includes("MeuModelo"), false);
  assert.equal(source.includes("metacognicao"), false);
  assert.equal(source.includes("Metacognição"), false);
});

test("Banco nao renderiza recomendacao automatica de questoes", () => {
  const source = read("src/app/banco/page.tsx");

  // Herdado de um contrato que lia `estatisticas/_components/BancoDeQuestoesInsights.tsx`,
  // componente sem importador nenhum. A regra — nao mostrar percentual
  // comportamental cru ao aluno — vale para a tela viva, entao mudou de arquivo
  // em vez de sumir junto com o componente morto.
  assert.equal(source.includes("Padrão comportamental"), false);
  assert.equal(source.includes("Sensibilidade a pegadinhas"), false);
  assert.equal(source.includes("Excesso de confiança"), false);
  assert.equal(source.includes("Taxa impulsiva"), false);
  assert.equal(source.includes("hasMetacognition"), false);

  assert.equal(source.includes("getQuestionBankNextAction"), false);
  assert.equal(source.includes("adaptive_weight_score"), false);
  assert.equal(source.includes("adaptive_weight_factors"), false);
  assert.equal(source.includes("classification_confidence_mean"), false);
  assert.equal(source.includes("Prioridade {percent}/100"), false);
  assert.equal(source.includes("<RecommendedTopicsPanel"), false);
});

test("Diagnostico de acompanhamento nao mostra confianca do sistema nem sinal dominante cru", () => {
  const desempenho = read("src/app/desempenho/_components/DesempenhoTab.tsx");
  const relatorio = read("src/app/estatisticas/relatorio/RelatorioClientPage.tsx");

  for (const source of [desempenho, relatorio]) {
    assert.equal(source.includes("Confiança do sistema"), false);
    assert.equal(source.includes("dominant_signal ??"), false);
  }
});
