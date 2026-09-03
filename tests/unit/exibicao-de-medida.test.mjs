import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
/**
 * ⚠️ A EVOLUCAO E' TRES ARQUIVOS AGORA, e o guard le' os tres.
 *
 * Ele lia so' `page.tsx`. Quando a tela virou os sete cartoes do artboard `9b`,
 * a pagina ficou com dez linhas e a logica desceu para `EvolucaoClientPage.tsx`
 * e `_lib/leitura.ts` -- e a varredura de frases proibidas passou a medir
 * QUASE NADA, continuando verde. Guard que segue o ARQUIVO, e nao a regra, e' um
 * guard que a refatoracao desliga sem avisar.
 */
const evolucao = [
  "../../src/app/evolucao/page.tsx",
  "../../src/app/evolucao/EvolucaoClientPage.tsx",
  "../../src/app/evolucao/_lib/leitura.ts",
]
  .map((caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8"))
  .join(String.fromCharCode(10));

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
  //
  // ⚠️ O ALVO DEIXOU DE SER UMA LISTA DE ARQUIVOS, e essa é a correção.
  //
  // A lista tinha `MapaDaProva` e `ProvaReport`, e envelheceu duas vezes: a
  // grafia saiu do `FaciesReport` quando a lista numerada virou mapa, e saiu do
  // `ProvaReport` quando ele tambem adotou o mapa e parou de imprimir contagem
  // por celula. Um guard que exige a grafia num arquivo que legitimamente nao a
  // tem mais so falha alto e ensina a ignorar a suite — foi o que a versao
  // anterior deste comentario ja tinha registrado, e aconteceu de novo.
  //
  // A regra que NAO envelhece tem duas metades: (1) a grafia canonica existe em
  // algum lugar do funil publico, e (2) nenhuma grafia concorrente existe em
  // lugar nenhum dele. Assim mover a regra de arquivo nao quebra o teste, e
  // reintroduzir "<5" quebra — que e exatamente o que se quer prender.
  const dir = new URL("../../src/components/facies/", import.meta.url);
  const arquivos = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));

  const comGrafia = arquivos.filter((f) =>
    /menos de \{PISO_N_CELULA\}/.test(readFileSync(new URL(f, dir), "utf8")),
  );
  assert.ok(
    comGrafia.length > 0,
    "a grafia canonica 'menos de {PISO_N_CELULA}' sumiu do funil publico",
  );

  for (const f of arquivos) {
    const src = readFileSync(new URL(f, dir), "utf8");
    assert.doesNotMatch(src, /&lt;\{PISO_N_CELULA\}/, `${f} usa a grafia "<n"`);
    // `3 de 5`: a contagem crua no lugar da regra. O que a torna reconhecivel e
    // o PISO ao lado, entao o padrao mira nele.
    assert.doesNotMatch(
      src,
      /\{\w+\.n\} de \{PISO_N_CELULA\}/,
      `${f} usa a grafia "n de 5"`,
    );
  }
});

test("a comparacao entre areas nao existe mais", () => {
  // Ela vivia em "Melhor área" / "Área a observar", e com UMA questão elegia as
  // duas: a tela anunciava "Melhor área: 100%" sobre um denominador de 1.
  //
  // Os sete cartoes do `9b` nao comparam areas entre si -- comparam o aluno com
  // o PESO DA PROVA ("onde mais escapa"), que e uma pergunta com base nos dois
  // lados por construcao. O invariante passa a ser a AUSENCIA.
  for (const proibido of [/Melhor área/i, /Área a observar/i]) {
    assert.doesNotMatch(evolucao, proibido);
  }
});

test("nenhum numero sai sem a base que o sustenta", () => {
  // A regra nao mudou; o formato mudou. Onde havia `accuracy(taxa, n)`, a base
  // passou a viajar no proprio contrato dos cartoes: a projecao carrega `base`
  // e a imprime ("N questões respondidas"), e a fila de escape carrega
  // `respostas` e marca `abaixoDoPiso`. "100%" sobre uma questao continua sendo
  // o defeito que este teste existe para impedir.
  assert.match(evolucao, /questões respondidas/);
  assert.match(evolucao, /abaixoDoPiso/);
  // E a faixa nunca some: numero de projecao sem intervalo e promessa.
  assert.match(evolucao, /faixaMin/);
  assert.match(evolucao, /faixaMax/);
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
