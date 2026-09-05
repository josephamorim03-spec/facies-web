import assert from "node:assert/strict";
import test from "node:test";

import {
  acertoPorSemana,
  faixaDeWilson,
  mosaicoDeDias,
  ondeMaisEscapa,
  projetarNota,
  ritmoPorExtenso,
} from "../../src/app/evolucao/_lib/leitura.ts";

test("a faixa de Wilson nunca escapa de 0 a 100", () => {
  // E' por isto que nao e' o erro normal: com p=1 e n pequeno, o intervalo
  // normal passaria de 1 e a tela publicaria "ate' 112%".
  const tudoCerto = faixaDeWilson(3, 3);
  assert.ok(tudoCerto.max <= 1, `max=${tudoCerto.max}`);
  assert.ok(tudoCerto.min > 0.2 && tudoCerto.min < 1);

  const tudoErrado = faixaDeWilson(0, 4);
  assert.ok(tudoErrado.min >= 0, `min=${tudoErrado.min}`);
  assert.ok(tudoErrado.max < 1);
});

test("a faixa APERTA conforme o aluno responde mais", () => {
  const poucas = faixaDeWilson(30, 50);
  const muitas = faixaDeWilson(300, 500);
  const largura = (f) => f.max - f.min;
  assert.ok(largura(muitas) < largura(poucas));
});

test("sem base nao ha faixa", () => {
  assert.equal(faixaDeWilson(0, 0), null);
  assert.equal(faixaDeWilson(1, -3), null);
});

const PESOS = [
  { area: "CM", pct: 30 },
  { area: "CG", pct: 20 },
  { area: "PD", pct: 20 },
  { area: "GO", pct: 20 },
  { area: "MP", pct: 10 },
];

test("a nota e' PONDERADA pelo peso da area na prova", () => {
  // 100% na area de 10% e 0% na de 30%: a media simples diria 50, e a prova
  // nao daria isso.
  const p = projetarNota(PESOS, [
    { area: "MP", acertos: 10, total: 10 },
    { area: "CM", acertos: 0, total: 10 },
  ]);
  // peso coberto = 40; ponderada = 10*1 + 30*0 = 10 -> 25%
  assert.equal(p.nota, 25);
  assert.equal(p.base, 20);
});

test("area sem resposta sai da conta, e nao entra como zero", () => {
  // Contar como zero afirmaria que o aluno erraria tudo ali -- "nao sei"
  // virando "voce e' pessimo nisto".
  const so_uma = projetarNota(PESOS, [{ area: "CM", acertos: 6, total: 10 }]);
  assert.equal(so_uma.nota, 60);
  const com_vazia = projetarNota(PESOS, [
    { area: "CM", acertos: 6, total: 10 },
    { area: "CG", acertos: 0, total: 0 },
  ]);
  assert.equal(com_vazia.nota, 60);
});

test("sem nenhuma resposta nao ha projecao", () => {
  assert.equal(projetarNota(PESOS, []), null);
  assert.equal(projetarNota(PESOS, [{ area: "CM", acertos: 0, total: 0 }]), null);
});

const ASSUNTOS = [
  { rotulo: "Insuficiencia cardiaca", n: 11 },
  { rotulo: "Pre-natal", n: 9 },
  { rotulo: "Abdome agudo", n: 8 },
];

test("ordena por QUESTOES PERDIDAS, nao por acerto", () => {
  // Abdome: erra muito (70%) mas a prova cobra 8 -> 5,6 perdidas.
  // Insuficiencia: erra menos (40%) e a prova cobra 11 -> 4,4 perdidas.
  // Por acerto, Abdome viria primeiro de qualquer jeito; o caso que separa e'
  // o assunto que se erra MUITO numa area que a prova quase nao cobra.
  const dominio = new Map([
    ["Insuficiencia cardiaca", { mastery: 0.6, attempts: 100 }],
    ["Pre-natal", { mastery: 0.9, attempts: 100 }],
    ["Abdome agudo", { mastery: 0.3, attempts: 100 }],
  ]);
  const fila = ondeMaisEscapa(ASSUNTOS, dominio);
  assert.deepEqual(fila.map((l) => l.assunto), [
    "Abdome agudo",
    "Insuficiencia cardiaca",
    "Pre-natal",
  ]);
  assert.equal(fila[0].perdidas, 5.6);
  assert.equal(fila[1].perdidas, 4.4);
});

test("assunto sem resposta NAO lidera a fila", () => {
  // Sem medida nao ha erro medido; supor erro maximo poria o assunto nunca
  // aberto no topo de "onde voce mais perde".
  const dominio = new Map([["Insuficiencia cardiaca", { mastery: 0.6, attempts: 10 }]]);
  const fila = ondeMaisEscapa(ASSUNTOS, dominio);
  assert.deepEqual(fila.map((l) => l.assunto), ["Insuficiencia cardiaca"]);
});

test("abaixo do piso o numero existe e a conclusao nao", () => {
  const dominio = new Map([["Pre-natal", { mastery: 0.5, attempts: 12 }]]);
  const [linha] = ondeMaisEscapa(ASSUNTOS, dominio);
  assert.equal(linha.abaixoDoPiso, true);
  assert.equal(linha.respostas, 12);

  const firme = new Map([["Pre-natal", { mastery: 0.5, attempts: 120 }]]);
  assert.equal(ondeMaisEscapa(ASSUNTOS, firme)[0].abaixoDoPiso, false);
});

test("semana sem questao aparece como buraco, e nao some", () => {
  // O desenho mostra os recuos de proposito; uma serie que esconde buraco vira
  // uma linha sempre subindo.
  const semanas = acertoPorSemana([
    { week_label: "s1", total: 10, accuracy_pct: 51 },
    { week_label: "s2", total: 0, accuracy_pct: null },
    { week_label: "s3", total: 20, accuracy_pct: 64 },
  ]);
  assert.equal(semanas.length, 3);
  assert.equal(semanas[1].acerto, null);
  assert.equal(semanas[2].acerto, 64);
});

test("o mosaico tem tres estados e nenhum e' vermelho", () => {
  const dias = mosaicoDeDias(
    [
      { bucket: "2026-09-01", observed_minutes: 45 },
      { bucket: "2026-09-02", observed_minutes: 12 },
      { bucket: "2026-09-03", observed_minutes: 0 },
      { bucket: "2026-09-04", observed_minutes: null },
    ],
    10,
    30,
  );
  assert.deepEqual(dias.map((d) => d.estado), ["cheio", "parcial", "vazio", "vazio"]);
});

test("o ritmo sai como minuto:segundo", () => {
  assert.equal(ritmoPorExtenso(1.8667), "1:52");
  assert.equal(ritmoPorExtenso(2), "2:00");
  assert.equal(ritmoPorExtenso(0), "—");
});
