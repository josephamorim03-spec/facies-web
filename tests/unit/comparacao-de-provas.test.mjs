import assert from "node:assert/strict";
import test from "node:test";

import {
  LIMIAR_EM_PONTOS,
  calcularDeltas,
  formatarDelta,
  percentualQuePedeIncorreta,
  pesosDeArea,
} from "../../src/components/facies/comparacaoDeProvas.ts";

/** Uma banca mínima com o que a comparação lê, e nada mais. */
function banca({ nome, areas, incorreta = null, vinheta = 30 }) {
  return {
    institution_key: nome.toUpperCase(),
    nome,
    areas: {
      cobertura: 100,
      base: 1000,
      linhas: areas.map(([rotulo, pct]) => ({ rotulo, pct, n: Math.round(pct * 10) })),
    },
    formato: {
      alternativas: [],
      distribuicao:
        incorreta === null
          ? [{ codigo: "direta", rotulo: "direta", qtd: 900, pct: 100 }]
          : [
              { codigo: "direta", rotulo: "direta", qtd: 900, pct: 100 - incorreta },
              { codigo: "pede_incorreta", rotulo: "pede a incorreta", qtd: 100, pct: incorreta },
            ],
    },
    forma_recente: { vinheta_pct: vinheta },
  };
}

const IGUAIS = [
  ["Clínica Médica", 30],
  ["Cirurgia", 20],
  ["Pediatria", 20],
  ["Ginecologia", 15],
  ["Medicina Preventiva", 15],
];

test("o limiar é ESTRITO: 3 pontos exatos não viram linha, 3,1 vira", () => {
  const base = banca({ nome: "Base", areas: IGUAIS });

  const exatos = banca({
    nome: "Exatos",
    areas: [
      ["Clínica Médica", 33],
      ["Cirurgia", 17],
      ["Pediatria", 20],
      ["Ginecologia", 15],
      ["Medicina Preventiva", 15],
    ],
  });
  assert.deepEqual(
    calcularDeltas(base, exatos).map((d) => d.chave),
    [],
    "3,0 pontos é 'não passa de 3' — o artboard escolheu a leitura silenciosa",
  );

  // Os 3,1 saem de DUAS áreas, 1,55 de cada, para que só a Clínica cruze o
  // limiar. Tirar tudo de uma faria a doadora cruzar junto e o teste mediria
  // duas coisas achando que mede uma.
  const acima = banca({
    nome: "Acima",
    areas: [
      ["Clínica Médica", 33.1],
      ["Cirurgia", 18.45],
      ["Pediatria", 18.45],
      ["Ginecologia", 15],
      ["Medicina Preventiva", 15],
    ],
  });
  assert.deepEqual(calcularDeltas(base, acima).map((d) => d.chave), ["area-CM"]);
});

test("o sinal de menos é U+2212, não hífen — a coluna em mono depende disso", () => {
  assert.equal(formatarDelta(7), "+7");
  assert.equal(formatarDelta(-6), "−6");
  assert.notEqual(formatarDelta(-6), "-6");
  // Zero é positivo por convenção; ele nunca chega à tela (não passa do
  // limiar), mas um formatador que devolvesse "−0" seria um defeito à espera.
  assert.equal(formatarDelta(0), "+0");
});

test("no limiar o inteiro mentiria: 3,4 é '+3,4', nunca '+3'", () => {
  // `CompararProvas` imprime, logo abaixo da lista: "só aparece o que passa de
  // 3 pontos percentuais". Com o inteiro, um delta de 3,4 — que passa — era
  // desenhado como "+3", o número que a frase diz não existir. Medido no
  // `facies.json`: 2.628 dos 9.453 pares de bancas exibiam ao menos uma linha
  // assim antes desta correção.
  assert.equal(formatarDelta(3.4), "+3,4");
  assert.equal(formatarDelta(-3.4), "−3,4");
  assert.notEqual(formatarDelta(3.4), `+${LIMIAR_EM_PONTOS}`);

  // Fora do limiar o inteiro FICA: nenhum artboard escreve "+7,0", e a decimal
  // em toda linha estragaria a coluna que o U+2212 existe para alinhar.
  assert.equal(formatarDelta(4.4), "+4");
  assert.equal(formatarDelta(-7.2), "−7");
});

test("o que a tela nao consegue distinguir do limiar nao entra", () => {
  // A decimal resolveu o "+3", mas abriu uma fresta: 3,04 passa do limiar cru e
  // `toFixed(1)` o desenha como "3,0" — decimal na tela, "exatamente três" na
  // leitura, que é o que a legenda nega. Medido no dataset: SES PE × FMJ
  // Jundiaí produzia "−3,0" em medicina preventiva.
  //
  // Os 3,04 saem de DUAS áreas, 1,52 de cada, para que só a Clínica cruze.
  const base = banca({ nome: "Base", areas: IGUAIS });
  const naFresta = banca({
    nome: "NaFresta",
    areas: [
      ["Clínica Médica", 33.04],
      ["Cirurgia", 18.48],
      ["Pediatria", 18.48],
      ["Ginecologia", 15],
      ["Medicina Preventiva", 15],
    ],
  });
  assert.deepEqual(
    calcularDeltas(base, naFresta).map((d) => d.chave),
    [],
    "3,04 desenharia '3,0', que o leitor lê como o próprio limiar",
  );

  // E 3,06 continua entrando: ele desenha "3,1", que passa de 3 na tela.
  const acima = banca({
    nome: "Acima",
    areas: [
      ["Clínica Médica", 33.06],
      ["Cirurgia", 18.47],
      ["Pediatria", 18.47],
      ["Ginecologia", 15],
      ["Medicina Preventiva", 15],
    ],
  });
  const deltas = calcularDeltas(base, acima);
  assert.deepEqual(deltas.map((d) => d.chave), ["area-CM"]);
  assert.equal(formatarDelta(deltas[0].valor), "+3,1");
});

test("Obstetrícia entra em Ginecologia antes da conta", () => {
  const separada = banca({
    nome: "Separada",
    areas: [
      ["Clínica Médica", 30],
      ["Cirurgia", 20],
      ["Pediatria", 20],
      ["Ginecologia", 8],
      ["Obstetrícia", 7],
      ["Medicina Preventiva", 15],
    ],
  });
  const pesos = pesosDeArea(separada);
  assert.equal(pesos.get("GO"), 15, "8 + 7 numa GO só");
  assert.equal(pesos.get("OB"), undefined, "OB não sobrevive à fusão");

  // E a comparação contra uma prova com GO já unida não inventa diferença.
  const unida = banca({ nome: "Unida", areas: IGUAIS });
  assert.deepEqual(calcularDeltas(separada, unida).map((d) => d.chave), []);
});

test("área que só a segunda prova cobra aparece — a união, não a interseção", () => {
  const sem = banca({
    nome: "Sem",
    areas: [
      ["Clínica Médica", 40],
      ["Cirurgia", 30],
      ["Pediatria", 30],
    ],
  });
  const com = banca({
    nome: "Com",
    areas: [
      ["Clínica Médica", 40],
      ["Cirurgia", 30],
      ["Pediatria", 20],
      ["Medicina Preventiva", 10],
    ],
  });
  const chaves = calcularDeltas(sem, com).map((d) => d.chave);
  assert.ok(
    chaves.includes("area-MP"),
    "10 pontos de preventiva que a primeira prova não cobra é a diferença mais importante possível, e iterar só sobre as áreas da primeira a perderia",
  );
});

test("'Outras' nunca vira delta — descreve o acervo, não a banca", () => {
  const a = banca({
    nome: "A",
    areas: [
      ["Clínica Médica", 40],
      ["Cirurgia", 30],
      ["Outros", 30],
    ],
  });
  const b = banca({
    nome: "B",
    areas: [
      ["Clínica Médica", 40],
      ["Cirurgia", 30],
      ["Outros", 5],
      ["Pediatria", 25],
    ],
  });
  const chaves = calcularDeltas(a, b).map((d) => d.chave);
  assert.ok(!chaves.some((c) => c.endsWith("-OU")), "sem delta de Outras");
  assert.ok(chaves.includes("area-PD"));
});

test("pede_incorreta ausente é ZERO, e a diferença é medida contra o zero", () => {
  const sem = banca({ nome: "Sem", areas: IGUAIS, incorreta: null });
  assert.equal(percentualQuePedeIncorreta(sem), 0);

  const com = banca({ nome: "Com", areas: IGUAIS, incorreta: 19 });
  const deltas = calcularDeltas(sem, com);
  const incorreta = deltas.find((d) => d.chave === "forma-incorreta");
  assert.ok(incorreta, "19% contra ausente tem de virar linha");
  assert.equal(Math.round(incorreta.valor), 19);
});

test("o sinal é relativo à SEGUNDA prova, e a ordem é por magnitude", () => {
  const minha = banca({ nome: "Minha", areas: IGUAIS, incorreta: 5, vinheta: 30 });
  const outra = banca({
    nome: "Outra",
    areas: [
      ["Clínica Médica", 22],
      ["Cirurgia", 28],
      ["Pediatria", 20],
      ["Ginecologia", 15],
      ["Medicina Preventiva", 15],
    ],
    incorreta: 5,
    vinheta: 60,
  });

  const deltas = calcularDeltas(minha, outra);
  assert.deepEqual(
    deltas.map((d) => d.chave),
    ["forma-vinheta", "area-CM", "area-CG"],
    "30 pontos de vinheta antes de 8 de clínica antes de 8 de cirurgia",
  );
  assert.equal(deltas.find((d) => d.chave === "area-CG").valor, 8, "a outra cobra MAIS cirurgia");
  assert.equal(deltas.find((d) => d.chave === "area-CM").valor, -8, "e MENOS clínica");
  assert.match(deltas[0].frase, /na Outra/, "a frase nomeia a segunda prova");
  // A forma que NÃO se move fica de fora, mesmo estando na lista de medidas.
  assert.ok(!deltas.some((d) => d.chave === "forma-incorreta"));
});

test("o limiar exportado é o do desenho", () => {
  assert.equal(LIMIAR_EM_PONTOS, 3);
});
