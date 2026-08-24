import { test } from "node:test";
import assert from "node:assert/strict";

import { AREA_DO_ASSUNTO } from "../../src/lib/areaDoAssunto.ts";
import dados from "../../src/data/facies/facies.json" with { type: "json" };

/**
 * O mapa de área por assunto tem de cobrir o acervo INTEIRO.
 *
 * Sem esta checagem, um rótulo novo na regeneração da base não quebra nada: ele
 * simplesmente cai no fallback e a célula sai com a cor da marca em vez da cor
 * da área. Ninguém percebe, porque a tela continua bonita — e o mapa passa a
 * mentir sobre a área de uma parte das células.
 *
 * É a falha silenciosa que a base de código já pagou caro várias vezes: o que
 * não tem consumidor, ou o que degrada sem avisar, apodrece sem sinal.
 */
test("todo assunto do acervo tem grande área curada", () => {
  const faltando = new Map();
  for (const banca of dados.bancas) {
    for (const linha of banca.mais_cai?.linhas ?? []) {
      if (!AREA_DO_ASSUNTO[linha.rotulo]) {
        faltando.set(linha.rotulo, (faltando.get(linha.rotulo) ?? 0) + 1);
      }
    }
  }

  const relatorio = [...faltando.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([rotulo, n]) => `  [${n}x] ${rotulo}`)
    .join("\n");

  assert.equal(
    faltando.size,
    0,
    `${faltando.size} assunto(s) sem área em src/lib/areaDoAssunto.ts.\n` +
      `Sem isso o mapa da prova pinta a célula com a cor da marca em vez da ` +
      `cor da área, e ninguém percebe.\n${relatorio}`,
  );
});

/**
 * O contrário também importa: entrada que não corresponde a assunto nenhum é
 * peso morto que vai sendo copiado adiante, e esconde erro de digitação — um
 * rótulo escrito errado aqui fica para sempre sem nunca casar.
 */
test("não há assunto curado que o acervo não use", () => {
  const usados = new Set();
  for (const banca of dados.bancas) {
    for (const linha of banca.mais_cai?.linhas ?? []) usados.add(linha.rotulo);
  }

  const orfaos = Object.keys(AREA_DO_ASSUNTO).filter((r) => !usados.has(r));
  assert.deepEqual(
    orfaos,
    [],
    `Entradas em areaDoAssunto.ts que nenhum assunto do acervo usa — ` +
      `provável erro de digitação no rótulo:\n${orfaos.map((r) => `  ${r}`).join("\n")}`,
  );
});
