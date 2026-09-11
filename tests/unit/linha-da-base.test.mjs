import assert from "node:assert/strict";
import test from "node:test";

import { linhaBase, notaDaClassificacao } from "../../src/components/facies/linhaDaBase.ts";

/**
 * AS DUAS FRASES DO CABEÇALHO DA PROVA.
 *
 * ⚠️ ESTE ARQUIVO EXISTE POR DOIS DEFEITOS PUBLICADOS, e não por gosto por
 * testes. Os dois eram aritmética, os dois passaram por revisão, e nenhum
 * quebrou build ou tipo:
 *
 *   1. A nota dividia por `questoes_total` (com anuladas) um numerador medido
 *      só sobre as válidas — denominador trocado em silêncio.
 *   2. A linha "Base" punha `questoes_total` (projeção de leitura) ao lado de
 *      uma afirmação de completude medida em `cobertas` (fonte). O ENARE saía
 *      "566 questões · cobertura completa das 6 edições medidas", com as duas
 *      pontas descrevendo populações diferentes.
 *
 * Os números abaixo são medidos no dataset de 2026-09-08, não inventados.
 */

/** Uma banca mínima; cada teste sobrescreve só o que lhe interessa. */
function banca(extra = {}) {
  return {
    questoes_total: 100,
    questoes_anuladas: 0,
    mais_cai: { base: 100 },
    denominador: null,
    ...extra,
  };
}

function den(extra = {}) {
  return {
    edicoes: 6,
    edicoes_declaradas: 6,
    edicoes_com_fonte: 6,
    declaradas: 600,
    cobertas: 600,
    estimado: false,
    fase_nao_coberta: null,
    ...extra,
  };
}

test("sem denominador a linha é só o total, nunca um número inventado", () => {
  assert.equal(linhaBase(banca({ questoes_total: 1436 })), "1.436 questões");
  assert.equal(
    linhaBase(banca({ questoes_total: 1436, denominador: den({ declaradas: null, cobertas: null }) })),
    "1.436 questões",
  );
});

test("todas as edições declaram e o total é menor — sai N de M", () => {
  // ⚠️ ESTE JÁ FOI O CASO DO ENARE, e deixou de ser em 2026-09-10.
  //
  // O 566 era `projeção de treino (530) + anuladas (36)`, e o gerador parou de
  // montar o total assim: hoje ele lê `question_source_dimensions` inteiro, e o
  // ENARE fecha 600 de 600 (o caso do teste seguinte). O cenário continua real
  // para banca cujo acervo NÃO fecha o que as edições declararam — que é o que
  // este ramo da função existe para dizer —, e por isso o teste fica; o que sai
  // é o nome do ENARE, que já não o exemplifica.
  assert.equal(
    linhaBase(banca({ questoes_total: 566, denominador: den() })),
    "566 de 600 questões declaradas nas 6 edições medidas",
  );
});

test("uma edição vinda da moda faz a soma inteira virar estimativa", () => {
  assert.equal(
    linhaBase(banca({ questoes_total: 566, denominador: den({ estimado: true }) })),
    "566 de 600 questões estimadas nas 6 edições medidas",
  );
});

test("todas declaram e o total bate: aí sim cobertura completa", () => {
  assert.equal(
    linhaBase(banca({ questoes_total: 600, denominador: den() })),
    "600 questões · cobertura completa das 6 edições medidas",
  );
});

test("a fase que não medimos é nomeada, e não engolida pelo 'completa'", () => {
  assert.equal(
    linhaBase(banca({ questoes_total: 600, denominador: den({ fase_nao_coberta: "dissertativa" }) })),
    "600 questões · fase objetiva completa; a dissertativa não entra nesta leitura",
  );
});

test("INVARIANTE: a fase fora da leitura é dita em QUALQUER ramo", () => {
  // Ela morava só no ramo de completude, que exige `cobertas === declaradas` —
  // e nenhuma das três bancas com fase cumpre isso. O aviso existia e nunca
  // chegou a uma tela. Aqui entram as três, medidas no dataset.
  const casos = [
    // Revalida: 13 edições, nenhuma declara.
    [banca({ questoes_total: 1139, denominador: den({ edicoes: 13, edicoes_declaradas: 0, declaradas: null, cobertas: null, fase_nao_coberta: "dissertativa" }) }),
      "1.139 questões · a dissertativa não entra nesta leitura"],
    // UNICAMP: todas as 12 declaram, e falta uma questão.
    [banca({ questoes_total: 940, denominador: den({ edicoes: 12, edicoes_declaradas: 12, declaradas: 960, cobertas: 959, estimado: true, fase_nao_coberta: "dissertativa" }) }),
      "940 de 960 questões estimadas nas 12 edições medidas · a dissertativa não entra nesta leitura"],
    // SUS-BA: todas as 6 declaram, e sobra.
    [banca({ questoes_total: 290, denominador: den({ edicoes: 6, edicoes_declaradas: 6, declaradas: 270, cobertas: 300, estimado: true, fase_nao_coberta: "dissertativa" }) }),
      "290 questões · 270 estimadas nas 6 edições medidas · a dissertativa não entra nesta leitura"],
  ];
  for (const [b, esperado] of casos) assert.equal(linhaBase(b), esperado);
});

test("sem fase declarada a frase não ganha cláusula", () => {
  const frase = linhaBase(banca({ questoes_total: 566, denominador: den() }));
  assert.ok(!frase.includes("não entra nesta leitura"), frase);
});

test("sobra é anomalia e continua visível, não some da tela", () => {
  assert.equal(
    linhaBase(banca({ questoes_total: 610, denominador: den() })),
    "610 questões · 600 declaradas nas 6 edições medidas",
  );
});

test("quando só parte das edições declara, a cláusula ganha sujeito próprio", () => {
  // SES-PE medida: 16 edições, 10 declaram, cobertas 995, declaradas 993.
  // `questoes_total` conta as 16 e por isso NÃO pode dividir a frase com 993 —
  // mas lidera, porque é a população que a nota do painel também usa.
  const pe = banca({
    questoes_total: 1436,
    denominador: den({ edicoes: 16, edicoes_declaradas: 10, edicoes_com_fonte: 0, declaradas: 993, cobertas: 995, estimado: true }),
  });
  assert.equal(linhaBase(pe), "1.436 questões · as 10 edições medidas somam 993 estimadas, e a base tem 995");
});

test("parcial com a base fechada não repete o número", () => {
  const b = banca({
    questoes_total: 1800,
    denominador: den({ edicoes: 20, edicoes_declaradas: 5, edicoes_com_fonte: 5, declaradas: 500, cobertas: 500 }),
  });
  assert.equal(linhaBase(b), "1.800 questões · as 5 edições medidas somam 500 declaradas, e a base tem todas");
  assert.ok(!linhaBase(b).includes("cobertura completa"), "completude parcial não pode virar completude da banca");
});

test("INVARIANTE: a linha sempre começa pelo total da banca", () => {
  // É o que a mantém coerente com `notaDaClassificacao`, que divide pelas
  // válidas do MESMO total. Liderar por `cobertas` fazia as duas linhas do
  // mesmo cabeçalho publicarem populações diferentes.
  for (const total of [0, 90, 566, 1436, 1800]) {
    for (const d of [
      null,
      den(),
      den({ estimado: true }),
      den({ edicoes: 16, edicoes_declaradas: 10, declaradas: 993, cobertas: 995 }),
      den({ edicoes: 20, edicoes_declaradas: 5, declaradas: 500, cobertas: 500 }),
      den({ fase_nao_coberta: "dissertativa" }),
    ]) {
      const frase = linhaBase(banca({ questoes_total: total, denominador: d }));
      assert.ok(
        frase.startsWith(total.toLocaleString("pt-BR") + " "),
        "não começa pelo total (" + total + "): " + frase,
      );
    }
  }
});

test("singular não vira 'nas 1 edições'", () => {
  const uma = den({ edicoes: 1, edicoes_declaradas: 1, edicoes_com_fonte: 1, declaradas: 100, cobertas: 100 });
  assert.equal(linhaBase(banca({ questoes_total: 90, denominador: uma })), "90 de 100 questões declaradas na edição medida");
  assert.equal(linhaBase(banca({ questoes_total: 100, denominador: uma })), "100 questões · cobertura completa da edição medida");
});

test("INVARIANTE: 'cobertura completa' nunca ao lado de um total menor que o declarado", () => {
  // Era exatamente o defeito 2, e ele valia para 49 bancas do dataset.
  const falhas = [];
  for (const total of [0, 1, 67, 530, 566, 599, 600, 601, 1200]) {
    for (const edicoesDeclaradas of [1, 3, 6]) {
      const d = den({ edicoes: edicoesDeclaradas, edicoes_declaradas: edicoesDeclaradas });
      const frase = linhaBase(banca({ questoes_total: total, denominador: d }));
      if (frase.includes("completa") && total !== d.declaradas) {
        falhas.push(String(total) + " -> " + frase);
      }
    }
  }
  assert.deepEqual(falhas, []);
});

test("a nota divide pelas VÁLIDAS, e diz onde foram as anuladas", () => {
  // USP-SP no dataset vivo: total 1.082, anuladas 22, base 1.052. O denominador
  // é 1.060 (as válidas), e não 1.082 — foi essa troca que a página publicou.
  assert.equal(
    notaDaClassificacao(banca({ questoes_total: 1082, questoes_anuladas: 22, mais_cai: { base: 1052 } })),
    "1.052 de 1.060 questões nesta leitura · 22 anuladas ficam fora desta conta",
  );
});

test("INVARIANTE: o denominador da nota nunca é o total com anuladas", () => {
  // A forma do defeito: numerador medido só nas válidas, denominador com as
  // anuladas dentro. Vale para qualquer banca, não só a que reportou o erro.
  for (const [total, anuladas, base] of [
    [1082, 22, 1052],
    [1436, 46, 1390],
    [600, 36, 529],
    [100, 0, 90],
  ]) {
    const frase = notaDaClassificacao(banca({ questoes_total: total, questoes_anuladas: anuladas, mais_cai: { base } }));
    assert.ok(
      frase.includes("de " + (total - anuladas).toLocaleString("pt-BR") + " questões"),
      "denominador errado em " + frase,
    );
    if (anuladas > 0) {
      assert.ok(!frase.includes("de " + total.toLocaleString("pt-BR") + " questões"), "vazou o total em " + frase);
    }
  }
});

test("sem anuladas a nota não ganha cláusula vazia", () => {
  assert.equal(
    notaDaClassificacao(banca({ questoes_total: 100, questoes_anuladas: 0, mais_cai: { base: 90 } })),
    "90 de 100 questões nesta leitura",
  );
});

test("a nota NÃO diz 'classificadas' — as que faltam estão classificadas", () => {
  // O defeito que esta assertiva impede nasceu em 2026-09-10, quando
  // `questoes_total` passou a ser o total da PROVA. Com o denominador novo,
  // "529 de 564 questões classificadas" afirmaria que 35 questões estão por
  // classificar — e medido em produção no ENARE, 600 de 600 têm especialidade e
  // subtema. Elas saíram do acervo servível, que é outra coisa.
  const frase = notaDaClassificacao(
    banca({
      questoes_total: 600,
      questoes_anuladas: 36,
      questoes_fora_da_leitura: 34,
      mais_cai: { base: 529 },
    }),
  );
  assert.ok(!frase.includes("classificadas"), "a nota voltou a afirmar classificação: " + frase);
});

test("a diferença que sobra é NOMEADA, não descontada em silêncio", () => {
  assert.equal(
    notaDaClassificacao(
      banca({
        questoes_total: 600,
        questoes_anuladas: 36,
        questoes_fora_da_leitura: 34,
        mais_cai: { base: 529 },
      }),
    ),
    "529 de 564 questões nesta leitura · 36 anuladas ficam fora desta conta · 34 saíram do acervo por duplicata ou atualização",
  );
});

test("dataset antigo (sem o campo novo) não ganha cláusula fantasma", () => {
  // `questoes_fora_da_leitura` é opcional: o dataset em produção pode ser
  // anterior à mudança, e ausência não pode virar "0 saíram", nem quebrar.
  const frase = notaDaClassificacao(
    banca({ questoes_total: 100, questoes_anuladas: 0, mais_cai: { base: 90 } }),
  );
  assert.ok(!frase.includes("saíram"), frase);
});
