/**
 * A PROVA SAI DO SELETOR, e não de uma caixa de texto.
 *
 * Era esta a razão de o modo prova não funcionar. O payload fazia
 *
 *     payload.institutions = [fullExamName.trim()]
 *
 * ou seja, mandava ao banco o texto que a pessoa digitava — o campo tinha
 * placeholder "USP, UNIFESP, SUS-SP...". As chaves reais têm 60 a 90 caracteres
 * (`EXAME-NACIONAL-DE-RESIDENCIA-MEDICA-EBSERH-ENARE-E-...`) e a comparação é
 * exata: "USP" casava **zero**.
 *
 * Pior: a linha **sobrescrevia** `institutions`, jogando fora a banca que a
 * pessoa já tinha escolhido no seletor logo acima — que trazia a chave certa. E
 * com o campo vazio, `fullExamReady` era falso e o botão ficava morto sem dizer
 * por quê.
 *
 * Estas asserções são sobre o FONTE porque o que se trava é a AUSÊNCIA de um
 * caminho: nenhum render prova que ninguém, em lugar nenhum, voltou a montar a
 * chave a partir de texto digitado.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolverProvaEscolhida } from "../../src/app/banco/_lib/sessionBuilder.ts";

const PAGE = new URL("../../src/app/banco/page.tsx", import.meta.url);
const BARRA = new URL("../../src/app/banco/_components/FiltersBar.tsx", import.meta.url);

/**
 * So o CODIGO, sem comentario -- e a primeira versao deste arquivo reprovou por
 * nao fazer isto: o comentario que EXPLICA o defeito cita
 * `institutions = [fullExamName.trim()]`, e a asserta casava a explicacao em
 * vez da linha executavel. E a mesma armadilha que o repositorio do banco ja
 * cobrou: olhar linha de codigo, nunca a mencao ao nome.
 */
function codigo(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((linha) => linha.replace(/\/\/.*$/, ""))
    .join("\n");
}

const pagina = codigo(readFileSync(PAGE, "utf8"));
const barra = codigo(readFileSync(BARRA, "utf8"));

test("a banca da prova NUNCA sai de texto digitado", () => {
  assert.doesNotMatch(
    pagina,
    /institutions\s*=\s*\[\s*fullExamName/,
    "voltou a mandar o texto digitado como chave de instituição: casa zero no " +
      "acervo e ainda descarta a banca escolhida no seletor",
  );
});

test("a barra não tem mais campo livre de instituição nem de ano", () => {
  assert.doesNotMatch(barra, /onFullExamNameChange/);
  assert.doesNotMatch(barra, /onFullExamYearChange/);
  assert.doesNotMatch(
    barra,
    /USP, UNIFESP, SUS-SP/,
    "o placeholder do campo livre voltou",
  );
});

const SOURCES = [
  { option_key: "ENARE-CHAVE-LONGA-DE-90-CARACTERES", label: "ENARE" },
];

test("prova é UMA banca e UM ano — qualquer outra coisa não é prova", () => {
  // Prova é um caderno aplicado num dia. Duas bancas ou dois anos não são
  // uma prova, e servir a mistura com esse nome seria mentir.
  assert.equal(resolverProvaEscolhida([], [2024], SOURCES), null);
  assert.equal(resolverProvaEscolhida(["a", "b"], [2024], SOURCES), null);
  assert.equal(resolverProvaEscolhida(["a"], [], SOURCES), null);
  assert.equal(resolverProvaEscolhida(["a"], [2023, 2024], SOURCES), null);
});

test("a CHAVE recorta e o RÓTULO exibe — nunca o contrário", () => {
  const prova = resolverProvaEscolhida(
    ["ENARE-CHAVE-LONGA-DE-90-CARACTERES"],
    [2024],
    SOURCES,
  );

  assert.equal(prova?.chave, "ENARE-CHAVE-LONGA-DE-90-CARACTERES");
  assert.equal(prova?.rotulo, "ENARE");
  assert.equal(prova?.ano, 2024);
});

test("sem rótulo no catálogo, cai na chave — e não em vazio", () => {
  // Vazio faria o título da sessão sumir; a chave crua é feia mas honesta.
  const prova = resolverProvaEscolhida(["DESCONHECIDA"], [2024], SOURCES);

  assert.equal(prova?.rotulo, "DESCONHECIDA");
});

test("`full_exam_name` é rótulo, e `institutions` é chave", () => {
  const bloco = pagina.slice(pagina.indexOf('if (studyKind === "full_exam")'));
  const corpo = bloco.slice(0, bloco.indexOf("} else {"));

  assert.match(corpo, /full_exam_name = provaEscolhida\?\.rotulo/);
  assert.match(corpo, /institutions = provaEscolhida \? \[provaEscolhida\.chave\]/);
});

test("a escolha de qual prova viaja quando existe", () => {
  const bloco = pagina.slice(pagina.indexOf('if (studyKind === "full_exam")'));
  const corpo = bloco.slice(0, bloco.indexOf("} else {"));

  // `if (fullExamNumber)`: sem escolha, o campo NÃO viaja. Mandar `null` faria
  // o backend receber uma entrada inexistente e desistir da prova inteira.
  assert.match(corpo, /if \(fullExamNumber\) payload\.full_exam_number = fullExamNumber;/);
});

test("as edições só são buscadas quando a resposta será lida", () => {
  // A busca vive em `_lib/useEdicoesDaProva`. Chamar fora do modo prova, ou
  // sem banca e ano, seria pagar por um dado que nenhum seletor lê.
  const hook = codigo(
    readFileSync(
      new URL("../../src/app/banco/_lib/useEdicoesDaProva.ts", import.meta.url),
      "utf8",
    ),
  );

  // ⚠️ O ANO SAIU DA BUSCA de propósito: o seletor de ano precisa dizer o
  // tamanho de CADA ano ("2026 · 100") para o aluno escolher qual prova fazer,
  // e exigir o ano para buscar seria pedir a resposta antes da pergunta.
  // ⚠️ Esta asserta EXIGIA `&& token`, e com isso PRENDIA o defeito: `token` é
  // string vazia por desenho, então a guarda nunca deixava o efeito rodar e o
  // teste chamava isso de correto. `pronto` é o `tokenResolved`, booleano de
  // verdade. Ver `tests/unit/token-nao-pode-guardar-efeito.test.mjs`.
  assert.match(hook, /const ativo = Boolean\(ehModoProva && chave && pronto\)/);
  assert.doesNotMatch(hook, /institution_key: chave, year:/,
    "o ano voltou a recortar a busca, e o seletor de ano fica sem os tamanhos");
  assert.match(hook, /if \(!ativo \|\| combina\) return;/);
  assert.match(hook, /access_group: accessGroup/, "a modalidade recorta as edições");
});

test("o resultado carrega o PEDIDO que o produziu", () => {
  // Sem isso, o seletor mostra as edições da prova ANTERIOR enquanto a busca da
  // nova não volta — e limpar a lista no corpo do efeito, que era a alternativa,
  // dispara renderização em cascata (`react-hooks/set-state-in-effect`).
  const hook = codigo(
    readFileSync(
      new URL("../../src/app/banco/_lib/useEdicoesDaProva.ts", import.meta.url),
      "utf8",
    ),
  );

  assert.match(hook, /resultado\?\.chave === chave/);
  assert.match(hook, /resultado\?\.grupo === accessGroup/);
  // "não bate" JÁ significa "carregando": não há segundo estado para divergir.
  assert.match(hook, /carregando: ativo && !combina/);
});

test("aborto não vira lista vazia", () => {
  // Gravar `[]` no aborto faria o recorte NOVO parecer "sem edições" em vez de
  // "ainda carregando" — e o seletor sumiria por um instante sem razão.
  const hook = codigo(
    readFileSync(
      new URL("../../src/app/banco/_lib/useEdicoesDaProva.ts", import.meta.url),
      "utf8",
    ),
  );

  assert.match(hook, /if \(controller\.signal\.aborted\) return;/);
});
