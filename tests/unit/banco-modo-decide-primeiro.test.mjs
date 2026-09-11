/**
 * A DECISÃO ABRE A TELA — e o teste existe porque ela já esteve no fim dela.
 *
 * O seletor de modo vivia dentro de "3. Modo e carga", o último bloco e fechado
 * no telemóvel. Quem abria `/banco` via primeiro um filtro por área clínica:
 * a tela pedia o refinamento antes de perguntar o que a pessoa vinha fazer, e
 * escolher "prova" depois de mexer nos temas é refazer trabalho, porque a prova
 * ignora tema.
 *
 * São asserções sobre o FONTE, e não sobre um render. É o mesmo recurso que
 * `metacognition-exposure.test.mjs` já usa nesta base: o que se quer travar é
 * ONDE o bloco está na ordem do arquivo, e isso um render não distingue de um
 * bloco que aparece mais abaixo.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const FILTERS_BAR = new URL(
  "../../src/app/banco/_components/FiltersBar.tsx",
  import.meta.url,
);
const ESCOLHA = new URL(
  "../../src/app/banco/_components/EscolhaDoModo.tsx",
  import.meta.url,
);

const fonte = readFileSync(FILTERS_BAR, "utf8");
const escolha = readFileSync(ESCOLHA, "utf8");

test("a escolha do modo vem ANTES de qualquer passo recolhível", () => {
  const modo = fonte.indexOf("<EscolhaDoModo");
  const primeiroPasso = fonte.indexOf("<SecaoRecolhivel");

  assert.ok(modo > 0, "o bloco de escolha do modo sumiu da barra");
  assert.ok(
    modo < primeiroPasso,
    "a escolha do modo voltou para dentro de um passo: o aluno passa a " +
      "encontrar o filtro antes da decisão que muda tudo",
  );
});

test("a escolha do modo NÃO está dentro de um <details>", () => {
  // `SecaoRecolhivel` renderiza `<details>`. Recolher a decisão é o defeito.
  const modo = fonte.indexOf("<EscolhaDoModo");
  const antes = fonte.slice(0, modo);
  const abertos = (antes.match(/<SecaoRecolhivel/g) ?? []).length;
  const fechados = (antes.match(/<\/SecaoRecolhivel>/g) ?? []).length;

  assert.equal(
    abertos,
    fechados,
    "o bloco do modo ficou dentro de uma seção recolhível ainda aberta",
  );
});

test("o foco clínico não é oferecido na prova", () => {
  // A prova é um caderno fechado: filtrar tema dentro dela entregaria um pedaço
  // com nome de prova. Mostrar um controle sem efeito é pior que escondê-lo.
  const guarda = fonte.indexOf('tipoSessao === "full_exam" ? null : (');
  const passoDeTopico = fonte.indexOf('id="question-bank-topic-filters"');

  assert.ok(guarda > 0, "o passo de foco clínico voltou a aparecer na prova");
  assert.ok(
    guarda < passoDeTopico,
    "a guarda não protege o passo de foco clínico",
  );
});

test("na prova, o passo que abre sozinho é o da banca e do ano", () => {
  // Abrir "topic-filters" na prova deixaria a pessoa diante de um passo
  // recolhido justamente onde ela tem de escolher.
  const trecho = fonte.slice(
    fonte.indexOf("const abrir ="),
    fonte.indexOf("for (const id of abrir)"),
  );
  // O ramo da PROVA e' o que vem depois do `?` e antes do `:`. A primeira
  // versao deste teste olhava o ramo do `:` -- o NAO-prova -- e reprovava por
  // encontrar ali exatamente o que devia estar. Reprovou o teste, nao o codigo.
  const ramoDaProva = trecho.slice(trecho.indexOf("?"), trecho.indexOf("]", trecho.indexOf("?")));

  assert.match(ramoDaProva, /question-bank-adjustments/);
  assert.doesNotMatch(
    ramoDaProva,
    /question-bank-topic-filters/,
    "o ramo da prova voltou a abrir o filtro por tópico",
  );
});

test("a abertura automática reage à TROCA de modo, não só à montagem", () => {
  // Com `[]` quem chega por tópico e muda para prova fica com o passo errado
  // aberto ate' recarregar a pagina.
  const efeito = fonte.slice(fonte.indexOf("const abrir ="));
  const dependencias = efeito.slice(efeito.indexOf("}, ["), efeito.indexOf("}, [") + 20);

  assert.match(dependencias, /tipoSessao/);
});

test("cada modo diz o que ENTREGA, não o que pede de formulário", () => {
  // "Prova institucional / Uma instituição e um ano" descrevia o formulário.
  // É o resultado que decide a escolha.
  assert.match(escolha, /A prova inteira, como ela caiu no dia/);
  assert.match(escolha, /A Fácies monta pela sua defasagem/);
  assert.doesNotMatch(
    escolha,
    /Uma instituição e um ano\./,
    "voltou a descrever o formulário em vez da entrega",
  );
});

test("as três opções continuam existindo", () => {
  for (const valor of ['"full_exam"', '"topic"', '"kros"']) {
    assert.ok(
      escolha.includes(`value: ${valor}`),
      `o modo ${valor} sumiu da escolha`,
    );
  }
});
