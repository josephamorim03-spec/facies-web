import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * O histórico publicado tem de descrever a lista publicada.
 *
 * `historico.json` diz "este assunto apareceu em N das E provas". Isso foi
 * contado para uma lista específica. Se a lista for reexportada e o histórico
 * não, os dois arquivos passam a descrever listas diferentes — e a coluna
 * apareceria na tela com a mesma autoridade, descrevendo outra coisa.
 *
 * ## Por que um teste, se a página já se protege
 *
 * `historicoDaLista` compara o sha e o grão, e devolve `null` quando divergem —
 * então a coluna SOME em vez de mentir. Isso é seguro e é silencioso: a página
 * perderia o segundo eixo e ninguém saberia por quê. É a mesma razão de
 * `cobertura-casa-com-previsao` existir.
 */
const raiz = new URL("../../", import.meta.url);
const ler = (caminho) => JSON.parse(readFileSync(new URL(caminho, raiz), "utf8"));

const PREVISAO = ler("src/data/facies/previsao.json");
const HISTORICO = ler("src/data/facies/historico.json");
const LISTA = PREVISAO.predictions[PREVISAO.headline_grain].lista;

test("o histórico descreve a MESMA aposta que está publicada", () => {
  assert.equal(
    HISTORICO.previsao_sha256,
    PREVISAO.content_sha256,
    "historico.json foi medido para outra lista — regere com " +
      "`scripts/build_historico_dataset.py --escrever`",
  );
  assert.equal(HISTORICO.grao, PREVISAO.headline_grain);
});

test("todo assunto publicado tem entrada no histórico", () => {
  const faltando = LISTA.map((i) => i.rotulo).filter((r) => !(r in HISTORICO.presenca));
  assert.deepEqual(faltando, [], "assunto na lista e fora do histórico: a coluna some só para ele");
});

/**
 * ⚠️ Ausência de medida não é medida de ausência.
 *
 * Um assunto pode entrar na lista pela prova direta sem nunca ter aparecido nas
 * correlatas. Ele sai como `null`, e a página não renderiza nada. Se virasse
 * `0`, a tela diria "apareceu em 0 das 9" — uma afirmação sobre o passado que
 * ninguém mediu, e a mais desencorajadora possível para um assunto que o motor
 * pôs no topo.
 */
test("sem histórico é `null`, nunca zero", () => {
  for (const [rotulo, valor] of Object.entries(HISTORICO.presenca)) {
    assert.ok(
      valor === null || (Number.isInteger(valor) && valor > 0),
      `${rotulo} saiu como ${valor}; o vazio tem de ser null, não 0`,
    );
  }
});

test("a presença nunca passa do número de edições", () => {
  for (const [rotulo, valor] of Object.entries(HISTORICO.presenca)) {
    if (valor === null) continue;
    assert.ok(
      valor <= HISTORICO.edicoes,
      `${rotulo} aparece em ${valor} de ${HISTORICO.edicoes} — o denominador está errado`,
    );
  }
});

/**
 * 🚨 O TESTE QUE DECIDE SE A COLUNA VALE A PENA.
 *
 * A faixa qualitativa foi descartada exatamente aqui: dentro da lista publicada
 * ela dava 38 `recorrente` em 42, quase constante. Uma coluna que repete o mesmo
 * valor não informa, e ocupa espaço parecendo informar.
 *
 * Se a presença colapsar do mesmo jeito — uma remedição em que quase todos
 * tenham o mesmo número —, a coluna vira ruído e a decisão precisa ser revista.
 * Este teste é o alarme.
 */
test("a presença VARIA dentro da lista — senão a coluna é ruído", () => {
  const valores = LISTA.map((i) => HISTORICO.presenca[i.rotulo]).filter((v) => v !== null);
  const distintos = new Set(valores);
  assert.ok(distintos.size >= 3, `só ${distintos.size} valor(es) distinto(s): a coluna não separa nada`);

  const maisComum = Math.max(...[...distintos].map((v) => valores.filter((x) => x === v).length));
  const fracao = maisComum / valores.length;
  assert.ok(
    fracao < 0.75,
    `${Math.round(fracao * 100)}% dos assuntos têm o mesmo valor — foi assim que a faixa qualitativa reprovou`,
  );
});
