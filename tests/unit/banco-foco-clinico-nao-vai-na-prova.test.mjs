/**
 * ESCONDER UM FILTRO NÃO O DESLIGA — e a diferença chegou ao aluno.
 *
 * Quando "1. Foco clínico" passou a sumir no modo prova, os valores continuaram
 * a ser enviados: área, temas e busca seguiam recortando a consulta, agora sem
 * nenhum controle na tela para vê-los ou limpá-los. Quem tinha temas escolhidos
 * e trocava para Prova ficava preso num recorte invisível.
 *
 * Relatado assim: *"antes se apareciam 90 e poucas questões por ano, agora tá
 * 2, 3, 1"*.
 *
 * O que se conserta é o ENVIO, não o estado: quem volta para "Por tópico"
 * reencontra a sua seleção.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  focoClinicoTemFiltro,
  recorteDeFocoClinico,
} from "../../src/app/banco/_lib/sessionBuilder.ts";

const topico = (id) => ({
  knowledge_node_id: id,
  parent_knowledge_node_id: null,
  node_code: id.toUpperCase(),
  node_name: id,
  node_type: "theme",
  node_path: ["Medicina", id],
  path_label: `Medicina / ${id}`,
});

const CHEIO = {
  topicos: [topico("pediatria"), topico("cardio")],
  area: "clinica",
  busca: "sepse",
};

// --------------------------------------------------------------------------
// A regra
// --------------------------------------------------------------------------

test("na PROVA o foco clínico não viaja", () => {
  // A prova é um caderno fechado: área, tema e busca não a recortam.
  const foco = recorteDeFocoClinico({ ehProva: true, ...CHEIO });

  assert.deepEqual(foco, {
    knowledge_node_ids: undefined,
    area: undefined,
    search: undefined,
  });
});

test("fora da prova o foco clínico viaja inteiro", () => {
  const foco = recorteDeFocoClinico({ ehProva: false, ...CHEIO });

  assert.deepEqual(foco.knowledge_node_ids, ["pediatria", "cardio"]);
  assert.equal(foco.area, "clinica");
  assert.equal(foco.search, "sepse");
});

test("a função NÃO apaga a seleção — só decide o que se envia", () => {
  // Quem troca para Prova e volta reencontra os temas. Se a página limpasse o
  // estado, a volta viria vazia e o aluno perderia o trabalho.
  const topicos = CHEIO.topicos;
  recorteDeFocoClinico({ ehProva: true, ...CHEIO });

  assert.equal(topicos.length, 2, "a lista de topicos foi mutada");
  assert.deepEqual(
    recorteDeFocoClinico({ ehProva: false, ...CHEIO }).knowledge_node_ids,
    ["pediatria", "cardio"],
  );
});

test("vazio vira undefined, e não lista ou string vazia", () => {
  // `[]` e `""` viajariam como filtro e recortariam para zero.
  const foco = recorteDeFocoClinico({
    ehProva: false,
    topicos: [],
    area: "",
    busca: "",
  });

  assert.deepEqual(foco, {
    knowledge_node_ids: undefined,
    area: undefined,
    search: undefined,
  });
});

test("`focoClinicoTemFiltro` só é verdadeiro para o que de fato viaja", () => {
  assert.equal(focoClinicoTemFiltro(recorteDeFocoClinico({ ehProva: true, ...CHEIO })), false);
  assert.equal(focoClinicoTemFiltro(recorteDeFocoClinico({ ehProva: false, ...CHEIO })), true);
  assert.equal(
    focoClinicoTemFiltro(
      recorteDeFocoClinico({ ehProva: false, topicos: [], area: "", busca: "x" }),
    ),
    true,
    "só a busca já é filtro",
  );
});

// --------------------------------------------------------------------------
// A ligação — uma definição só
// --------------------------------------------------------------------------

const PAGE = new URL("../../src/app/banco/page.tsx", import.meta.url);
const fonte = readFileSync(PAGE, "utf8");

test("a página não remonta o recorte por conta própria", () => {
  // A forma exata do defeito: três chamadas montavam o mesmo recorte à mão
  // (`filterParams`, a chave de cache das facetas e o pedido de facetas), e
  // bastou uma esquecer a guarda de modo.
  assert.equal(
    (fonte.match(/selectedTopics\.map\(\(t\) => t\.knowledge_node_id\)/g) ?? []).length,
    0,
    "a página voltou a montar `knowledge_node_ids` à mão em vez de usar " +
      "`recorteDeFocoClinico`; a cópia é o que esquece a guarda de modo",
  );
  assert.match(fonte, /recorteDeFocoClinico\(/);
});

test("as facetas montam chave de cache e pedido do MESMO recorte", () => {
  const facetas = fonte.slice(fonte.indexOf("const refreshFacets = useCallback"));
  const corpo = facetas.slice(0, facetas.indexOf("}, ["));

  assert.equal(
    (corpo.match(/\.\.\.focoClinico/g) ?? []).length,
    2,
    "se a chave de cache e o pedido saírem de recortes diferentes, a chave " +
      "não muda quando o recorte muda e a tela congela nos números antigos",
  );
});

test("a decisão de pedir facetas olha o que viaja, não o estado bruto", () => {
  const efeito = fonte.slice(fonte.indexOf("const hasFacetFilters = Boolean("));
  const corpo = efeito.slice(0, efeito.indexOf(");"));

  assert.match(corpo, /focoClinicoTemFiltro\(/);
  assert.doesNotMatch(
    corpo,
    /selectedTopics\.length/,
    "voltou a olhar o estado bruto: na prova a tela pediria faceta por um " +
      "filtro que ela deixou de enviar",
  );
});
