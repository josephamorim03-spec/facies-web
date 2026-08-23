import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * §13.3 — o que nunca vira número na tela.
 *
 * O módulo é TypeScript e este runner é `node:test` sem transpilação, então o
 * que se mede aqui é o texto-fonte. Não é ideal, mas é o mesmo padrão que
 * `paper-design-system.test.mjs` já usa para o CSS, e prende exatamente as
 * regras que uma refatoração distraída quebraria sem ninguém notar — porque
 * quebrá-las não causa erro, causa um número errado numa tela.
 */
const fonte = readFileSync(new URL("../../src/lib/exibicaoDeMedida.ts", import.meta.url), "utf8");
const evolucao = readFileSync(new URL("../../src/app/evolucao/page.tsx", import.meta.url), "utf8");

/**
 * Comentários fora, para as asserções negativas medirem CÓDIGO.
 *
 * Sem isto, o comentário que explica "aqui vivia `questions_seen > 0`" reprova o
 * teste que proíbe `questions_seen > 0` — e a saída seria apagar a explicação
 * para agradar o guard, que é exatamente a troca errada.
 */
const evolucaoCodigo = evolucao
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

test("o piso e 5, e o numero nao e escolhido aqui", () => {
  assert.match(fonte, /export const PISO_N_CELULA = 5;/);
  // Três derivações independentes convergiram em 5: o `piso_n_celula` do
  // dataset público, o `PRIOR_STRENGTH` do Beta-Binomial e o
  // `MIN_EXPOSURE_FOR_DEDICATED_ACTIVITY` do plano. O comentário que registra
  // isso é o que impede alguém de "ajustar para 3" achando que é preferência.
  assert.match(fonte, /piso_n_celula/);
  assert.match(fonte, /PRIOR_STRENGTH/);
  assert.match(fonte, /MIN_EXPOSURE_FOR_DEDICATED_ACTIVITY/);
});

test('"nao avaliado" e "zero" sao estados distintos', () => {
  // O colapso dos dois é a falha mais cara do §13.3: escrever "0%" para quem
  // nunca respondeu acusa o aluno de errar o que ele não tentou.
  assert.match(fonte, /estado: "nao_avaliado"/);
  assert.match(fonte, /return "Não avaliado";/);
  // E o zero legítimo continua sendo zero: n acima do piso com fração 0 cai em
  // `medido` e imprime "0%".
  assert.match(fonte, /case "medido":\s*\n\s*return `\$\{Math\.round\(medida\.fracao \* 100\)\}%`;/);
});

test("abaixo do piso o valor NAO e numero nenhum", () => {
  // A regra ficou mais forte do que era. Antes o ramo mostrava a contagem
  // ("3 de 5"); numa tela cheia de taxas isso lê como TRÊS ACERTOS EM CINCO —
  // exatamente o número que o §13.3 existe para não mostrar. Agora o valor em
  // destaque diz só que não há base, e o `n` vai para a linha de contexto.
  const rotulo = fonte.match(/export function rotuloSemBase[\s\S]*?return ([^;]+);/);
  assert.ok(rotulo, "`rotuloSemBase` sumiu");
  assert.doesNotMatch(rotulo[1], /100|%/);
  assert.match(rotulo[1], /menos de/);

  // E o ramo passa por ele, em vez de escrever a própria versão: já houve três
  // grafias diferentes da mesma regra neste produto.
  const semBase = fonte.match(/case "sem_base":[\s\S]*?return ([^;]+);/);
  assert.ok(semBase, "o ramo `sem_base` de `valorDaMedida` sumiu");
  assert.match(semBase[1], /rotuloSemBase\(\)/);
});

test("uma grafia so para 'sem base', no app e no funil publico", () => {
  // "menos de 5", "<5" e "3 de 5" conviveram para a MESMA regra, em componentes
  // com a mesma forma de linha. Regra de exibição que se escreve de três jeitos
  // não é uma regra, são três — e quem lê não tem como saber que são a mesma.
  for (const rel of [
    "../../src/components/facies/FaciesReport.tsx",
    "../../src/components/facies/ProvaReport.tsx",
  ]) {
    const src = readFileSync(new URL(rel, import.meta.url), "utf8");
    assert.match(src, /menos de \{PISO_N_CELULA\}/, `${rel} nao usa a grafia unica`);
    assert.doesNotMatch(src, /&lt;\{PISO_N_CELULA\}/, `${rel} ainda usa "<n"`);
  }
});

test("comparacao exige base nos DOIS lados", () => {
  // Aqui vivia `questions_seen > 0`: UMA questão elegia a melhor e a pior área,
  // e a tela anunciava "Melhor área: 100%" sobre um denominador de 1.
  assert.doesNotMatch(evolucaoCodigo, /questions_seen > 0/);
  assert.match(evolucao, /comparavel\(classificar\(area\.accuracy, area\.questions_seen\)\)/);
  // Uma área só não produz "melhor E pior": seria a mesma célula com dois
  // rótulos opostos, sugerindo uma diferença que ninguém mediu.
  assert.match(evolucao, /sorted\.length < 2/);
});

test("nenhuma taxa e formatada sem o denominador junto", () => {
  // `accuracy(x)` com um argumento só é a assinatura antiga — a que não tinha
  // como saber se "100%" veio de 1 ou de 200 respostas.
  const chamadas = [...evolucao.matchAll(/\baccuracy\(([^)]*)\)/g)].map((m) => m[1]);
  assert.ok(chamadas.length > 0, "nenhuma chamada de `accuracy` encontrada");
  for (const args of chamadas) {
    assert.match(args, /,/, `\`accuracy(${args})\` foi chamada sem o denominador`);
  }
});

test("projecao de nota, chance de aprovacao e comparacao com colegas nao existem", () => {
  // O §13.3 proíbe os três por nome. Nenhum deles chegou a ser construído; o
  // teste existe para que continuem não existindo — são exatamente o tipo de
  // coisa que entra "só como estimativa" e vira a métrica que o aluno persegue.
  for (const proibido of [
    /projeç(ão|ao) de nota/i,
    /chance de aprova/i,
    /probabilidade de aprova/i,
    /nota prevista/i,
    /percentil/i,
    /acima da m(é|e)dia dos alunos/i,
  ]) {
    assert.doesNotMatch(evolucao, proibido);
  }
});
