import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

const ROOT = process.cwd();

function read(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

// `/evolucao` e a tela do Acompanhar que o aluno alcanca. Este contrato lia
// `estatisticas/EstatisticasClientPage.tsx`, orfa e com 308 na raiz — protegia
// uma tela que ninguem abre enquanto a viva ficava sem guarda.
/**
 * As telas de aluno, como pares [caminho, fonte].
 *
 * Exclui `/admin` (publico diferente, dado interno e o assunto dela) e
 * `_components` de admin. Le `.tsx` porque o que chega ao aluno e JSX.
 */
function varrerTelasDeAluno() {
  const raiz = join(process.cwd(), "src", "app");
  const achados = [];
  const pilha = [raiz];
  while (pilha.length > 0) {
    const dir = pilha.pop();
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const completo = join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === "admin" || entrada.name === "api") continue;
        pilha.push(completo);
      } else if (entrada.name.endsWith(".tsx")) {
        achados.push([relative(raiz, completo), readFileSync(completo, "utf8")]);
      }
    }
  }
  return achados;
}

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

test("nenhuma tela de aluno mostra confianca do sistema nem sinal dominante cru", () => {
  // ⚠️ ESTE TESTE JA MEDIU DUAS TELAS MORTAS, uma de cada vez.
  //
  // Primeiro `desempenho/_components/DesempenhoTab.tsx`, orfa desde que
  // `/desempenho` virou redirect. Depois `estatisticas/relatorio`, apagada em
  // 2026-09-06 por nao ter porta nenhuma -- zero links de entrada, e os dois
  // botoes de voltar dela apontavam para um 308.
  //
  // Fixar o teste num ARQUIVO fez com que ele morresse junto com o arquivo,
  // duas vezes. Agora ele varre as telas de aluno que existem: quem criar uma
  // terceira que vaze o mesmo dado interno cai aqui sem precisar lembrar.
  const telas = varrerTelasDeAluno();
  assert.ok(telas.length > 20, "a varredura precisa achar as telas de aluno");
  for (const [caminho, fonte] of telas) {
    assert.equal(
      fonte.includes("Confiança do sistema"),
      false,
      caminho + " expoe a confianca do sistema ao aluno",
    );
    assert.equal(
      fonte.includes("dominant_signal ??"),
      false,
      caminho + " expoe o sinal dominante cru",
    );
  }
});
