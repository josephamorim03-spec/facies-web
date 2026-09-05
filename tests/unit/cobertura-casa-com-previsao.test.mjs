import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { dec } from "../../src/lib/decimal.ts";

/**
 * A cobertura publicada tem de descrever a lista publicada.
 *
 * `cobertura.json` diz "estes N assuntos cobrem X% da prova". Esse X foi medido
 * para um N específico, numa curva construída fora de amostra. Se a lista for
 * reexportada com outro tamanho — ou outro conteúdo — e a cobertura não for
 * regerada, os dois arquivos passam a descrever listas diferentes.
 *
 * ## Por que um teste, se a página já se protege
 *
 * `coberturaDaListaPublicada` compara o sha e o `top_n`, e devolve `null` quando
 * divergem — então o bloco SOME em vez de mentir. Isso é seguro e é silencioso:
 * a página perderia a frase mais útil que tem e ninguém saberia por quê.
 *
 * Este teste transforma o silêncio em falha de build. É a mesma razão de
 * `previsao-hash.test.mjs` existir: editar um JSON não quebra typecheck, lint
 * nem build, e sem um guard a divergência vive.
 *
 * ⚠️ E ele compara o `top_n` DECLARADO com o número de itens REALMENTE na lista,
 * não um com o outro apenas. Um artefato que dissesse `top_n: 42` e trouxesse 30
 * itens passaria numa checagem que só olhasse os dois campos declarados.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, raiz), "utf8"));

const PREVISAO = ler("src/data/facies/previsao.json");
const COBERTURA = ler("src/data/facies/cobertura.json");

test("a cobertura descreve a MESMA previsão que está publicada", () => {
  assert.equal(
    COBERTURA.previsao_sha256,
    PREVISAO.content_sha256,
    "cobertura.json foi medido para outra lista — regere com " +
      "`scripts/build_cobertura_dataset.py --escrever`",
  );
});

test("o tamanho declarado bate nos três lugares", () => {
  const grao = PREVISAO.headline_grain;
  const itens = PREVISAO.predictions[grao].lista.length;
  assert.equal(PREVISAO.base_composition.top_n, itens, "o registro declara um tamanho e traz outro");
  assert.equal(COBERTURA.top_n, itens, "a cobertura foi medida para outro tamanho");
  assert.equal(COBERTURA.grao, grao, "a cobertura foi medida noutro grão");
});

test("o ponto publicado existe na curva medida, e não foi interpolado", () => {
  const ponto = COBERTURA.curva.find((p) => p.n === COBERTURA.top_n);
  assert.ok(ponto, `a curva não mede N=${COBERTURA.top_n} — o número seria inventado`);
  assert.equal(ponto.cobertura_media_pct, COBERTURA.cobertura_media_pct);
  assert.equal(ponto.cobertura_minima_pct, COBERTURA.cobertura_minima_pct);
});

/**
 * O piso é o que se sustenta em 90% das edições; a média é o ano típico. Se o
 * piso subisse acima da média, um dos dois estaria trocado — e a página
 * prometeria mais do que entrega, que é o defeito que a distinção existe para
 * evitar.
 */
test("o piso nunca é maior que a média", () => {
  assert.ok(
    COBERTURA.cobertura_minima_pct <= COBERTURA.cobertura_media_pct,
    `piso ${COBERTURA.cobertura_minima_pct}% > média ${COBERTURA.cobertura_media_pct}%`,
  );
  for (const p of COBERTURA.curva) {
    assert.ok(p.cobertura_minima_pct <= p.cobertura_media_pct, `N=${p.n} tem piso acima da média`);
  }
});

/**
 * Lista maior cobre mais prova — por ser maior. É justamente por isso que o
 * `lift` precisa cair: ele divide pela cobertura de uma lista sorteada do mesmo
 * tamanho. Uma curva em que os dois subissem juntos indicaria que o piso não
 * está acompanhando o tamanho, e o lift estaria inflado pelo N.
 */
test("a curva é monotônica: mais itens cobrem mais, e o lift cai", () => {
  const ordenada = [...COBERTURA.curva].sort((a, b) => a.n - b.n);
  for (let i = 1; i < ordenada.length; i += 1) {
    assert.ok(
      ordenada[i].cobertura_media_pct >= ordenada[i - 1].cobertura_media_pct,
      `cobertura caiu de N=${ordenada[i - 1].n} para N=${ordenada[i].n}`,
    );
    assert.ok(
      ordenada[i].lift <= ordenada[i - 1].lift,
      `lift SUBIU de N=${ordenada[i - 1].n} para N=${ordenada[i].n} — o piso não acompanhou`,
    );
  }
});

test("a medição declara em quantos alvos ela se apoia", () => {
  assert.ok(COBERTURA.alvos > 0, "sem n, o número não é verificável");
  assert.ok(Array.isArray(COBERTURA.series) && COBERTURA.series.length > 0);
});

/**
 * A frase da cobertura é a afirmação central da landing, e ela publica TRÊS
 * números na mesma linha.
 *
 * 🚨 Ela nasceu misturando as duas convenções: `lift` passava por
 * `toLocaleString("pt-BR")` e virava `1,98`, enquanto os percentuais saíam crus
 * do JS e viravam `32.4` e `25`. Ponto decimal e vírgula decimal na mesma frase,
 * numa página em português — exatamente o defeito que `lib/decimal.ts` foi
 * criado para matar, reintroduzido ao lado do helper que existia para evitá-lo.
 *
 * Não é purismo: este produto vende rigor de medição, e um número na convenção
 * errada, na frase que carrega a medição, contradiz o que ela afirma. E o `25`
 * sem casa decimal faz um valor medido parecer arredondado a olho.
 *
 * O teste fixa a PROPRIEDADE (uma casa, vírgula) sobre o valor do artefato, não
 * uma string literal — assim ele sobrevive à próxima remedição.
 */
test("os números da cobertura saem na convenção pt-BR", () => {
  // ⚠️ Usa o `dec` DE VERDADE, não uma cópia da regra escrita aqui. A primeira
  // versão deste teste definia a própria função de formatação e passaria mesmo
  // com o componente publicando `32.4` — teria fixado um PROXY em vez da
  // propriedade, que é como um guard fica verde sem guardar nada.
  for (const valor of [COBERTURA.cobertura_media_pct, COBERTURA.cobertura_minima_pct]) {
    const saida = dec(valor);
    assert.match(saida, /^\d+,\d$/, `${valor} deveria sair como "N,N" e saiu "${saida}"`);
  }
  assert.match(dec(COBERTURA.lift, 2), /^\d+,\d\d$/, "o lift publica duas casas");
});

/**
 * E o componente tem de USAR o `dec`. O teste acima prova que a função está
 * certa; este prova que a frase passa por ela — sem o segundo, reverter para
 * `{previsao.cobertura.mediaPct}%` deixaria a suíte verde e a página errada.
 */
test("a frase da landing roteia os três números pelo `dec`", () => {
  const fonte = readFileSync(new URL("src/app/_landing/AssuntosPrevistos.tsx", raiz), "utf8");
  for (const campo of ["mediaPct", "minimaPct", "lift"]) {
    assert.ok(
      fonte.includes(`dec(previsao.cobertura.${campo}`),
      `cobertura.${campo} não passa por dec() — volta a sair na convenção do JS`,
    );
  }
  for (const cru of ["{previsao.cobertura.mediaPct}%", "{previsao.cobertura.minimaPct}%"]) {
    assert.ok(!fonte.includes(cru), `ainda há percentual cru na frase: ${cru}`);
  }
});
