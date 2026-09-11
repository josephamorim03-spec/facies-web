import assert from "node:assert/strict";
import { test } from "node:test";

import {
  agregarDominio,
  construirIndice,
  disporNivel,
  dobrarCauda,
  fatiar,
  melhoresRanks,
  ordenarPorPrioridade,
  prioridades,
  caminhoAte,
  caminhoQueMostra,
  filhosDoPasso,
  pesoDoNo,
} from "../../src/app/mapa/_components/mapaLayout.ts";

/**
 * O layout do mapa, testado sem React.
 *
 * ⚠️ ESTE ARQUIVO EXISTE POR UMA FALHA DE PROCESSO, e não por gosto por testes.
 * Duas versões do mapa foram reprovadas pelo operador por defeito de LAYOUT —
 * células de 3px, rótulo ilegível, peso em unidade errada. Nenhuma delas seria
 * pega por e2e: o e2e vê que a tela abriu, não que os retângulos fazem sentido.
 * A conta mora aqui justamente para poder ser interrogada.
 */

/** Um nó com o mínimo que o layout lê. O grão é explícito porque a regra da
 *  moldura depende dele. */
function no(id, pai, nome, contagem, grao = pai === null ? "specialty" : "theme") {
  return {
    knowledge_node_id: id,
    parent_knowledge_node_id: pai,
    node_name: nome,
    node_type: grao,
    node_path: [nome],
    path_label: nome,
    depth: grao === "specialty" ? 1 : grao === "theme" ? 2 : 3,
    description: null,
    question_count: contagem,
    primary_question_count: contagem,
    board_count: 1,
  };
}

const CAIXA = { x: 0, y: 0, w: 360, h: 352 };

test("fatiar casa saida[i] com itens[i] — o invariante do qual o resto depende", () => {
  // Quem chama `fatiar` lê `caixas[i]` como a caixa de `itens[i]`. Se a recursão
  // empurrasse o sufixo antes do prefixo, cada peça receberia o retângulo de
  // outra e o mapa inteiro estaria trocado, sem erro nenhum.
  const itens = [{ peso: 50, marca: "a" }, { peso: 30, marca: "b" }, { peso: 20, marca: "c" }];
  const caixas = [];
  fatiar(itens, CAIXA, caixas, 0);

  assert.equal(caixas.length, 3);
  // A maior fatia tem de ser a do maior peso.
  const areas = caixas.map((c) => c.w * c.h);
  assert.ok(areas[0] > areas[1], "itens[0] (peso 50) deve ter area maior que itens[1] (30)");
  assert.ok(areas[1] > areas[2], "itens[1] (peso 30) deve ter area maior que itens[2] (20)");
});

test("fatiar ladrilha a caixa: sem sobreposicao e sem vazar", () => {
  const itens = [40, 25, 15, 10, 6, 4].map((peso) => ({ peso }));
  const caixas = [];
  fatiar(itens, CAIXA, caixas, 0);

  const soma = caixas.reduce((s, c) => s + c.w * c.h, 0);
  const area = CAIXA.w * CAIXA.h;
  assert.ok(Math.abs(soma - area) / area < 0.01, `area somada ${soma} deveria cobrir ${area}`);

  for (const c of caixas) {
    assert.ok(c.x >= -0.01 && c.y >= -0.01, "nenhuma caixa comeca fora");
    assert.ok(c.x + c.w <= CAIXA.w + 0.01, "nenhuma caixa vaza a direita");
    assert.ok(c.y + c.h <= CAIXA.h + 0.01, "nenhuma caixa vaza embaixo");
  }

  // Nenhum par se sobrepoe.
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i];
      const b = caixas[j];
      const cruza =
        a.x < b.x + b.w - 0.01 &&
        b.x < a.x + a.w - 0.01 &&
        a.y < b.y + b.h - 0.01 &&
        b.y < a.y + a.h - 0.01;
      assert.equal(cruza, false, `caixas ${i} e ${j} se sobrepoem`);
    }
  }
});

test("dobrarCauda garante os DOIS lados, nao a area", () => {
  // ⚠️ ESTE TESTE MUDOU depois que o e2e reprovou a versao por area.
  //
  // A primeira regra comparava `(menorPeso/total) * areaDoPalco` com um piso de
  // AREA — e area nao governa forma. Uma peca de 3.168px2 satisfaz o piso e sai
  // 400x8. Na tela deu 30,7px de largura. Agora o piso e por LADO e a conta e
  // feita no layout de verdade.
  const lado = { w: 72, h: 44 };

  const muitos = Array.from({ length: 30 }, (_, i) => no(`t${i}`, "r", `Tema ${i}`, 200 - i * 6));
  const { visiveis, desde } = dobrarCauda(muitos, CAIXA, lado, 20, 4);

  assert.ok(visiveis.length >= 1, "sempre sobra ao menos uma peca");
  assert.ok(visiveis.length <= 20, "o teto de pecas e respeitado");

  // Refaz o layout exatamente como `disporNivel` faria, e mede os dois lados.
  const itens = visiveis.map((n) => ({ peso: pesoDoNo(n) }));
  const daCauda = muitos.slice(desde).reduce((s, n) => s + pesoDoNo(n), 0);
  if (daCauda > 0) itens.push({ peso: daCauda });
  const caixas = [];
  fatiar(itens, CAIXA, caixas, 4);
  for (const c of caixas) {
    assert.ok(c.w >= lado.w, `largura ${c.w.toFixed(1)} abaixo do piso ${lado.w}`);
    assert.ok(c.h >= lado.h, `altura ${c.h.toFixed(1)} abaixo do piso ${lado.h}`);
  }

  // Dobrar exatamente um item e' pior que mostra-lo — quando o piso aguenta.
  const quatro = Array.from({ length: 4 }, (_, i) => no(`q${i}`, "r", `Q${i}`, 100 - i));
  const curto = dobrarCauda(quatro, CAIXA, lado, 3, 4);
  assert.equal(curto.visiveis.length, 4, "com 1 sobrando, mostra os 4 em vez de dobrar 1");
});

test("construirIndice promove a raiz tecnica e ordena com desempate estavel", () => {
  // A moldura tem ESPECIALIDADES penduradas nela — é esse o sinal, não o nome.
  const arvore = [
    no("medicina", null, "Medicina", 900, "specialty"),
    no("cm", "medicina", "Clínica Médica", 480, "specialty"),
    no("cg", "medicina", "Cirurgia", 181, "specialty"),
  ];
  const indice = construirIndice(arvore);
  const raizes = indice.filhosDe.get(null) ?? [];
  assert.deepEqual(
    raizes.map((n) => n.node_name),
    ["Clínica Médica", "Cirurgia"],
    "a moldura 'Medicina' sai e os filhos sobem",
  );
  assert.equal(indice.porId.has("medicina"), false, "a moldura tambem sai do indice");

  // Desempate: mesma contagem, ordem alfabetica em pt-BR — sem isso a ordem
  // depende da chegada da API e o mapa "pula" entre dois carregamentos iguais.
  const empatados = construirIndice([
    no("b", null, "Zebra", 10),
    no("a", null, "Ácido", 10),
  ]);
  assert.deepEqual(
    (empatados.filhosDe.get(null) ?? []).map((n) => n.node_name),
    ["Ácido", "Zebra"],
  );
});

test("construirIndice mantem a raiz unica quando ela e territorio de verdade", () => {
  // ⚠️ O TESTE QUE DERRUBOU A PRIMEIRA REGRA. Ela promovia qualquer raiz unica
  // com mais de um filho — e uma banca com UMA especialidade e varios TEMAS cai
  // exatamente nisso: a especialidade dela seria apagada do mapa.
  const indice = construirIndice([
    no("so", null, "Clínica Médica", 90, "specialty"),
    no("t1", "so", "Cardiologia", 50, "theme"),
    no("t2", "so", "Pneumologia", 40, "theme"),
  ]);
  const raizes = indice.filhosDe.get(null) ?? [];
  assert.deepEqual(raizes.map((n) => n.node_name), ["Clínica Médica"]);
});

test("agregarDominio sobe a proficiencia e ignora quem nao respondeu", () => {
  const indice = construirIndice([
    no("cm", null, "Clínica Médica", 100),
    no("cardio", "cm", "Cardiologia", 60),
    no("pneumo", "cm", "Pneumologia", 40),
  ]);
  // A chave e' o NOME, como o contrato de `primary_subtheme` manda.
  const porNome = new Map([
    ["Cardiologia", { mastery: 0.8, attempts: 40 }],
    ["Pneumologia", { mastery: 0.3, attempts: 10 }],
  ]);
  const agregado = agregarDominio(indice, porNome);

  const raiz = agregado.get("cm");
  assert.ok(raiz, "a raiz recebe tinta mesmo sem entrada propria");
  assert.equal(raiz.attempts, 50);
  // Media PONDERADA: (0,8*40 + 0,3*10) / 50 = 0,7
  assert.ok(Math.abs(raiz.mastery - 0.7) < 1e-9, `esperado 0,7 e veio ${raiz.mastery}`);

  const semResposta = agregarDominio(indice, new Map());
  assert.equal(semResposta.size, 0, "sem resposta nenhuma, ninguem recebe tinta");
});

test("a prioridade SOBE a arvore, senao o botao nao faz nada na raiz", () => {
  // ⚠️ O DEFEITO QUE O EXERCICIO PEGOU. As prioridades sao subtemas, e as
  // especialidades trazem o rank neutro do backend. Sem herdar o melhor rank do
  // descendente, ligar a atencao na raiz nao mudava ordem nem marca — o aluno
  // apertava o botao e a tela ficava igual.
  const com = (no, rank, frase) => ({ ...no, recommendation_rank: rank, recommendation_explanation: frase });
  const indice = construirIndice([
    no("cm", null, "Clínica Médica", 480, "specialty"),
    no("cardio", "cm", "Cardiologia", 53, "theme"),
    com(no("ic", "cardio", "Insuficiência cardíaca", 27, "subtheme"), 1, "Você acertou 2 de 7."),
    no("cg", null, "Cirurgia", 181, "specialty"),
    no("trauma", "cg", "Trauma", 36, "theme"),
    com(no("atls", "trauma", "ATLS", 18, "subtheme"), 4, "ATLS está no seu cronograma."),
    no("ped", null, "Pediatria", 196, "specialty"),
  ]);

  const melhor = melhoresRanks(indice);
  assert.equal(melhor.get("cm"), 1, "a especialidade herda o rank do descendente urgente");
  assert.equal(melhor.get("cardio"), 1);
  assert.equal(melhor.get("cg"), 4);
  assert.equal(
    melhor.get("ped"),
    Number.MAX_SAFE_INTEGER,
    "quem nao contem prioridade fica no fim",
  );

  // E a ordenacao usa isso: Cirurgia (181) passa a frente de Pediatria (196),
  // que e MAIOR — a atencao inverte a ordem do peso, que e o ponto do botao.
  const raizes = indice.filhosDe.get(null) ?? [];
  const ordenado = ordenarPorPrioridade(raizes, melhor).map((n) => n.node_name);
  assert.deepEqual(ordenado, ["Clínica Médica", "Cirurgia", "Pediatria"]);
});

test("prioridades so lista quem TEM frase, e caminhoAte para no pai", () => {
  // `topic_explanation.py` nao inventa frase sem evidencia. Rank sem frase e
  // ordem sem justificativa, e listar isso seria pedir fe ao aluno.
  const com = (n, rank, frase) => ({ ...n, recommendation_rank: rank, recommendation_explanation: frase });
  const indice = construirIndice([
    no("cm", null, "Clínica Médica", 480, "specialty"),
    no("cardio", "cm", "Cardiologia", 53, "theme"),
    com(no("ic", "cardio", "Insuficiência cardíaca", 27, "subtheme"), 1, "Você acertou 2 de 7."),
    // Rank OTIMO, mas sem frase: nao entra.
    { ...no("mudo", "cardio", "Sem explicação", 20, "subtheme"), recommendation_rank: 0 },
  ]);

  const lista = prioridades(indice, 6).map((n) => n.node_name);
  assert.deepEqual(lista, ["Insuficiência cardíaca"], "rank sem frase nao entra na lista");

  // O caminho para no PAI, para o no aparecer como PECA no palco em vez de o
  // palco virar o interior dele.
  const caminho = caminhoAte(indice, "ic").map((p) => p.nome);
  assert.deepEqual(caminho, ["Clínica Médica", "Cardiologia"]);
});

test("disporNivel marca folha e monta a previa so em peca que comporta", () => {
  const indice = construirIndice([
    no("cm", null, "Clínica Médica", 100),
    no("cardio", "cm", "Cardiologia", 60),
    no("c1", "cardio", "IC", 30),
    no("c2", "cardio", "SCA", 30),
    no("pneumo", "cm", "Pneumologia", 40),
  ]);
  const pecas = disporNivel(indice, indice.filhosDe.get("cm") ?? [], CAIXA, {
    ladoMinimo: { w: 72, h: 44 },
    maxPecas: 20,
    vao: 4,
    previaMin: 40,
  });

  const cardio = pecas.find((p) => p.tipo === "no" && p.no.knowledge_node_id === "cardio");
  const pneumo = pecas.find((p) => p.tipo === "no" && p.no.knowledge_node_id === "pneumo");

  assert.equal(cardio.dentro, 2, "Cardiologia tem dois filhos");
  assert.ok(cardio.previa.length === 2, "e a previa desenha os dois");
  assert.equal(pneumo.dentro, 0, "Pneumologia e folha");
  assert.equal(pneumo.previa.length, 0, "folha nao desenha previa");
});

/**
 * ══ A ATENÇÃO NÃO PODE QUEBRAR O NÍVEL ════════════════════════════════════
 *
 * ⚠️ ESTES TRÊS EXISTEM POR UM DEFEITO PUBLICADO, relatado como "ao acessar CG
 * com prioridade tá bugando visualmente no mobile".
 *
 * A ordem por prioridade era aplicada ANTES de `dobrarCauda`, e isso violou
 * duas premissas que o módulo inteiro assume:
 *
 *   1. `dobrarCauda` para em `k > 1` e devolve `k = 1` SEM conferir o piso —
 *      correto só enquanto a primeira peça é a mais pesada. Com um tema de 2
 *      questões à frente, o nível saía com UMA célula de 1×348 px.
 *   2. `desde` é índice na lista do `indice` (peso decrescente), que é a que
 *      `filhosDoPasso` fatia. Contado noutra ordem, "+N temas" abria outro
 *      conjunto.
 */
const PALCO_MOVEL = { x: 0, y: 0, w: 358, h: 352 };
const OP_MOVEL = { ladoMinimo: { w: 72, h: 44 }, maxPecas: 20, vao: 4, previaMin: 40 };

/** Um nível de cauda longa, como Cirurgia Geral. */
function nivelDeCaudaLonga() {
  const contagens = [120, 95, 80, 64, 52, 41, 33, 27, 22, 18, 15, 12, 9, 7, 5, 4, 3, 2, 2, 1];
  const nos = contagens.map((n, i) => ({
    knowledge_node_id: "t" + i,
    node_name: "Tema " + i,
    question_count: n,
    parent_knowledge_node_id: "cg",
    node_type: "theme",
  }));
  nos.push({
    knowledge_node_id: "cg",
    node_name: "Cirurgia Geral",
    question_count: 600,
    parent_knowledge_node_id: null,
    node_type: "specialty",
  });
  const indice = construirIndice(nos);
  return { indice, filhos: indice.filhosDe.get("cg") ?? [] };
}

test("atenção não põe nenhuma célula abaixo do piso, nem promovendo tema leve", () => {
  const { indice, filhos } = nivelDeCaudaLonga();
  // O pior caso: os três mais urgentes são dos MENORES do nível.
  const ordem = new Map([["t17", 0], ["t18", 1], ["t15", 2]]);
  const pecas = disporNivel(indice, filhos, PALCO_MOVEL, { ...OP_MOVEL, ordemDeExibicao: ordem });
  const foraDoPiso = pecas.filter(
    (p) => p.caixa.w < OP_MOVEL.ladoMinimo.w || p.caixa.h < OP_MOVEL.ladoMinimo.h,
  );
  assert.deepEqual(
    foraDoPiso.map((p) => Math.round(p.caixa.w) + "x" + Math.round(p.caixa.h)),
    [],
  );
  assert.ok(pecas.length > 2, "o nível não pode colapsar para uma peça e a cauda");
});

test("com atenção, o `desde` da cauda continua fechando a conta", () => {
  const { indice, filhos } = nivelDeCaudaLonga();
  const ordem = new Map([["t17", 0], ["t18", 1], ["t15", 2]]);
  for (const op of [OP_MOVEL, { ...OP_MOVEL, ordemDeExibicao: ordem }]) {
    const cauda = disporNivel(indice, filhos, PALCO_MOVEL, op).find((p) => p.tipo === "cauda");
    assert.ok(cauda, "este nível tem de dobrar");
    // É esta a fatia que `filhosDoPasso` faz ao entrar na cauda.
    assert.equal(filhos.slice(cauda.desde).length, cauda.quantos);
  }
});

test("quando a ordem nova cabe, a atenção de fato reordena", () => {
  const { indice, filhos } = nivelDeCaudaLonga();
  // Urgência num tema PESADO: aí promover não custa legibilidade.
  const ordem = new Map([["t3", 0]]);
  const nomes = (op) =>
    disporNivel(indice, filhos, PALCO_MOVEL, op)
      .filter((p) => p.tipo === "no")
      .map((p) => p.no.node_name);
  const semAtencao = nomes(OP_MOVEL);
  const comAtencao = nomes({ ...OP_MOVEL, ordemDeExibicao: ordem });
  assert.equal(comAtencao[0], "Tema 3", "o urgente vem à frente");
  assert.deepEqual([...comAtencao].sort(), [...semAtencao].sort(), "e o conjunto não muda");
});

/**
 * ⚠️ A LISTA DA ATENÇÃO PROMETE LEVAR AO ITEM, e `caminhoAte` sozinho não cumpre.
 *
 * Ele para no pai para o alvo virar peça — mas um tema leve não é peça: está
 * dentro do "Mais N temas menores". E o defeito mordia exatamente a população
 * que a atenção serve, porque prioridade é urgência e não volume.
 */
test("caminhoQueMostra abre a cauda quando o alvo está dobrado", () => {
  const { indice, filhos } = nivelDeCaudaLonga();
  const pesado = filhos[2].knowledge_node_id;
  const leve = filhos[filhos.length - 2].knowledge_node_id;

  // O pesado é peça no nível do pai: o caminho simples basta.
  const doPesado = caminhoQueMostra(indice, pesado, PALCO_MOVEL, OP_MOVEL);
  assert.deepEqual(doPesado, caminhoAte(indice, pesado));

  // O leve não: o caminho ganha o passo da cauda que o contém.
  const doLeve = caminhoQueMostra(indice, leve, PALCO_MOVEL, OP_MOVEL);
  assert.equal(doLeve.length, caminhoAte(indice, leve).length + 1);
  const ultimo = doLeve[doLeve.length - 1];
  assert.equal(ultimo.tipo, "cauda");

  // E o nível que esse caminho abre CONTÉM o alvo — que é a promessa inteira.
  const nivel = filhosDoPasso(indice, doLeve);
  assert.ok(
    nivel.some((no) => no.knowledge_node_id === leve),
    "o alvo tem de estar no nível que o caminho abre",
  );
  assert.ok(
    // `pesoUniforme` como o componente faz ao entrar numa cauda: ali os itens
    // são, por construção, os menores e quase iguais.
    disporNivel(indice, nivel, PALCO_MOVEL, { ...OP_MOVEL, pesoUniforme: true }).some(
      (p) => p.tipo === "no" && p.no.knowledge_node_id === leve,
    ),
    "e tem de aparecer como peça, não dobrado de novo",
  );
});

test("sem palco medido, caminhoQueMostra devolve o caminho simples", () => {
  // Um passo de cauda com `desde` de outro tamanho de tela é pior que um degrau
  // a menos: abriria um conjunto que não corresponde a nada na tela.
  const { indice, filhos } = nivelDeCaudaLonga();
  const leve = filhos[filhos.length - 1].knowledge_node_id;
  const semPalco = { x: 0, y: 0, w: 0, h: 0 };
  assert.deepEqual(
    caminhoQueMostra(indice, leve, semPalco, OP_MOVEL),
    caminhoAte(indice, leve),
  );
});
