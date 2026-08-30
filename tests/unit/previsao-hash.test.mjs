import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

/**
 * O hash publicado tem de corresponder ao conteúdo publicado.
 *
 * A página `/prova/enamed/aposta` imprime um sha256 e convida o leitor a
 * recalculá-lo. Se alguém corrigir a acentuação de um rótulo da lista, ou
 * reordenar um item, o hash da tela passa a não corresponder a nada — e o
 * argumento inteiro da peça ("registramos antes, e você pode conferir") vira
 * uma afirmação falsa numa página pública, que é a classe de defeito mais cara
 * deste projeto.
 *
 * Nenhuma outra ferramenta pegaria: editar uma string em JSON não quebra
 * typecheck, lint nem build. Este teste é o único guard.
 *
 * ## Por que ele lê o JSON, e não importa `lib/previsao.ts`
 *
 * `previsao.ts` importa `@/data/...`, e o runner de `node --test` não resolve o
 * alias `@/` (nenhum teste desta pasta importa módulo que use alias — é a
 * convenção local). E o alvo do guard é o ARTEFATO, não o acessor: é o arquivo
 * que a página publica e é ele que não pode divergir do próprio hash.
 *
 * ## A serialização precisa ser a MESMA do registrador Python
 *
 * `kbank/scripts/register_facies_prediction.py` usa
 * `json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)`.
 *
 * Três diferenças a cobrir, e a terceira custou uma falsa reprovação:
 *
 * 1. **Ordenar as chaves RECURSIVAMENTE** — `sort_keys` do Python desce em todo
 *    dicionário aninhado, e `predictions.subtheme.lista[]` tem objetos em três
 *    níveis. Ordenar só o topo dá outro hash.
 * 2. Separadores compactos e não-ASCII preservado: `JSON.stringify` já faz os
 *    dois.
 * 3. ⚠️ **Float inteiro.** Python escreve `11.0`; `JSON.stringify(11.0)` escreve
 *    `11`, porque em JS os dois são o mesmo número e a informação se perde no
 *    `JSON.parse`. A lista tem vários (`score: 11.0`, `9.0`, `5.0`), então o
 *    hash divergia sempre — e divergia por defeito do teste, não do dado.
 *
 * A saída é ler o TEXTO ORIGINAL de cada número, via `context.source` no
 * reviver do `JSON.parse` (Node 22+). Como o artefato foi escrito pelo próprio
 * `json.dump`, esse texto já é o `repr` do Python — reemiti-lo verbatim é
 * exatamente o que o registrador produziu, sem reimplementar formatação de
 * float nenhuma.
 */

const ARQUIVO = new URL("../../src/data/facies/previsao.json", import.meta.url);
const TEXTO = readFileSync(ARQUIVO, "utf8");

/** Um número com o texto que ele tinha no arquivo. */
class NumeroBruto {
  constructor(fonte) {
    this.fonte = fonte;
  }
}

const PREVISAO = JSON.parse(TEXTO);
const PREVISAO_BRUTA = JSON.parse(TEXTO, function (_chave, valor, contexto) {
  return typeof valor === "number" ? new NumeroBruto(contexto.source) : valor;
});

/** Os oito campos cobertos pelo hash, na definição do registrador. Lista
 *  explícita e não `delete`: um campo novo no artefato não pode entrar no hash
 *  em silêncio, nem sair dele. */
const CAMPOS_DO_HASH = [
  "exam_key",
  "application_year",
  "predictions",
  "headline_grain",
  "headline_metric",
  "base_composition",
  "taxonomy_signature",
  "method_version",
];

/** Serialização canônica equivalente à do `json.dumps` do registrador. */
function canonico(valor) {
  if (valor instanceof NumeroBruto) return valor.fonte;
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor);
  const pares = Object.keys(valor)
    .sort()
    .map((chave) => `${JSON.stringify(chave)}:${canonico(valor[chave])}`);
  return `{${pares.join(",")}}`;
}

function listaDaManchete() {
  return PREVISAO.predictions[PREVISAO.headline_grain];
}

test("o sha256 publicado recalcula a partir do conteúdo publicado", () => {
  const conteudo = {};
  for (const campo of CAMPOS_DO_HASH) {
    assert.ok(campo in PREVISAO_BRUTA, `campo do hash ausente no artefato: ${campo}`);
    conteudo[campo] = PREVISAO_BRUTA[campo];
  }
  const calculado = createHash("sha256").update(canonico(conteudo), "utf8").digest("hex");

  assert.equal(
    calculado,
    PREVISAO.content_sha256,
    "o conteúdo de previsao.json não corresponde ao content_sha256 gravado — " +
      "alguém editou o artefato registrado, e a página estaria publicando um hash falso",
  );
});

test("a previsão traz os campos que a página publica", () => {
  assert.equal(PREVISAO.exam_key, "ENAMED");
  assert.equal(PREVISAO.method_version, "facies_prediction.v1");
  assert.equal(PREVISAO.content_sha256.length, 64);
  assert.ok(listaDaManchete(), "grão da manchete ausente em predictions");
  assert.equal(listaDaManchete().lista.length, PREVISAO.base_composition.top_n);
});

test("as posições da lista são 1..N sem buraco nem repetição", () => {
  const posicoes = listaDaManchete().lista.map((item) => item.posicao);
  assert.deepEqual(
    posicoes,
    posicoes.map((_, indice) => indice + 1),
    "a lista congelada foi reordenada ou perdeu um item",
  );
});

/**
 * O piso é o que torna o resultado legível, e ele não pode ser inventado na
 * tela: uma lista de 30 num universo de 295 cobre 10,17% ao acaso. Se o
 * universo mudar sem o piso mudar junto, a peça publicaria um lift errado.
 */
test("o piso declarado bate com top_n sobre o universo", () => {
  const lista = listaDaManchete();
  const esperado = (100 * Math.min(PREVISAO.base_composition.top_n, lista.universo)) / lista.universo;
  assert.ok(
    Math.abs(esperado - lista.piso_pct) < 0.01,
    `piso declarado ${lista.piso_pct}% diverge do calculado ${esperado.toFixed(2)}%`,
  );
});

/**
 * Empate na fronteira significa que o 30º lugar foi decidido por desempate, e
 * não por medida. Não é motivo para não publicar — é motivo para a página
 * DIZER. Este teste falha quando o valor deixa de ser zero, para a decisão
 * voltar à mesa em vez de passar despercebida.
 */
test("não há empate na fronteira do corte", () => {
  assert.equal(
    listaDaManchete().empates_na_fronteira,
    0,
    "o corte do top-30 tem empate: a página precisa declarar isso antes de publicar",
  );
});
